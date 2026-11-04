import { StrictMode, useState } from "react"
import { createRoot } from "react-dom/client"
import { nextScenario } from "../core/catalog.ts"
import { replay, startState, type BuildState } from "../core/machine.ts"
import { solution } from "../core/progress.ts"
import type { Scenario } from "../core/scenario.ts"
import { grade8Club, scenarios } from "../scenarios/index.ts"
import { EduPc } from "../ui/EduPc.tsx"
import { TaskCatalog } from "../ui/TaskCatalog.tsx"
import "./demo.css"

const rootEl = document.getElementById("root")
if (!rootEl) throw new Error("Немає #root")
const params = new URLSearchParams(location.search)
const light = params.has("light")
// ?s=<scenario id> picks the exercise, for example ?s=grade8-club-case
const scenario = scenarios[params.get("s") ?? ""] ?? grade8Club
// ?debug puts the scene on window for automated browser tests
const onSceneReady = params.has("debug") ? (scene: unknown) => Object.assign(window, { eduPcScene: scene }) : undefined
// ?step=<n> starts at step n (from 1), with the steps before it and its question done the right way: for checking one step
const stepParam = Number(params.get("step") ?? "")
const startAt = (s: Scenario): BuildState | undefined => {
  if (!Number.isInteger(stepParam) || stepParam <= 1) return undefined
  let state = startState(s)
  for (const action of solution(s)) {
    if (state.step >= stepParam - 1 && action.type !== "answer") break
    state = replay(s, [action], state)
  }
  return state
}

const all = Object.values(scenarios)

/** ?cards: the task cards over the trainer, as a lesson page shows them. */
const CardsPage = () => {
  const [current, setCurrent] = useState(scenario.id)
  const [solved, setSolved] = useState<ReadonlyArray<string>>([])
  const open = scenarios[current] ?? grade8Club
  const next = nextScenario(all, solved, open.id)
  return (
    <div className="demo-page">
      <TaskCatalog scenarios={all} solved={solved} current={current} onPick={setCurrent} />
      <div className="demo-trainer">
        <EduPc
          key={open.id}
          scenario={open}
          lightGraphics={light}
          onSceneReady={onSceneReady}
          onComplete={() => setSolved((s) => (s.includes(open.id) ? s : [...s, open.id]))}
          onNext={next === undefined ? undefined : () => setCurrent(next.id)}
        />
      </div>
    </div>
  )
}

createRoot(rootEl).render(
  <StrictMode>
    {params.has("cards") ? (
      <CardsPage />
    ) : (
      <EduPc scenario={scenario} lightGraphics={light} onSceneReady={onSceneReady} initialState={startAt(scenario)} />
    )}
  </StrictMode>
)
