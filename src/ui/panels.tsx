import { useMemo, useState } from "react"
import type { BuildState } from "../core/machine.ts"
import type { MemoryKind, Part } from "../core/parts.ts"
import type { Report } from "../core/progress.ts"
import type { Question, Scenario, SortStep, Step, UpgradeStep } from "../core/scenario.ts"
import { formatMinutes, montageMinutes, upgraded } from "../core/upgrade.ts"
import type { Held, Toast } from "./useBuild.ts"

/** The steps down the side: done, current, still ahead, with mistakes per step. */
export const StepList = ({ scenario, state }: { scenario: Scenario; state: BuildState }) => (
  <ol className="edu-pc-steps" aria-label="Кроки">
    {scenario.steps.map((step, i) => {
      const mistakes = state.stepMistakes[step.id] ?? 0
      const status = i < state.step ? "done" : i === state.step ? "current" : "ahead"
      return (
        <li key={step.id} className={`edu-pc-step is-${status}`} aria-current={status === "current" ? "step" : undefined}>
          <span className="edu-pc-step-mark" aria-hidden="true">
            {status === "done" ? "✓" : i + 1}
          </span>
          <span className="edu-pc-step-title">{step.title}</span>
          {mistakes > 0 && (
            <span className="edu-pc-step-mistakes" title="Помилки на цьому кроці">
              {mistakes}
            </span>
          )}
        </li>
      )
    })}
  </ol>
)

export const StepCard = ({ step, index, total }: { step: Step; index: number; total: number }) => (
  <section className="edu-pc-card" aria-live="polite">
    <p className="edu-pc-card-count">
      Крок {index + 1} з {total}
    </p>
    <h2 className="edu-pc-card-title">{step.title}</h2>
    <p className="edu-pc-card-text">{step.explain}</p>
  </section>
)

/** Order the answers the same way every time for a step, but not always with the right one first. */
const ordered = (stepId: string, q: Question): ReadonlyArray<string> => {
  const all = [q.right, ...q.wrong]
  let seed = [...stepId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
  const out = [...all]
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) >>> 0
    const j = seed % (i + 1)
    const a = out[i]
    const b = out[j]
    if (a !== undefined && b !== undefined) [out[i], out[j]] = [b, a]
  }
  return out
}

