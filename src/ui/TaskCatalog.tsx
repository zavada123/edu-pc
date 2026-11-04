import { gradeGroups, summaryOf, topicOf } from "../core/catalog.ts"
import { TOPIC_NAMES, type Scenario } from "../core/scenario.ts"
import "./tokens.css"
import "./catalog.css"

interface Props {
  readonly scenarios: ReadonlyArray<Scenario>
  /** Ids of done exercises: they get a check mark. */
  readonly solved: ReadonlyArray<string>
  /** The open exercise, highlighted. */
  readonly current?: string | undefined
  readonly onPick: (id: string) => void
  /** Name of the list for screen readers. */
  readonly label?: string
}

const percent = (done: number, total: number): number => (total === 0 ? 0 : Math.round((done / total) * 100))

/** Ukrainian plural of «крок» after a number. */
const steps = (n: number): string => {
  const tens = n % 100
  const ones = n % 10
  if (ones === 1 && tens !== 11) return `${n} крок`
  if (ones >= 2 && ones <= 4 && (tens < 12 || tens > 14)) return `${n} кроки`
  return `${n} кроків`
}

/** The exercises as cards, grouped by grade: kind, title, what to do, the number of steps and a check mark when done. */
export const TaskCatalog = ({ scenarios, solved, current, onPick, label = "Завдання тренажера «Збери комп'ютер»" }: Props) => {
  const groups = gradeGroups(scenarios, solved)
  const done = groups.reduce((n, g) => n + g.done, 0)
  let number = 0
  return (
    <nav className="edu-pc-cat" aria-label={label}>
      <div className="edu-pc-cat-top">
        <p className="edu-pc-cat-count" aria-live="polite">
          Виконано <b>{done}</b> з {scenarios.length}
        </p>
        <span className="edu-pc-cat-bar" aria-hidden="true">
          <span style={{ width: `${percent(done, scenarios.length)}%` }} />
        </span>
      </div>
      {groups.map((g) => (
        <section key={g.grade} className="edu-pc-cat-group" aria-labelledby={`edu-pc-cat-grade-${g.grade}`}>
          <div className="edu-pc-cat-head">
            <h3 id={`edu-pc-cat-grade-${g.grade}`}>{g.grade > 0 ? `${g.grade} клас` : "Завдання"}</h3>
            <span className="edu-pc-cat-progress">
              {g.done} з {g.items.length}
            </span>
          </div>
          <div className="edu-pc-cat-grid">
            {g.items.map((s) => {
              number += 1
              const isDone = solved.includes(s.id)
              const isCurrent = s.id === current
              const topic = topicOf(s)
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`edu-pc-cat-card${isCurrent ? " is-current" : ""}${isDone ? " is-done" : ""}`}
                  aria-current={isCurrent ? "step" : undefined}
                  onClick={() => onPick(s.id)}
                >
                  <span className="edu-pc-cat-meta">
                    <span className="edu-pc-cat-num" aria-hidden="true">
                      {number}
                    </span>
                    <span className={`edu-pc-cat-topic is-${topic}`}>{TOPIC_NAMES[topic]}</span>
                    {isDone && (
                      <span className="edu-pc-cat-done" role="img" aria-label="виконано">
                        ✓
                      </span>
                    )}
                  </span>
                  <b className="edu-pc-cat-title">{s.title}</b>
                  <small className="edu-pc-cat-summary">{summaryOf(s)}</small>
                  <span className="edu-pc-cat-steps">{steps(s.steps.length)}</span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </nav>
  )
}
