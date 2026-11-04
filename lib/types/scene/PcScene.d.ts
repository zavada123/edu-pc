import type { Hint } from "../core/progress.ts";
import type { Placed } from "../core/machine.ts";
import type { PartKind, Turn } from "../core/parts.ts";
import type { Scenario } from "../core/scenario.ts";
import { type SceneLayout, type Vec3 } from "./layout.ts";
export interface SceneEvents {
    /** The student clicked a slot while holding a part. */
    readonly onSlot: (slotId: string) => void;
    /** The student clicked a control on the bench: the socket lever, the power button. */
    readonly onControl: (controlId: string) => void;
    /** The student clicked a placed part or the bench (the board, the case). */
    readonly onInspect: (partId: string) => void;
    /** The student tapped a marker on a data path. */
    readonly onStop: (stopId: string) => void;
}
/** What the page outside the trainer may ask of the scene: tests and teacher tools. */
export interface SceneHandle {
    /** Where a slot, the lever or a control's button is on the screen, in page pixels; null when it is not in this layout. */
    screenPoint(target: ScreenTarget): {
        x: number;
        y: number;
    } | null;
}
export type ScreenTarget = {
    readonly slot: string;
} | {
    readonly lever: true;
} | {
    readonly control: string;
}
/** A box on the desk, closed or opened. */
 | {
    readonly box: string;
}
/** A marker on a data path. */
 | {
    readonly stop: string;
};
/** Everything the scene shows. The React component sends a new view after every action. */
export interface SceneView {
    readonly placed: Readonly<Record<string, Placed>>;
    readonly controls: Readonly<Record<string, string>>;
    /** Parts the student has read about: their boxes on the desk are open. */
    readonly inspected: ReadonlyArray<string>;
    readonly held: {
        readonly part: string;
        readonly turn: Turn;
    } | null;
    readonly hint: Hint | null;
    /** The data path the student lays: every marker, and the stops tapped so far. Null on other steps. */
    readonly path: {
        readonly stops: ReadonlyArray<{
            readonly id: string;
            readonly label: string;
        }>;
        readonly picked: ReadonlyArray<string>;
    } | null;
}
/** The 3D bench: a desk, the board, placed parts, the part in hand. Knows nothing about steps or rules. */
export declare class PcScene implements SceneHandle {
    private readonly host;
    private readonly scenario;
    private readonly layout;
    private readonly events;
    private readonly renderer;
    private readonly scene;
    private readonly camera;
    private readonly controls;
    private readonly bench;
    private readonly benchModel;
    private readonly lever;
    private readonly buttons;
    private readonly propScreens;
    private screens;
    private readonly boxes;
    private spinners;
    private readonly areas;
    private readonly placedMeshes;
    private heldMesh;
    private readonly ray;
    private readonly pointer;
    private readonly holdHeight;
    private readonly holdPlane;
    private readonly holdAt;
    private down;
    private view;
    private readonly markers;
    private markerKey;
    private readonly packet;
    private leverAngle;
    private readonly focusTarget;
    private focusFrom;
    private focusing;
    private readonly resize;
    constructor(host: HTMLElement, scenario: Scenario, layout: SceneLayout, events: SceneEvents, light?: boolean);
    /** Shows a new view: placed parts, the lever, the part in hand and the highlighted slots. */
    update(view: SceneView): void;
    /** Glides the camera to look at a point from a comfortable distance and direction; farther on a narrow screen. */
    focus(at: Vec3, distance?: number, view?: Vec3): void;
    /**
     * How much farther to stand on a narrow screen. Close looks need a little more room; a look at a
     * whole wide desk on a phone held upright needs enough to fit the desk's width.
     */
    private narrowFactor;
    screenPoint(target: ScreenTarget): {
        x: number;
        y: number;
    } | null;
    /** Tray pictures of the given kinds, drawn from the scene's own models. */
    icons(kinds: ReadonlyArray<PartKind>): Partial<Record<PartKind, string>>;
    dispose(): void;
    private addArea;
    private kindOf;
    private syncPlaced;
    /** A closed box on the desk, and the device it holds once opened. */
    private addBox;
    /** Markers of the data path: blue until tapped in turn, green once on the path, joined by arrows. */
    private syncPath;
    /** Boxes open once their part is read about; the device stands there until it is taken or placed. */
    private syncDesk;
    private syncHeld;
    private fit;
    private pathPoints;
    private noDisk;
    /** A light runs along the laid path, over and over: the data on its way. */
    private animatePath;
    private readonly frame;
    private poweredOn;
    /** What the screen shows with the power on: the desktop, nothing, or «disk not found» when a needed part is missing. */
    private picture;
    /** The screen shows its picture when the computer is on, and the monitor too when it has its own button. */
    private screenOn;
    /** A button glows when pressing it is the next thing to do; its light ring shines once the computer is on. */
    private animateButtons;
    /** With the power on, fans spin and the monitor shows its picture. */
    private animatePower;
    /** A tap on a full spot of a basket (or a taken USB port) means the basket: the first free spot of its group. */
    private freeInGroup;
    private setPointer;
    private readonly onDown;
    private readonly onMove;
    private readonly onUp;
}
