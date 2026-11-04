import { replay } from "../core/machine.ts"
import { solution } from "../core/progress.ts"
import type { Question, Scenario, Step } from "../core/scenario.ts"
import { grade3Box } from "./grade3-box.ts"
import { grade8Case } from "./grade8-case.ts"

/** Slot id → part id, as a scenario's own solution leaves the computer. */
const builtBy = (scenario: Scenario): Readonly<Record<string, string>> =>
  Object.fromEntries(Object.entries(replay(scenario, solution(scenario)).placed).map(([slot, p]) => [slot, p.part]))

const GOALS = { A: "пошук несправності" } as const

/** A fault: what is wrong in the built computer, what the student sees, and how it is fixed. */
interface Fault {
  readonly id: string
  readonly title: string
  readonly story: ReadonlyArray<string>
  /** What the student sees after pressing power: the step's explanation for the diagnosis. */
  readonly symptom: string
  readonly diagnosis: Question
  /** The repair: plug a part into a slot. */
  readonly fix: { readonly part: string; readonly slot: string; readonly title: string; readonly explain: string }
  /** Slot id → part id where the fault differs from a working computer; an empty string leaves the slot empty. */
  readonly change: Readonly<Record<string, string>>
}

/**
 * A troubleshooting exercise on a built computer with one fault: switch it on and see the symptom,
 * answer what to check and switch it off, fix it, switch it on again. Cables are fixed with the power off.
 */
const faultScenario = (base: Scenario, grade: number, fault: Fault, controls: Readonly<Record<string, string>>): Scenario => {
  const steps: Step[] = [
    {
      id: "on",
      kind: "set",
      title: "Увімкни комп'ютер",
      explain: "Натисни кнопку живлення і подивись, що буде.",
      control: "power",
      value: "on"
    },
    {
      id: "check",
      kind: "set",
      title: "Знайди причину",
      goal: "A",
      look: "result",
      explain: `${fault.symptom} Перед ремонтом вимкни живлення: кабелі під'єднують лише на вимкненому комп'ютері.`,
      question: fault.diagnosis,
      control: "power",
      value: "off"
    },
    { id: "fix", kind: "place", title: fault.fix.title, explain: fault.fix.explain, targets: { [fault.fix.part]: [fault.fix.slot] } },
    {
      id: "again",
      kind: "set",
      title: "Перевір роботу",
      explain: "Увімкни комп'ютер ще раз. Якщо причину знайдено правильно, на екрані з'явиться робочий стіл.",
      control: "power",
      value: "on"
    }
  ]
  return {
    id: fault.id,
    grade,
    title: fault.title,
    goals: GOALS,
    story: fault.story,
    parts: base.parts,
    slots: base.slots,
    controls: base.controls,
    start: { placed: withFault(base, fault.change), controls },
    steps
  }
}

/** The built computer with some slots changed: a part moved elsewhere, or a slot left empty (""). */
const withFault = (base: Scenario, change: Readonly<Record<string, string>>): Readonly<Record<string, string>> => {
  const placed: Record<string, string> = { ...builtBy(base) }
  for (const [slot, part] of Object.entries(change)) {
    for (const [s, p] of Object.entries(placed)) if (p === part) delete placed[s]
    if (part === "") delete placed[slot]
    else placed[slot] = part
  }
  return placed
}

const GRADE8_STORY = "Комп'ютер гуртка хтось розбирав і зібрав знову. Щось пішло не так: знайди й виправ."

export const grade8FaultCpuPower = faultScenario(
  grade8Case,
  8,
  {
    id: "grade8-fault-cpu-power",
    title: "Несправність: темний екран",
    story: [GRADE8_STORY],
    symptom: "Вентилятори крутяться, але на екрані нічого немає.",
    diagnosis: {
      text: "Вентилятори крутяться, а зображення немає. Що перевірити першим?",
      right: "Чи під'єднано живлення процесора (CPU)",
      wrong: ["Чи не зламався монітор", "Чи вистачає місця на диску"]
    },
    fix: {
      part: "eps",
      slot: "cpuPowerPort",
      title: "Під'єднай живлення процесора",
      explain: "Без окремого живлення процесор не запускається, хоча вентилятори вже крутяться. Роз'єм CPU у верхньому куті плати."
    },
    change: { cpuPowerPort: "" }
  },
  { power: "off" }
)

