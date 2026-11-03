import { describe, expect, test } from "vitest"
import { apply, currentStep, isDone, replay, startState, type Action, type BuildState, type Outcome } from "./machine.ts"
import { turn } from "./parts.ts"
import type { Scenario } from "./scenario.ts"

// A small board: a lever, a CPU that fits one way, two RAM modules for two of three slots.
const board: Scenario = {
  id: "test",
  grade: 8,
  title: "Тест",
  story: [],
  parts: [
    { id: "cpu", kind: "cpu", name: "Процесор", role: "" },
    { id: "ramA", kind: "ram", name: "Пам'ять A", role: "" },
    { id: "ramB", kind: "ram", name: "Пам'ять B", role: "" },
    { id: "ssd", kind: "m2ssd", name: "SSD", role: "" }
  ],
  slots: [
    { id: "socket", label: "Сокет", accepts: ["cpu"], turn: 1 },
    { id: "s1", label: "Слот 1", accepts: ["ram"] },
    { id: "s2", label: "Слот 2", accepts: ["ram"] },
    { id: "s3", label: "Слот 3", accepts: ["ram"] }
  ],
  controls: [{ id: "lever", label: "Важіль", values: ["down", "up"] }],
  steps: [
    { id: "look", kind: "inspect", title: "Роздивись", explain: "", parts: ["cpu", "ssd"] },
    { id: "up", kind: "set", title: "Підніми", explain: "", control: "lever", value: "up" },
    {
      id: "cpu",
      kind: "place",
      title: "Процесор",
      explain: "",
      goal: "B",
      question: { text: "?", right: "так", wrong: ["ні"] },
      targets: { cpu: ["socket"] },
      requires: { lever: "up" },
      messages: { wrongTurn: "Поверни" }
    },
    { id: "down", kind: "set", title: "Опусти", explain: "", control: "lever", value: "down" },
    {
      id: "ram",
      kind: "place",
      title: "Пам'ять",
      explain: "",
      goal: "C",
      targets: { ramA: ["s1", "s3"], ramB: ["s1", "s3"] },
      messages: { wrongSlot: "Не той слот" }
    }
  ]
}

const run = (state: BuildState, ...actions: Action[]): BuildState => replay(board, actions, state)
const stateAt = (stepId: string): BuildState => {
  const actions: Action[] = [
    { type: "inspect", part: "cpu" },
    { type: "inspect", part: "ssd" },
    { type: "set", control: "lever", value: "up" },
    { type: "answer", answer: "так" },
    { type: "place", part: "cpu", slot: "socket", turn: 1 },
    { type: "set", control: "lever", value: "down" }
  ]
  let state = startState(board)
  for (const action of actions) {
    if (currentStep(board, state)?.id === stepId) return state
    state = apply(board, state, action).state
  }
  return state
}
const expectMistake = (outcome: Outcome, reason: string): void => {
  expect(outcome.result).toBe("mistake")
  if (outcome.result === "mistake") expect(outcome.reason).toBe(reason)
}

describe("startState", () => {
  test("puts controls at their first value and the step at 0", () => {
    const state = startState(board)
    expect(state.step).toBe(0)
    expect(state.controls).toEqual({ lever: "down" })
    expect(state.mistakes).toBe(0)
  })

  test("takes start parts and control values from the scenario", () => {
    const state = startState({ ...board, start: { placed: { socket: "cpu" }, controls: { lever: "up" } } })
    expect(state.placed).toEqual({ socket: { part: "cpu", turn: 1 } })
    expect(state.controls.lever).toBe("up")
  })
})

describe("inspect step", () => {
  test("advances once every listed part is inspected", () => {
    const once = apply(board, startState(board), { type: "inspect", part: "cpu" })
    expect(once).toMatchObject({ result: "ok", advanced: false })
    const twice = apply(board, once.state, { type: "inspect", part: "ssd" })
    expect(twice).toMatchObject({ result: "ok", advanced: true })
    expect(currentStep(board, twice.state)?.id).toBe("up")
  })

  test("inspecting the same part twice changes nothing", () => {
    const state = run(startState(board), { type: "inspect", part: "cpu" })
    expect(apply(board, state, { type: "inspect", part: "cpu" }).state).toBe(state)
  })

  test("ignores a part the scenario does not have", () => {
    expect(apply(board, startState(board), { type: "inspect", part: "gpu" }).result).toBe("ignored")
  })
})

describe("set step", () => {
  test("sets the control and advances", () => {
    const outcome = apply(board, stateAt("up"), { type: "set", control: "lever", value: "up" })
    expect(outcome).toMatchObject({ result: "ok", advanced: true })
    expect(outcome.state.controls.lever).toBe("up")
  })

  test("ignores a switch the step does not ask for, without a mistake", () => {
    const outcome = apply(board, stateAt("up"), { type: "set", control: "lever", value: "down" })
    expect(outcome.result).toBe("ignored")
    expect(outcome.state.mistakes).toBe(0)
  })
})

