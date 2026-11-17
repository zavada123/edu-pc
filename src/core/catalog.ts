import type { Scenario, ScenarioTopic } from "./scenario.ts"

/** Exercises of one topic, in library order, and how many of them are done. */
export interface TopicGroup {
  readonly topic: ScenarioTopic
  readonly items: ReadonlyArray<Scenario>
  readonly done: number
}

/** Exercises grouped by topic, in the order the topics first come in the library; `solved` gives the count of each group. */
export const topicGroups = (scenarios: ReadonlyArray<Scenario>, solved: ReadonlyArray<string>): ReadonlyArray<TopicGroup> =>
  [...new Set(scenarios.map(topicOf))].map((topic) => {
    const items = scenarios.filter((s) => topicOf(s) === topic)
    return { topic, items, done: items.filter((s) => solved.includes(s.id)).length }
  })

export const topicOf = (scenario: Scenario): ScenarioTopic => scenario.topic ?? "build"

/** Text of the task card: the summary, or the first line of the story. */
export const summaryOf = (scenario: Scenario): string => scenario.summary ?? scenario.story[0] ?? ""

/**
 * The exercise to open after `current`: the next one not done in library order, starting after `current` and
 * going round to the start; `undefined` when every other exercise is done.
 */
export const nextScenario = (scenarios: ReadonlyArray<Scenario>, solved: ReadonlyArray<string>, current: string): Scenario | undefined => {
  const at = scenarios.findIndex((s) => s.id === current)
  const order = [...scenarios.slice(at + 1), ...scenarios.slice(0, Math.max(at, 0))]
  return order.find((s) => s.id !== current && !solved.includes(s.id))
}
