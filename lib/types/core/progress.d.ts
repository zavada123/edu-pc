import { type Action, type BuildState } from "./machine.ts";
import type { Goal, Scenario } from "./scenario.ts";
/** What the scene should light up for the current step. Empty when everything is done. */
export interface Hint {
    /** Parts still to take or inspect. */
    readonly parts: ReadonlyArray<string>;
    /** Free slots those parts may go to. */
    readonly slots: ReadonlyArray<string>;
    /** The control to switch, and to what. */
    readonly control?: {
        readonly id: string;
        readonly value: string;
    };
    /** The step's question is not answered yet. */
    readonly question: boolean;
    /** The next stop on a data path. */
    readonly stop?: string;
}
export declare const hintFor: (scenario: Scenario, state: BuildState) => Hint;
export interface StepReport {
    readonly id: string;
    readonly title: string;
    readonly mistakes: number;
    readonly done: boolean;
}
/** The result a lesson page shows and a teacher sees. */
export interface Report {
    readonly done: boolean;
    readonly stepsDone: number;
    readonly stepsTotal: number;
    readonly mistakes: number;
    /** Mistakes on the steps of each lesson goal; goals no step checks are left out. */
    readonly byGoal: Readonly<Partial<Record<Goal, number>>>;
    readonly steps: ReadonlyArray<StepReport>;
}
export declare const report: (scenario: Scenario, state: BuildState) => Report;
/**
 * A correct way through the scenario, made from its data. Tests replay it to prove every scenario
 * can be finished without mistakes; the demo uses it for a «show me» button.
 */
export declare const solution: (scenario: Scenario) => ReadonlyArray<Action>;
