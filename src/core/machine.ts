import { MESSAGES } from "./messages.ts"
import type { MemoryKind, Part, Turn } from "./parts.ts"
import type { PlaceStep, Scenario, SequenceStep, SetStep, Slot, SortStep, Step, UpgradeStep } from "./scenario.ts"
import { formatMinutes, judgeUpgrade } from "./upgrade.ts"

/** A part standing in a slot, and how it is turned. */
export interface Placed {
  readonly part: string
  readonly turn: Turn
}

/** Where the exercise is. Never changed in place: every action returns a new state. */
export interface BuildState {
  /** Index of the current step; equals the number of steps when everything is done. */
  readonly step: number
  /** Slot id → the part in it. */
  readonly placed: Readonly<Record<string, Placed>>
  readonly controls: Readonly<Record<string, string>>
  /** Parts the student has clicked to read about, in order. */
  readonly inspected: ReadonlyArray<string>
  /** Steps whose question is answered. */
  readonly answered: ReadonlyArray<string>
  /** Stops tapped so far on the current data-path step, in order. */
  readonly picked: ReadonlyArray<string>
  /** Item id → where the student sorted it: lost at power off (volatile) or kept (persistent). */
  readonly sorted: Readonly<Record<string, MemoryKind>>
  /** Upgrade step id → the cards bought. */
  readonly upgrades: Readonly<Record<string, ReadonlyArray<string>>>
  readonly mistakes: number
  /** Step id → mistakes on that step. */
  readonly stepMistakes: Readonly<Record<string, number>>
}

export type Action =
  | { readonly type: "inspect"; readonly part: string }
  | { readonly type: "place"; readonly part: string; readonly slot: string; readonly turn: Turn }
  | { readonly type: "set"; readonly control: string; readonly value: string }
  | { readonly type: "answer"; readonly answer: string }
  | { readonly type: "pick"; readonly stop: string }
  | { readonly type: "upgrade"; readonly choose: ReadonlyArray<string> }
  | { readonly type: "sort"; readonly item: string; readonly memory: MemoryKind }

export type MistakeReason =
  | "wrongKind"
  | "wrongSlot"
  | "wrongTurn"
  | "notReady"
  | "wrongAnswer"
  | "wrongControl"
  | "wrongStop"
  | "overBudget"
  | "sameGroup"
  | "tooSlow"
  | "wrongMemory"

/**
 * What an action did:
 * `ok` — accepted (`advanced` when it finished the step);
 * `mistake` — counted as a mistake, with a message;
 * `question` — the step's question must be answered first; nothing changed;
 * `ignored` — not for this step (another part, an occupied slot); nothing changed, not a mistake.
 */
export type Outcome =
  | { readonly result: "ok"; readonly state: BuildState; readonly advanced: boolean }
  | { readonly result: "mistake"; readonly state: BuildState; readonly reason: MistakeReason; readonly message: string }
  | { readonly result: "question"; readonly state: BuildState; readonly message: string }
  | { readonly result: "ignored"; readonly state: BuildState; readonly message: string }

/** The state at the start of a scenario: start parts placed, controls at their start values. */
export const startState = (scenario: Scenario): BuildState => {
  const controls: Record<string, string> = {}
  for (const control of scenario.controls) {
    controls[control.id] = scenario.start?.controls?.[control.id] ?? control.values[0] ?? ""
  }
  const placed: Record<string, Placed> = {}
  for (const [slotId, partId] of Object.entries(scenario.start?.placed ?? {})) {
    const slot = scenario.slots.find((s) => s.id === slotId)
    placed[slotId] = { part: partId, turn: slot?.turn ?? 0 }
  }
  return { step: 0, placed, controls, inspected: [], answered: [], picked: [], sorted: {}, upgrades: {}, mistakes: 0, stepMistakes: {} }
}

export const currentStep = (scenario: Scenario, state: BuildState): Step | undefined => scenario.steps[state.step]

export const isDone = (scenario: Scenario, state: BuildState): boolean => state.step >= scenario.steps.length

/** The slot that holds this part, if it is placed. */
export const slotOf = (state: BuildState, partId: string): string | undefined =>
  Object.entries(state.placed).find(([, placed]) => placed.part === partId)?.[0]

