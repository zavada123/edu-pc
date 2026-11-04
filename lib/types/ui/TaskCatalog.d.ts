import { type Scenario } from "../core/scenario.ts";
import "./tokens.css";
import "./catalog.css";
interface Props {
    readonly scenarios: ReadonlyArray<Scenario>;
    /** Ids of done exercises: they get a check mark. */
    readonly solved: ReadonlyArray<string>;
    /** The open exercise, highlighted. */
    readonly current?: string | undefined;
    readonly onPick: (id: string) => void;
    /** Name of the list for screen readers. */
    readonly label?: string;
}
/** The exercises as cards, grouped by grade: kind, title, what to do, the number of steps and a check mark when done. */
export declare const TaskCatalog: ({ scenarios, solved, current, onPick, label }: Props) => import("react").JSX.Element;
export {};
