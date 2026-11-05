import { describe, expect, test } from "vitest"
import { apply, isDone, replay, startState } from "../core/machine.ts"
import { hintFor, report, solution } from "../core/progress.ts"
import { validateScenario } from "../core/validate.ts"
import { montageMinutes } from "../core/upgrade.ts"
import { grade3FaultStrip, grade8FaultHdmi } from "./faults.ts"
import { grade3Box, grade8Case, grade8Club, grade8Lab, scenarios } from "./index.ts"

describe.each(Object.values(scenarios))("scenario $id", (scenario) => {
  test("has no authoring errors", () => {
    expect(validateScenario(scenario)).toEqual([])
  })

  test("its solution finishes it without mistakes, and every action is accepted", () => {
    let state = startState(scenario)
    for (const action of solution(scenario)) {
      const outcome = apply(scenario, state, action)
      expect(outcome.result, JSON.stringify(action)).toBe("ok")
      state = outcome.state
    }
    expect(isDone(scenario, state)).toBe(true)
    expect(state.mistakes).toBe(0)
  })

  test("every question has its right answer and at least one wrong one", () => {
    for (const step of scenario.steps) {
      if (step.question) expect(step.question.wrong.length).toBeGreaterThan(0)
    }
  })
})

describe("grade 8 club", () => {
  test("RAM in A1 is a mistake with the dual-channel explanation", () => {
    const actions = solution(grade8Club)
    const ramAt = actions.findIndex((a) => a.type === "place" && a.part === "ram1")
    const before = replay(grade8Club, actions.slice(0, ramAt))
    const outcome = apply(grade8Club, before, { type: "place", part: "ram1", slot: "dimmA1", turn: 0 })
    expect(outcome.result).toBe("mistake")
    if (outcome.result === "mistake") expect(outcome.message).toContain("A2 і B2")
  })

  test("the cooler cable on SYS_FAN is a mistake", () => {
    const actions = solution(grade8Club)
    const fanAt = actions.findIndex((a) => a.type === "place" && a.part === "coolerCable")
    const before = replay(grade8Club, actions.slice(0, fanAt))
    expect(apply(grade8Club, before, { type: "place", part: "coolerCable", slot: "sysFan", turn: 0 }).result).toBe(
      "mistake"
    )
  })

  test("the hint on the RAM step points to the two right slots", () => {
    const actions = solution(grade8Club)
    const ramAt = actions.findIndex((a) => a.type === "place" && a.part === "ram1")
    const hint = hintFor(grade8Club, replay(grade8Club, actions.slice(0, ramAt)))
    expect(hint.parts).toEqual(["ram1", "ram2"])
    expect(hint.slots).toEqual(["dimmA2", "dimmB2"])
  })

  test("the report counts mistakes by lesson goal", () => {
    const actions = solution(grade8Club)
    const cpuQuestion = actions.findIndex((a) => a.type === "answer")
    const before = replay(grade8Club, actions.slice(0, cpuQuestion))
    const wrong = apply(grade8Club, before, { type: "answer", answer: "Показує зображення на екрані" }).state
    const finished = replay(grade8Club, actions.slice(cpuQuestion), wrong)
    const result = report(grade8Club, finished)
    expect(result.done).toBe(true)
    expect(result.mistakes).toBe(1)
    expect(result.byGoal).toEqual({ B: 1, C: 0 })
    expect(result.steps.find((s) => s.id === "cpu")?.mistakes).toBe(1)
  })
})

describe("validateScenario", () => {
  test("finds a missing slot, a wrong kind and an unknown control", () => {
    const broken = {
      ...grade8Club,
      steps: [
        { id: "a", kind: "place" as const, title: "", explain: "", targets: { cpu: ["nowhere", "m2Slot"] }, requires: { fan: "on" } }
      ]
    }
    expect(validateScenario(broken)).toEqual([
      "Крок «a»: немає перемикача «fan»",
      "Крок «a»: немає місця «nowhere»",
      "Крок «a»: «cpu» (cpu) не вставляється в «m2Slot»"
    ])
  })
})