const partName = (scenario: Scenario, id: string): string => scenario.parts.find((p) => p.id === id)?.name ?? id
const slotById = (scenario: Scenario, id: string): Slot | undefined => scenario.slots.find((s) => s.id === id)
const controlLabel = (scenario: Scenario, id: string): string =>
  scenario.controls.find((c) => c.id === id)?.label ?? id

const ok = (state: BuildState, advanced: boolean): Outcome => ({ result: "ok", state, advanced })
const ignored = (state: BuildState, message: string): Outcome => ({ result: "ignored", state, message })

const mistake = (step: Step, state: BuildState, reason: MistakeReason, message: string): Outcome => ({
  result: "mistake",
  reason,
  message,
  state: {
    ...state,
    mistakes: state.mistakes + 1,
    stepMistakes: { ...state.stepMistakes, [step.id]: (state.stepMistakes[step.id] ?? 0) + 1 }
  }
})

/** Moves to the next step when the current one is complete. */
const advanceIfComplete = (scenario: Scenario, state: BuildState): Outcome => {
  const step = currentStep(scenario, state)
  // the next step starts with no stops tapped
  if (step && stepComplete(step, state)) return ok({ ...state, step: state.step + 1, picked: [] }, true)
  return ok(state, false)
}

/** True when everything the step asks for is done in this state, its question included. */
export const stepComplete = (step: Step, state: BuildState): boolean => {
  if (step.question && !state.answered.includes(step.id)) return false
  switch (step.kind) {
    case "inspect":
      return step.parts.every((p) => state.inspected.includes(p))
    case "place":
      return Object.entries(step.targets).every(([part, slots]) => {
        const at = slotOf(state, part)
        return at !== undefined && slots.includes(at)
      })
    case "set":
      return state.controls[step.control] === step.value
    case "sequence":
      return state.picked.length >= step.order.length
    case "upgrade":
      return state.upgrades[step.id] !== undefined
    case "sort":
      return step.items.every((item) => state.sorted[item.id] === item.memory)
  }
}

const unmetRequirement = (step: PlaceStep, state: BuildState): string | undefined =>
  Object.entries(step.requires ?? {}).find(([control, value]) => state.controls[control] !== value)?.[0]

const place = (
  scenario: Scenario,
  step: Step,
  state: BuildState,
  action: Extract<Action, { type: "place" }>
): Outcome => {
  if (step.kind !== "place") return ignored(state, MESSAGES.notNow(step.title))
  const allowed = step.targets[action.part]
  if (!allowed) return ignored(state, MESSAGES.notNow(step.title))
  const slot = slotById(scenario, action.slot)
  const part: Part | undefined = scenario.parts.find((p) => p.id === action.part)
  if (!slot || !part) return ignored(state, MESSAGES.notNow(step.title))
  const name = partName(scenario, action.part)
  const occupant = state.placed[slot.id]
  if (occupant && occupant.part !== action.part) return ignored(state, MESSAGES.slotTaken(slot.label))
  if (!slot.accepts.includes(part.kind)) return mistake(step, state, "wrongKind", MESSAGES.wrongKind(name, slot.label))
  if (!allowed.includes(slot.id)) {
    return mistake(step, state, "wrongSlot", step.messages?.wrongSlot ?? MESSAGES.wrongSlot(name, slot.label))
  }
  const unmet = unmetRequirement(step, state)
  if (unmet !== undefined) {
    return mistake(step, state, "notReady", step.messages?.notReady ?? MESSAGES.notReady(controlLabel(scenario, unmet)))
  }
  if (slot.turn !== undefined && slot.turn !== action.turn) {
    return mistake(step, state, "wrongTurn", step.messages?.wrongTurn ?? MESSAGES.wrongTurn(name))
  }
  const placed: Record<string, Placed> = {}
  for (const [id, p] of Object.entries(state.placed)) if (p.part !== action.part) placed[id] = p
  placed[slot.id] = { part: action.part, turn: action.turn }
  return advanceIfComplete(scenario, { ...state, placed })
}

const set = (scenario: Scenario, step: Step, state: BuildState, action: Extract<Action, { type: "set" }>): Outcome => {
  const target: SetStep | undefined = step.kind === "set" ? step : undefined
  const other = target?.otherControls?.[action.control]
  if (other !== undefined) return mistake(step, state, "wrongControl", other)
  if (!target || target.control !== action.control || target.value !== action.value) {
    return ignored(state, MESSAGES.notNow(step.title))
  }
  return advanceIfComplete(scenario, { ...state, controls: { ...state.controls, [action.control]: action.value } })
}