export const grade8FaultHdmi = faultScenario(
  grade8Case,
  8,
  {
    id: "grade8-fault-hdmi",
    title: "Несправність: немає картинки",
    story: [GRADE8_STORY],
    symptom: "Комп'ютер працює, монітор увімкнений, а картинки немає. Подивись, куди під'єднано кабель монітора.",
    diagnosis: {
      text: "Монітор під'єднано до гнізда HDMI на платі, а у комп'ютері стоїть відеокарта. Чому немає картинки?",
      right: "Зображення створює відеокарта, тож монітор треба під'єднати до неї",
      wrong: ["Кабель HDMI зламався", "Монітору бракує живлення"]
    },
    fix: {
      part: "monitor",
      slot: "gpuHdmi",
      title: "Під'єднай монітор до відеокарти",
      explain: "Візьми кабель монітора з гнізда на платі й під'єднай до гнізда HDMI на відеокарті, нижче."
    },
    change: { boardHdmi: "monitor" }
  },
  { power: "off" }
)

export const grade8FaultDisk = faultScenario(
  grade8Case,
  8,
  {
    id: "grade8-fault-disk",
    title: "Несправність: зник диск",
    story: [GRADE8_STORY, "Мирослава шукає свої відео на диску D:, а його немає."],
    symptom: "Комп'ютер запускається, але пише, що диска D: (HDD) немає.",
    diagnosis: {
      text: "Комп'ютер працює, а жорсткого диска не бачить. Що перевірити?",
      right: "Кабель даних SATA від диска до плати",
      wrong: ["Кабель монітора", "Кулер процесора"]
    },
    fix: {
      part: "sataData",
      slot: "sataPort",
      title: "Під'єднай кабель даних диска",
      explain: "Живлення диск отримує, але без кабелю даних плата його не бачить. Під'єднай червоний кабель SATA до роз'єму на платі."
    },
    change: { sataPort: "" }
  },
  { power: "off" }
)

/** The grade 3–4 computer also has a power strip; it is on unless the fault is the strip. */
const grade3Base: Scenario = {
  ...grade3Box,
  controls: [...grade3Box.controls, { id: "strip", label: "Вимикач подовжувача", values: ["off", "on"] }]
}
const GRADE3_STORY = "Комп'ютер у класі перестав працювати. Ти — майстер: знайди, що сталося."

export const grade3FaultMonitor = faultScenario(
  grade3Base,
  3,
  {
    id: "grade3-fault-monitor",
    title: "Несправність: темний монітор",
    story: [GRADE3_STORY],
    symptom: "Системний блок гуде, монітор увімкнений, а картинки немає.",
    diagnosis: {
      text: "Системний блок працює, монітор увімкнений, а картинки немає. Що перевірити?",
      right: "Чи підключено кабель монітора",
      wrong: ["Чи підключено мишу", "Чи є папір у принтері"]
    },
    fix: {
      part: "monitorCable",
      slot: "hdmi",
      title: "Підключи кабель монітора",
      explain: "Кабель монітора випав. Встав його в широке гніздо HDMI ззаду на системному блоці."
    },
    change: { hdmi: "" }
  },
  { power: "off", monitorPower: "on", strip: "on" }
)

/** The power strip is switched off: pressing power does nothing at all. Nothing to plug, only a switch. */
export const grade3FaultStrip: Scenario = {
  id: "grade3-fault-strip",
  grade: 3,
  title: "Несправність: нічого не вмикається",
  goals: GOALS,
  story: [GRADE3_STORY],
  parts: grade3Base.parts,
  slots: grade3Base.slots,
  controls: grade3Base.controls,
  start: { placed: withFault(grade3Base, {}), controls: { power: "off", monitorPower: "on", strip: "off" } },
  steps: [
    {
      id: "on",
      kind: "set",
      title: "Увімкни комп'ютер",
      explain: "Натисни кнопку живлення на системному блоці і подивись, що буде.",
      control: "power",
      value: "on"
    },
    {
      id: "strip",
      kind: "set",
      title: "Знайди причину",
      goal: "A",
      look: "result",
      explain: "Нічого не сталося: ні звуку, ні світла. Комп'ютер отримує живлення від розетки через подовжувач на столі.",
      question: {
        text: "Натискаєш кнопку, а нічого не відбувається. Що перевірити?",
        right: "Чи увімкнено подовжувач",
        wrong: ["Чи підключено мишу", "Чи є картинка на моніторі"]
      },
      control: "strip",
      value: "on"
    }
  ]
}

export const faultScenarios: ReadonlyArray<Scenario> = [
  grade8FaultCpuPower,
  grade8FaultHdmi,
  grade8FaultDisk,
  grade3FaultMonitor,
  grade3FaultStrip
]