describe("grade 8 case", () => {
  const before = (part: string) => {
    const actions = solution(grade8Case)
    const at = actions.findIndex((a) => a.type === "place" && a.part === part)
    return replay(grade8Case, actions.slice(0, at))
  }

  test("the graphics card's power cable in the CPU socket is a mistake that tells the two apart", () => {
    const outcome = apply(grade8Case, before("atx"), { type: "place", part: "pcie", slot: "cpuPowerPort", turn: 0 })
    expect(outcome.result).toBe("mistake")
    if (outcome.result === "mistake") expect(outcome.message).toContain("CPU — біля процесора")
  })

  test("a cable's second end goes in only after its first end", () => {
    const early = apply(grade8Case, before("atx"), { type: "place", part: "pcieEnd", slot: "psuPcie1", turn: 0 })
    expect(early.result).toBe("ignored")
    const first = apply(grade8Case, before("atx"), { type: "place", part: "pcie", slot: "gpuPowerPort", turn: 0 }).state
    expect(apply(grade8Case, first, { type: "place", part: "pcieEnd", slot: "psuPcie2", turn: 0 }).result).toBe("ok")
  })

  test("the PCIe end in a SATA socket of the power supply is a mistake", () => {
    const first = apply(grade8Case, before("atx"), { type: "place", part: "pcie", slot: "gpuPowerPort", turn: 0 }).state
    expect(apply(grade8Case, first, { type: "place", part: "pcieEnd", slot: "psuSata1", turn: 0 }).result).toBe("mistake")
  })

  test("the computer is switched on at the power supply before its button", () => {
    const steps = grade8Case.steps.map((s) => s.id)
    expect(steps.indexOf("psuSwitch")).toBe(steps.indexOf("power") - 1)
    expect(steps).toContain("front")
  })

  test("the monitor on the board's HDMI is a mistake once a graphics card is in", () => {
    const outcome = apply(grade8Case, before("monitor"), { type: "place", part: "monitor", slot: "boardHdmi", turn: 0 })
    expect(outcome.result).toBe("mistake")
    if (outcome.result === "mistake") expect(outcome.message).toContain("відеокарті")
  })

  test("the graphics card in the short PCIe x1 slot is a mistake", () => {
    expect(apply(grade8Case, before("gpu"), { type: "place", part: "gpu", slot: "pcieX1", turn: 0 }).result).toBe("mistake")
  })

  test("the power supply turned round is a mistake", () => {
    const outcome = apply(grade8Case, before("psu"), { type: "place", part: "psu", slot: "psuBay", turn: 2 })
    expect(outcome.result).toBe("mistake")
    if (outcome.result === "mistake") expect(outcome.message).toContain("задній стінці")
  })

  test("the keyboard fits any USB socket", () => {
    for (const slot of ["usb1", "usb2", "usb3", "usb4"]) {
      expect(apply(grade8Case, before("keyboard"), { type: "place", part: "keyboard", slot, turn: 1 }).result).toBe("ok")
    }
  })
})

describe("grade 3 new box", () => {
  const actions = solution(grade3Box)
  const before = (match: (a: (typeof actions)[number]) => boolean) => replay(grade3Box, actions.slice(0, actions.findIndex(match)))

  test("the printer in the input basket is a mistake that asks what the device does", () => {
    const outcome = apply(grade3Box, before((a) => a.type === "place" && a.part === "keyboard"), {
      type: "place",
      part: "printer",
      slot: "in1",
      turn: 0
    })
    expect(outcome.result).toBe("mistake")
    if (outcome.result === "mistake") expect(outcome.message).toContain("що робить цей пристрій")
  })

  test("the monitor goes from its basket to the desk", () => {
    const state = before((a) => a.type === "place" && a.slot === "deskMonitor")
    expect(state.placed.out1?.part).toBe("monitor")
    const moved = apply(grade3Box, state, { type: "place", part: "monitor", slot: "deskMonitor", turn: 0 }).state
    expect(moved.placed.deskMonitor?.part).toBe("monitor")
    expect(moved.placed.out1).toBeUndefined()
  })

  test("the monitor cable does not fit a USB socket", () => {
    const outcome = apply(grade3Box, before((a) => a.type === "place" && a.part === "monitorCable"), {
      type: "place",
      part: "monitorCable",
      slot: "usb1",
      turn: 0
    })
    expect(outcome.result).toBe("mistake")
    if (outcome.result === "mistake") expect(outcome.reason).toBe("wrongKind")
  })

  test("pressing the monitor's button first explains that the system unit thinks", () => {
    const outcome = apply(grade3Box, before((a) => a.type === "set" && a.control === "power"), {
      type: "set",
      control: "monitorPower",
      value: "on"
    })
    expect(outcome.result).toBe("mistake")
    if (outcome.result === "mistake") expect(outcome.message).toContain("думає системний блок")
    expect(outcome.state.controls.monitorPower).toBe("off")
  })

  test("ends with the question about a computer for the dacha", () => {
    const last = grade3Box.steps.at(-1)
    expect(last?.question?.right).toBe("Ноутбук")
    expect(actions.at(-1)).toEqual({ type: "answer", answer: "Ноутбук" })
  })
})

