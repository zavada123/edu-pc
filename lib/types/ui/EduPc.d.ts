import type { Scenario } from "../core/scenario.ts";
import { type SceneLayout } from "../scene/layout.ts";
import type { SceneHandle } from "../scene/PcScene.ts";
import { type BuildCallbacks } from "./useBuild.ts";
import "./edu-pc.css";
export interface EduPcProps extends BuildCallbacks {
    readonly scenario: Scenario;
    /** Where the scenario's slots are in 3D. Defaults to the built-in layout for the scenario's id. */
    readonly layout?: SceneLayout;
    /** Light glow over the next target. On by default; the student can switch it off. */
    readonly hints?: boolean;
    /** Fewer pixels and no antialiasing, for old school computers. */
    readonly lightGraphics?: boolean;
    /** Called once the 3D scene has loaded. For automated tests and teacher tools. */
    readonly onSceneReady?: ((scene: SceneHandle) => void) | undefined;
}
/** The PC-building trainer: a 3D bench with the steps, the parts tray and the questions around it. */
export declare const EduPc: ({ scenario, layout, hints, lightGraphics, onAction, onComplete, onSceneReady }: EduPcProps) => import("react").JSX.Element;
