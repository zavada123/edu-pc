import type { Scenario, ScenarioTopic } from "./scenario.ts";
/** Exercises of one topic, in library order, and how many of them are done. */
export interface TopicGroup {
    readonly topic: ScenarioTopic;
    readonly items: ReadonlyArray<Scenario>;
    readonly done: number;
}
/** Exercises grouped by topic, in the order the topics first come in the library; `solved` gives the count of each group. */
export declare const topicGroups: (scenarios: ReadonlyArray<Scenario>, solved: ReadonlyArray<string>) => ReadonlyArray<TopicGroup>;
export declare const topicOf: (scenario: Scenario) => ScenarioTopic;
/** Text of the task card: the summary, or the first line of the story. */
export declare const summaryOf: (scenario: Scenario) => string;
/**
 * The exercise to open after `current`: the next one not done in library order, starting after `current` and
 * going round to the start; `undefined` when every other exercise is done.
 */
export declare const nextScenario: (scenarios: ReadonlyArray<Scenario>, solved: ReadonlyArray<string>, current: string) => Scenario | undefined;
