import { type Action, type BuildState, type Outcome } from "../core/machine.ts";
import { type Turn } from "../core/parts.ts";
import { type Report } from "../core/progress.ts";
import type { Scenario } from "../core/scenario.ts";
export interface Held {
    readonly part: string;
    readonly turn: Turn;
}
export interface Toast {
    readonly text: string;
    readonly tone: "ok" | "error" | "info";
    /** Changes on every toast, so the same text shown twice still restarts its animation. */
    readonly key: number;
}
export interface BuildCallbacks {
    /** After every accepted action or mistake: the action, the new state. Save the log to replay it later. */
    readonly onAction?: ((action: Action, state: BuildState) => void) | undefined;
    readonly onComplete?: ((result: Report) => void) | undefined;
}
/** The trainer's state for React: the build state, the part in hand and the last message. */
export declare const useBuild: (scenario: Scenario, callbacks: BuildCallbacks, initial?: BuildState) => {
    state: BuildState;
    step: import("../core.ts").Step | undefined;
    hint: import("../core.ts").Hint;
    held: Held | null;
    toast: Toast | null;
    info: string | null;
    act: (action: Action) => Outcome;
    inspect: (part: string) => void;
    take: (part: string) => void;
    rotate: (by: 1 | -1) => void;
    putBack: () => void;
    placeAt: (slot: string) => void;
    restart: () => void;
    setInfo: import("react").Dispatch<import("react").SetStateAction<string | null>>;
};