describe("grade 8 lab", () => {
  const actions = solution(grade8Lab)
  const at = (match: (a: (typeof actions)[number]) => boolean) => replay(grade8Lab, actions.slice(0, actions.findIndex(match)))

  test("starts with the whole computer built and switched on", () => {
    const start = startState(grade8Lab)
    expect(Object.keys(start.placed)).toHaveLength(20)
    expect(start.controls.power).toBe("on")
  })

  test("the photo cannot jump from USB straight to the processor", () => {
    const state = apply(grade8Lab, startState(grade8Lab), { type: "pick", stop: "usb" }).state
    const outcome = apply(grade8Lab, state, { type: "pick", stop: "cpu" })
    expect(outcome.result).toBe("mistake")
    if (outcome.result === "mistake") expect(outcome.message).toContain("оперативну пам'ять")
    expect(outcome.state.picked).toEqual(["usb"])
  })

  test("a faster two-core processor is not enough: speed is not only the frequency", () => {
    const outcome = apply(grade8Lab, at((a) => a.type === "upgrade"), { type: "upgrade", choose: ["cpu2", "ram16"] })
    expect(outcome.result).toBe("mistake")
    if (outcome.result === "mistake") expect(outcome.message).toContain("не лише частота")
  })

  test("six cores and an SSD fit the budget and the time", () => {
    const outcome = apply(grade8Lab, at((a) => a.type === "upgrade"), { type: "upgrade", choose: ["cpu6", "ssd"] })
    expect(outcome.result).toBe("ok")
  })

  test("three cards are over the budget", () => {
    const outcome = apply(grade8Lab, at((a) => a.type === "upgrade"), { type: "upgrade", choose: ["cpu6", "ssd", "ram16"] })
    expect(outcome.result).toBe("mistake")
    if (outcome.result === "mistake") expect(outcome.reason).toBe("overBudget")
  })

  test("unsaved text is lost at power off, a saved video is kept", () => {
    const state = at((a) => a.type === "sort")
    expect(apply(grade8Lab, state, { type: "sort", item: "text", memory: "persistent" }).result).toBe("mistake")
    expect(apply(grade8Lab, state, { type: "sort", item: "video", memory: "persistent" }).result).toBe("ok")
  })
})

describe("montageMinutes", () => {
  const base = { cores: 2, ghz: 2.8, cacheMb: 3, ramGb: 4, disk: "hdd" as const }

  test("more cores at the same frequency are faster", () => {
    expect(montageMinutes({ ...base, cores: 6 })).toBeLessThan(montageMinutes(base))
  })

  test("too little RAM and a hard disk slow the work down", () => {
    expect(montageMinutes({ ...base, ramGb: 16 })).toBeLessThan(montageMinutes(base))
    expect(montageMinutes({ ...base, disk: "ssd" })).toBeLessThan(montageMinutes(base))
  })
})

describe("faults", () => {
  test("the monitor on the board's HDMI is moved to the graphics card with the power off", () => {
    const start = startState(grade8FaultHdmi)
    expect(start.placed.boardHdmi?.part).toBe("monitor")
    expect(start.placed.gpuHdmi).toBeUndefined()
    const finished = replay(grade8FaultHdmi, solution(grade8FaultHdmi))
    expect(finished.placed.gpuHdmi?.part).toBe("monitor")
    expect(finished.placed.boardHdmi).toBeUndefined()
    expect(finished.controls.power).toBe("on")
  })

  test("a cable cannot be fixed before the diagnosis and the power off", () => {
    const on = apply(grade8FaultHdmi, startState(grade8FaultHdmi), { type: "set", control: "power", value: "on" }).state
    expect(apply(grade8FaultHdmi, on, { type: "place", part: "monitor", slot: "gpuHdmi", turn: 0 }).result).toBe("question")
  })

  test("the switched-off power strip is the fault, and switching it on finishes the exercise", () => {
    const state = replay(grade3FaultStrip, solution(grade3FaultStrip))
    expect(state.controls).toMatchObject({ power: "on", strip: "on" })
    expect(isDone(grade3FaultStrip, state)).toBe(true)
  })
})
