import type { PcSpec, UpgradeOption, UpgradeStep } from "./scenario.ts";
/**
 * How long a video montage takes on this computer, in minutes. A teaching model, not a benchmark:
 * more cores and a higher frequency speed up the processor's part, a bigger cache a little, too little
 * RAM slows everything down, and a hard disk adds time for loading and saving.
 */
export declare const montageMinutes: (pc: PcSpec) => number;
/** The computer after the chosen cards. */
export declare const upgraded: (base: PcSpec, chosen: ReadonlyArray<UpgradeOption>) => PcSpec;
/** Rounds minutes the way the student sees them: «14,6 хв». */
export declare const formatMinutes: (minutes: number) => string;
export type UpgradeVerdict = {
    readonly ok: true;
    readonly minutes: number;
} | {
    readonly ok: false;
    readonly reason: "overBudget" | "sameGroup" | "tooSlow";
    readonly minutes: number;
    readonly why?: string;
};
/** Checks a choice of cards on an upgrade step: the budget, one card per part, and the time. */
export declare const judgeUpgrade: (step: UpgradeStep, ids: ReadonlyArray<string>) => UpgradeVerdict;
/** The cheapest choice that passes, for the solution and for checking a scenario can be done. */
export declare const cheapestUpgrade: (step: UpgradeStep) => ReadonlyArray<string> | undefined;