export const QuestionCard = ({
  step,
  question,
  onAnswer
}: {
  step: Step
  question: Question
  onAnswer: (answer: string) => void
}) => {
  const answers = useMemo(() => ordered(step.id, question), [step.id, question])
  return (
    <div className="edu-pc-overlay" role="dialog" aria-modal="true" aria-labelledby="edu-pc-q">
      <div className="edu-pc-question">
        <p className="edu-pc-card-count">Спершу дай відповідь</p>
        <h2 id="edu-pc-q">{question.text}</h2>
        <div className="edu-pc-answers">
          {answers.map((a) => (
            <button key={a} type="button" className="edu-pc-answer" onClick={() => onAnswer(a)}>
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** The parts not yet installed. On an «inspect» step a click reads about the part; otherwise it takes it. */
export const Tray = ({
  parts,
  held,
  highlighted,
  benchPart,
  icons,
  onPick
}: {
  parts: ReadonlyArray<Part>
  held: Held | null
  highlighted: ReadonlyArray<string>
  /** The part that is the bench itself (the board, the case): it stays on the desk. */
  benchPart: string | undefined
  /** Pictures rendered from the 3D models; until they are ready, simple drawn icons stand in. */
  icons: Partial<Record<string, string>>
  onPick: (part: Part) => void
}) => (
  <div className="edu-pc-tray" role="toolbar" aria-label="Деталі">
    {parts.map((part) => {
      const classes = ["edu-pc-part"]
      if (held?.part === part.id) classes.push("is-held")
      if (highlighted.includes(part.id)) classes.push("is-hint")
      return (
        <button key={part.id} type="button" className={classes.join(" ")} aria-pressed={held?.part === part.id} onClick={() => onPick(part)}>
          {icons[part.kind] ? (
            <img className="edu-pc-part-pic" src={icons[part.kind]} alt="" width={44} height={44} />
          ) : (
            <span className={`edu-pc-part-icon kind-${part.kind}`} aria-hidden="true" />
          )}
          <span>{part.name}</span>
          {part.id === benchPart && <span className="edu-pc-part-note">на столі</span>}
        </button>
      )
    })}
  </div>
)

export const HeldBar = ({
  part,
  onTurn,
  onPutBack
}: {
  part: Part
  onTurn: (by: 1 | -1) => void
  onPutBack: () => void
}) => (
  <div className="edu-pc-held" role="group" aria-label="Деталь у руці">
    <span className="edu-pc-held-name">
      У руці: <b>{part.name}</b>. Натисни на місце, куди її поставити.
    </span>
    <button type="button" onClick={() => onTurn(-1)} aria-label="Повернути проти годинникової стрілки (Q)">
      ⟲
    </button>
    <button type="button" onClick={() => onTurn(1)} aria-label="Повернути за годинниковою стрілкою (E)">
      ⟳
    </button>
    <button type="button" onClick={onPutBack}>
      Покласти назад
    </button>
  </div>
)

/** What a part is and what it does. It takes the step card's place until it is closed, so only one message is on screen. */
export const PartInfo = ({ part, onClose }: { part: Part; onClose: () => void }) => (
  <aside className="edu-pc-info" aria-live="polite" aria-label={`Деталь: ${part.name}`}>
    <p className="edu-pc-info-kind">Деталь</p>
    <h3>{part.name}</h3>
    <p>{part.role}</p>
    <button type="button" className="edu-pc-info-ok" onClick={onClose}>
      Зрозуміло
    </button>
  </aside>
)

export const ToastLine = ({ toast }: { toast: Toast | null }) =>
  toast ? (
    <p key={toast.key} className={`edu-pc-toast tone-${toast.tone}`} role={toast.tone === "error" ? "alert" : "status"}>
      {toast.text}
    </p>
  ) : null

export const DoneCard = ({
  result,
  goals,
  onRestart,
  onNext
}: {
  result: Report
  goals: Readonly<Partial<Record<string, string>>>
  onRestart: () => void
  onNext?: (() => void) | undefined
}) => (
  <div className="edu-pc-overlay">
    <div className="edu-pc-question edu-pc-done">
      <h2>Готово! Усі кроки виконано.</h2>
      <p>
        {result.mistakes === 0 ? "Жодної помилки, чудово!" : `Помилок: ${result.mistakes}. Перечитай кроки, де вони були.`}
      </p>
      {Object.entries(result.byGoal).length > 0 && (
        <ul className="edu-pc-goals">
          {Object.entries(result.byGoal)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([goal, n]) => (
            <li key={goal}>
              Ціль {goal}
              {goals[goal] ? ` (${goals[goal]})` : ""}: {n === 0 ? "без помилок" : `помилок ${n}`}
            </li>
          ))}
        </ul>
      )}
      <div className="edu-pc-done-actions">
        {onNext && (
          <button type="button" className="edu-pc-primary" onClick={onNext}>
            Наступне завдання
          </button>
        )}
        <button type="button" className="edu-pc-answer" onClick={onRestart}>
          Пройти ще раз
        </button>
      </div>
    </div>
  </div>
)

/**
 * Cards to buy on an upgrade step. The student picks within the budget and checks: the time after the
 * upgrade is shown only on a check, so it is a decision, not a slider to play with.
 */
export const UpgradeCard = ({
  step,
  note,
  onCheck
}: {
  step: UpgradeStep
  /** The explanation of the last mistake, kept in view while the student thinks again. */
  note: string | undefined
  onCheck: (choose: ReadonlyArray<string>) => void
}) => {
  const [chosen, setChosen] = useState<ReadonlyArray<string>>([])
  const [tried, setTried] = useState<string | null>(null)
  const spent = step.options.filter((o) => chosen.includes(o.id)).reduce((sum, o) => sum + o.cost, 0)
  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))
  const check = () => {
    const minutes = montageMinutes(upgraded(step.base, step.options.filter((o) => chosen.includes(o.id))))
    setTried(formatMinutes(minutes))
    onCheck(chosen)
  }
  return (
    <div className="edu-pc-overlay is-panel" role="dialog" aria-labelledby="edu-pc-up">
      <div className="edu-pc-question edu-pc-shop">
        <p className="edu-pc-card-count">
          {step.task} зараз: {formatMinutes(montageMinutes(step.base))}. Мета: не довше {formatMinutes(step.target)}.
        </p>
        <h2 id="edu-pc-up">Що замінити? Бюджет: {step.budget} тис. грн</h2>
        <div className="edu-pc-answers">
          {step.options.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`edu-pc-answer edu-pc-offer${chosen.includes(o.id) ? " is-chosen" : ""}`}
              aria-pressed={chosen.includes(o.id)}
              onClick={() => toggle(o.id)}
            >
              <span>{o.label}</span>
              <b>{o.cost} тис.</b>
            </button>
          ))}
        </div>
        <p className={`edu-pc-shop-sum${spent > step.budget ? " is-over" : ""}`}>
          Вибрано на {spent} тис. грн із {step.budget}
          {tried ? ` · остання перевірка: ${tried}` : ""}
        </p>
        {note && <p className="edu-pc-note">{note}</p>}
        <button type="button" className="edu-pc-primary" disabled={chosen.length === 0} onClick={check}>
          Замінити й перевірити
        </button>
      </div>
    </div>
  )
}

const MEMORY_NAMES: Readonly<Record<MemoryKind, string>> = {
  volatile: "Зникне",
  persistent: "Лишиться"
}

/** Things on the computer, each to sort: lost at power off (it is only in RAM) or kept (it is on a disk). */
export const SortCard = ({
  step,
  sorted,
  note,
  onSort
}: {
  step: SortStep
  sorted: Readonly<Record<string, MemoryKind>>
  note: string | undefined
  onSort: (item: string, memory: MemoryKind) => void
}) => (
  <div className="edu-pc-overlay is-panel" role="dialog" aria-labelledby="edu-pc-sort">
    <div className="edu-pc-question edu-pc-sort">
      <h2 id="edu-pc-sort">Що буде після вимкнення?</h2>
      <ul className="edu-pc-sort-list">
        {step.items.map((item) => {
          const at = sorted[item.id]
          return (
            <li key={item.id} className={at ? "is-sorted" : undefined}>
              <span>{item.label}</span>
              <span className="edu-pc-sort-buttons">
                {(["volatile", "persistent"] as const).map((memory) => (
                  <button
                    key={memory}
                    type="button"
                    className={`edu-pc-sort-btn is-${memory}${at === memory ? " is-chosen" : ""}`}
                    disabled={at !== undefined}
                    onClick={() => onSort(item.id, memory)}
                  >
                    {MEMORY_NAMES[memory]}
                  </button>
                ))}
              </span>
            </li>
          )
        })}
      </ul>
      {note && <p className="edu-pc-note">{note}</p>}
    </div>
  </div>
)
