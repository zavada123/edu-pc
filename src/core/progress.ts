import { currentStep, isDone, slotOf, type Action, type BuildState } from "./machine.ts"
import { cheapestUpgrade } from "./upgrade.ts"
import type { Goal, Scenario, Step } from "./scenario.ts"

/** What the scene should light up for the current step. Empty when everything is done. */
export interface Hint {
  /** Parts still to take or inspect. */
  readonly parts: ReadonlyArray<string>
  /** Free slots those parts may go to. */
  readonly slots: ReadonlyArray<string>
  /** The control to switch, and to what. */
  readonly control?: { readonly id: string; readonly value: string }
  /** The step's question is not answered yet. */
  readonly question: boolean
  /** The next stop on a data path. */
  readonly stop?: string
}

const NO_HINT: Hint = { parts: [], slots: [], question: false }

const remainingTargets = (step: Step & { kind: "place" }, state: BuildState): ReadonlyArray<[string, ReadonlyArray<string>]> =>
  Object.entries(step.targets).filter(([part, slots]) => {
    const at = slotOf(state, part)
    return at === undefined || !slots.includes(at)
  })

export const hintFor = (scenario: Scenario, state: BuildState): Hint => {
  const step = currentStep(scenario, state)
  if (!step) return NO_HINT
  const question = step.question !== undefined && !state.answered.includes(step.id)
  switch (step.kind) {
    case "inspect":
      return { ...NO_HINT, question, parts: step.parts.filter((p) => !state.inspected.includes(p)) }
    case "set":
      return { ...NO_HINT, question, control: { id: step.control, value: step.value } }
    case "place": {
      const left = remainingTargets(step, state)
      const slots = [...new Set(left.flatMap(([, s]) => s))].filter((s) => state.placed[s] === undefined)
      return { question, parts: left.map(([part]) => part), slots }
    }
    case "sequence": {
      const next = step.order[state.picked.length]
      return next === undefined ? { ...NO_HINT, question } : { ...NO_HINT, question, stop: next }
    }
    case "upgrade":
    case "sort":
      return { ...NO_HINT, question }
  }
}

export interface StepReport {
  readonly id: string
  readonly title: string
  readonly mistakes: number
  readonly done: boolean
}

/** The result a lesson page shows and a teacher sees. */
export interface Report {
  readonly done: boolean
  readonly stepsDone: number
  readonly stepsTotal: number
  readonly mistakes: number
  /** Mistakes on the steps of each lesson goal; goals no step checks are left out. */
  readonly byGoal: Readonly<Partial<Record<Goal, number>>>
  readonly steps: ReadonlyArray<StepReport>
}

export const report = (scenario: Scenario, state: BuildState): Report => {
  const byGoal: Partial<Record<Goal, number>> = {}
  for (const step of scenario.steps) {
    if (step.goal) byGoal[step.goal] = (byGoal[step.goal] ?? 0) + (state.stepMistakes[step.id] ?? 0)
  }
  return {
    done: isDone(scenario, state),
    stepsDone: Math.min(state.step, scenario.steps.length),
    stepsTotal: scenario.steps.length,
    mistakes: state.mistakes,
    byGoal,
    steps: scenario.steps.map((step, i) => ({
      id: step.id,
      title: step.title,
      mistakes: state.stepMistakes[step.id] ?? 0,
      done: i < state.step
    }))
  }
}

/**
 * A correct way through the scenario, made from its data. Tests replay it to prove every scenario
 * can be finished without mistakes; the demo uses it for a «show me» button.
 */
export const solution = (scenario: Scenario): ReadonlyArray<Action> => {
  const actions: Action[] = []
  const taken = new Set(Object.keys(scenario.start?.placed ?? {}))
  for (const step of scenario.steps) {
    if (step.question) actions.push({ type: "answer", answer: step.question.right })
    if (step.kind === "inspect") for (const part of step.parts) actions.push({ type: "inspect", part })
    if (step.kind === "set") actions.push({ type: "set", control: step.control, value: step.value })
    if (step.kind === "sequence") for (const stop of step.order) actions.push({ type: "pick", stop })
    if (step.kind === "upgrade") actions.push({ type: "upgrade", choose: cheapestUpgrade(step) ?? [] })
    if (step.kind === "sort") for (const item of step.items) actions.push({ type: "sort", item: item.id, memory: item.memory })
    if (step.kind === "place") {
      for (const [part, slots] of Object.entries(step.targets)) {
        const slotId = slots.find((s) => !taken.has(s))
        if (slotId === undefined) continue
        taken.add(slotId)
        const turn = scenario.slots.find((s) => s.id === slotId)?.turn ?? 0
        actions.push({ type: "place", part, slot: slotId, turn })
      }
    }
  }
  return actions
}
