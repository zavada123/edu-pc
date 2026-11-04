import type { MemoryKind, Turn } from "./parts.ts";
import type { Scenario, Step } from "./scenario.ts";
/** A part standing in a slot, and how it is turned. */
export interface Placed {
    readonly part: string;
    readonly turn: Turn;
}
/** Where the exercise is. Never changed in place: every action returns a new state. */
export interface BuildState {
    /** Index of the current step; equals the number of steps when everything is done. */
    readonly step: number;
    /** Slot id → the part in it. */
    readonly placed: Readonly<Record<string, Placed>>;
    readonly controls: Readonly<Record<string, string>>;
    /** Parts the student has clicked to read about, in order. */
    readonly inspected: ReadonlyArray<string>;
    /** Steps whose question is answered. */
    readonly answered: ReadonlyArray<string>;
    /** Stops tapped so far on the current data-path step, in order. */
    readonly picked: ReadonlyArray<string>;
    /** Item id → where the student sorted it: lost at power off (volatile) or kept (persistent). */
    readonly sorted: Readonly<Record<string, MemoryKind>>;
    /** Upgrade step id → the cards bought. */
    readonly upgrades: Readonly<Record<string, ReadonlyArray<string>>>;
    readonly mistakes: number;
    /** Step id → mistakes on that step. */
    readonly stepMistakes: Readonly<Record<string, number>>;
}
export type Action = {
    readonly type: "inspect";
    readonly part: string;
} | {
    readonly type: "place";
    readonly part: string;
    readonly slot: string;
    readonly turn: Turn;
} | {
    readonly type: "set";
    readonly control: string;
    readonly value: string;
} | {
    readonly type: "answer";
    readonly answer: string;
} | {
    readonly type: "pick";
    readonly stop: string;
} | {
    readonly type: "upgrade";
    readonly choose: ReadonlyArray<string>;
} | {
    readonly type: "sort";
    readonly item: string;
    readonly memory: MemoryKind;
};
export type MistakeReason = "wrongKind" | "wrongSlot" | "wrongTurn" | "notReady" | "wrongAnswer" | "wrongControl" | "wrongStop" | "overBudget" | "sameGroup" | "tooSlow" | "wrongMemory";
/**
 * What an action did:
 * `ok` — accepted (`advanced` when it finished the step);
 * `mistake` — counted as a mistake, with a message;
 * `question` — the step's question must be answered first; nothing changed;
 * `ignored` — not for this step (another part, an occupied slot); nothing changed, not a mistake.
 */
export type Outcome = {
    readonly result: "ok";
    readonly state: BuildState;
    readonly advanced: boolean;
} | {
    readonly result: "mistake";
    readonly state: BuildState;
    readonly reason: MistakeReason;
    readonly message: string;
} | {
    readonly result: "question";
    readonly state: BuildState;
    readonly message: string;
} | {
    readonly result: "ignored";
    readonly state: BuildState;
    readonly message: string;
};
/** The state at the start of a scenario: start parts placed, controls at their start values. */
export declare const startState: (scenario: Scenario) => BuildState;
export declare const currentStep: (scenario: Scenario, state: BuildState) => Step | undefined;
export declare const isDone: (scenario: Scenario, state: BuildState) => boolean;
/** The slot that holds this part, if it is placed. */
export declare const slotOf: (state: BuildState, partId: string) => string | undefined;
/** True when everything the step asks for is done in this state, its question included. */
export declare const stepComplete: (step: Step, state: BuildState) => boolean;
/** Applies one student action to the state. Parts can be inspected at any time, also between steps. */
export declare const apply: (scenario: Scenario, state: BuildState, action: Action) => Outcome;
/** Applies actions one after another, as a log replay (a teacher's check, or a saved session). */
export declare const replay: (scenario: Scenario, actions: ReadonlyArray<Action>, from?: BuildState) => BuildState;