const pick = (scenario: Scenario, step: SequenceStep, state: BuildState, stopId: string): Outcome => {
  const stop = step.stops.find((s) => s.id === stopId)
  if (!stop) return ignored(state, MESSAGES.notNow(step.title))
  if (step.order[state.picked.length] === stopId) return advanceIfComplete(scenario, { ...state, picked: [...state.picked, stopId] })
  if (state.picked.includes(stopId)) return ignored(state, MESSAGES.alreadyOnPath(stop.label))
  const last = step.stops.find((s) => s.id === state.picked.at(-1))?.label
  return mistake(step, state, "wrongStop", stop.why ?? MESSAGES.wrongStop(stop.label, last))
}

const upgrade = (scenario: Scenario, step: UpgradeStep, state: BuildState, choose: ReadonlyArray<string>): Outcome => {
  const verdict = judgeUpgrade(step, choose)
  if (verdict.ok) return advanceIfComplete(scenario, { ...state, upgrades: { ...state.upgrades, [step.id]: [...choose] } })
  const time = formatMinutes(verdict.minutes)
  if (verdict.reason === "overBudget") return mistake(step, state, "overBudget", MESSAGES.overBudget(step.budget))
  if (verdict.reason === "sameGroup") return mistake(step, state, "sameGroup", MESSAGES.sameGroup)
  return mistake(step, state, "tooSlow", `${MESSAGES.tooSlow(step.task, time, formatMinutes(step.target))}${verdict.why ? ` ${verdict.why}` : ""}`)
}

const sort = (scenario: Scenario, step: SortStep, state: BuildState, itemId: string, memory: MemoryKind): Outcome => {
  const item = step.items.find((i) => i.id === itemId)
  if (!item) return ignored(state, MESSAGES.notNow(step.title))
  if (item.memory !== memory) return mistake(step, state, "wrongMemory", item.why)
  return advanceIfComplete(scenario, { ...state, sorted: { ...state.sorted, [itemId]: memory } })
}

const answer = (scenario: Scenario, step: Step, state: BuildState, given: string): Outcome => {
  if (!step.question || state.answered.includes(step.id)) return ignored(state, MESSAGES.noQuestion)
  if (given !== step.question.right) return mistake(step, state, "wrongAnswer", MESSAGES.wrongAnswer)
  return advanceIfComplete(scenario, { ...state, answered: [...state.answered, step.id] })
}

const inspect = (scenario: Scenario, state: BuildState, partId: string): Outcome => {
  if (!scenario.parts.some((p) => p.id === partId)) return ignored(state, MESSAGES.unknownPart)
  if (state.inspected.includes(partId)) return ok(state, false)
  return advanceIfComplete(scenario, { ...state, inspected: [...state.inspected, partId] })
}

/** Applies one student action to the state. Parts can be inspected at any time, also between steps. */
export const apply = (scenario: Scenario, state: BuildState, action: Action): Outcome => {
  const step = currentStep(scenario, state)
  // Inspecting is reading: allowed at any time and never blocked by a question.
  if (action.type === "inspect") return inspect(scenario, state, action.part)
  if (!step) return ignored(state, MESSAGES.finished)
  if (action.type === "answer") return answer(scenario, step, state, action.answer)
  if (step.question && !state.answered.includes(step.id)) {
    return { result: "question", state, message: MESSAGES.answerFirst }
  }
  switch (action.type) {
    case "place":
      return place(scenario, step, state, action)
    case "set":
      return set(scenario, step, state, action)
    case "pick":
      return step.kind === "sequence" ? pick(scenario, step, state, action.stop) : ignored(state, MESSAGES.notNow(step.title))
    case "upgrade":
      return step.kind === "upgrade" ? upgrade(scenario, step, state, action.choose) : ignored(state, MESSAGES.notNow(step.title))
    case "sort":
      return step.kind === "sort" ? sort(scenario, step, state, action.item, action.memory) : ignored(state, MESSAGES.notNow(step.title))
  }
}

/** Applies actions one after another, as a log replay (a teacher's check, or a saved session). */
export const replay = (scenario: Scenario, actions: ReadonlyArray<Action>, from = startState(scenario)): BuildState =>
  actions.reduce((state, action) => apply(scenario, state, action).state, from)