describe("question", () => {
  test("blocks the step's action until answered", () => {
    const before = stateAt("cpu")
    const outcome = apply(board, before, { type: "place", part: "cpu", slot: "socket", turn: 1 })
    expect(outcome.result).toBe("question")
    expect(outcome.state).toBe(before)
  })

  test("a wrong answer is a mistake on that step", () => {
    const outcome = apply(board, stateAt("cpu"), { type: "answer", answer: "ні" })
    expectMistake(outcome, "wrongAnswer")
    expect(outcome.state.stepMistakes).toEqual({ cpu: 1 })
  })

  test("the right answer unlocks the action", () => {
    const answered = run(stateAt("cpu"), { type: "answer", answer: "так" })
    expect(answered.answered).toEqual(["cpu"])
    expect(apply(board, answered, { type: "place", part: "cpu", slot: "socket", turn: 1 })).toMatchObject({
      result: "ok",
      advanced: true
    })
  })

  test("answering when there is no question is ignored", () => {
    expect(apply(board, stateAt("up"), { type: "answer", answer: "так" }).result).toBe("ignored")
  })
})

describe("place step", () => {
  const cpuReady = (): BuildState => run(stateAt("cpu"), { type: "answer", answer: "так" })

  test("a part turned the wrong way is a mistake with the step's message", () => {
    const outcome = apply(board, cpuReady(), { type: "place", part: "cpu", slot: "socket", turn: 0 })
    expectMistake(outcome, "wrongTurn")
    if (outcome.result === "mistake") expect(outcome.message).toBe("Поверни")
    expect(outcome.state.placed).toEqual({})
  })

  test("a control that is not ready is a mistake", () => {
    const leverDown = { ...cpuReady(), controls: { lever: "down" } }
    expectMistake(apply(board, leverDown, { type: "place", part: "cpu", slot: "socket", turn: 1 }), "notReady")
  })

  test("a part in a slot of another kind is a mistake", () => {
    expectMistake(apply(board, cpuReady(), { type: "place", part: "cpu", slot: "s1", turn: 1 }), "wrongKind")
  })

  test("a part that is not this step's is ignored, not a mistake", () => {
    const outcome = apply(board, cpuReady(), { type: "place", part: "ramA", slot: "s1", turn: 0 })
    expect(outcome.result).toBe("ignored")
    expect(outcome.state.mistakes).toBe(0)
  })

  test("several parts: advances only when every one is in an allowed slot", () => {
    const start = stateAt("ram")
    expectMistake(apply(board, start, { type: "place", part: "ramA", slot: "s2", turn: 0 }), "wrongSlot")
    const one = apply(board, start, { type: "place", part: "ramA", slot: "s1", turn: 0 })
    expect(one).toMatchObject({ result: "ok", advanced: false })
    const both = apply(board, one.state, { type: "place", part: "ramB", slot: "s3", turn: 0 })
    expect(both).toMatchObject({ result: "ok", advanced: true })
    expect(isDone(board, both.state)).toBe(true)
  })

  test("an occupied slot is ignored", () => {
    const one = run(stateAt("ram"), { type: "place", part: "ramA", slot: "s1", turn: 0 })
    expect(apply(board, one, { type: "place", part: "ramB", slot: "s1", turn: 0 }).result).toBe("ignored")
  })

  test("moving a placed part frees its old slot", () => {
    const moved = run(stateAt("ram"), { type: "place", part: "ramA", slot: "s1", turn: 0 }, {
      type: "place",
      part: "ramA",
      slot: "s3",
      turn: 0
    })
    expect(moved.placed).toEqual({ socket: { part: "cpu", turn: 1 }, s3: { part: "ramA", turn: 0 } })
  })

  test("never changes the state it was given", () => {
    const start = stateAt("ram")
    const copy = structuredClone(start)
    apply(board, start, { type: "place", part: "ramA", slot: "s1", turn: 0 })
    apply(board, start, { type: "place", part: "ramA", slot: "s2", turn: 0 })
    expect(start).toEqual(copy)
  })
})

describe("after the last step", () => {
  test("ignores further actions but still lets the student inspect", () => {
    const done = run(stateAt("ram"), { type: "place", part: "ramA", slot: "s1", turn: 0 }, {
      type: "place",
      part: "ramB",
      slot: "s3",
      turn: 0
    })
    expect(apply(board, done, { type: "set", control: "lever", value: "up" }).result).toBe("ignored")
    expect(apply(board, done, { type: "inspect", part: "ramA" }).state.inspected).toContain("ramA")
  })
})

describe("turn", () => {
  test("wraps around in both directions", () => {
    expect(turn(3, 1)).toBe(0)
    expect(turn(0, -1)).toBe(3)
    expect(turn(1, 1)).toBe(2)
  })
})
