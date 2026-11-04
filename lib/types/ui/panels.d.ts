import type { BuildState } from "../core/machine.ts";
import type { MemoryKind, Part } from "../core/parts.ts";
import type { Report } from "../core/progress.ts";
import type { Question, Scenario, SortStep, Step, UpgradeStep } from "../core/scenario.ts";
import type { Held, Toast } from "./useBuild.ts";
/** The steps down the side: done, current, still ahead, with mistakes per step. */
export declare const StepList: ({ scenario, state }: {
    scenario: Scenario;
    state: BuildState;
}) => import("react").JSX.Element;
export declare const StepCard: ({ step, index, total }: {
    step: Step;
    index: number;
    total: number;
}) => import("react").JSX.Element;
export declare const QuestionCard: ({ step, question, onAnswer }: {
    step: Step;
    question: Question;
    onAnswer: (answer: string) => void;
}) => import("react").JSX.Element;
/** The parts not yet installed. On an «inspect» step a click reads about the part; otherwise it takes it. */
export declare const Tray: ({ parts, held, highlighted, benchPart, icons, onPick }: {
    parts: ReadonlyArray<Part>;
    held: Held | null;
    highlighted: ReadonlyArray<string>;
    /** The part that is the bench itself (the board, the case): it stays on the desk. */
    benchPart: string | undefined;
    /** Pictures rendered from the 3D models; until they are ready, simple drawn icons stand in. */
    icons: Partial<Record<string, string>>;
    onPick: (part: Part) => void;
}) => import("react").JSX.Element;
export declare const HeldBar: ({ part, onTurn, onPutBack }: {
    part: Part;
    onTurn: (by: 1 | -1) => void;
    onPutBack: () => void;
}) => import("react").JSX.Element;
export declare const PartInfo: ({ part, onClose }: {
    part: Part;
    onClose: () => void;
}) => import("react").JSX.Element;
export declare const ToastLine: ({ toast }: {
    toast: Toast | null;
}) => import("react").JSX.Element | null;
export declare const DoneCard: ({ result, goals, onRestart }: {
    result: Report;
    goals: Readonly<Partial<Record<string, string>>>;
    onRestart: () => void;
}) => import("react").JSX.Element;
/**
 * Cards to buy on an upgrade step. The student picks within the budget and checks: the time after the
 * upgrade is shown only on a check, so it is a decision, not a slider to play with.
 */
export declare const UpgradeCard: ({ step, note, onCheck }: {
    step: UpgradeStep;
    /** The explanation of the last mistake, kept in view while the student thinks again. */
    note: string | undefined;
    onCheck: (choose: ReadonlyArray<string>) => void;
}) => import("react").JSX.Element;
/** Things on the computer, each to sort: lost at power off (it is only in RAM) or kept (it is on a disk). */
export declare const SortCard: ({ step, sorted, note, onSort }: {
    step: SortStep;
    sorted: Readonly<Record<string, MemoryKind>>;
    note: string | undefined;
    onSort: (item: string, memory: MemoryKind) => void;
}) => import("react").JSX.Element;
