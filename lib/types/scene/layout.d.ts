import type { PartKind } from "../core/parts.ts";
/** Board coordinates are centimetres: x to the right, z towards the student, y up from the desk. */
export type Vec3 = readonly [number, number, number];
/** Where a part stands once it is placed in a slot, and the click area around the slot. */
export interface SlotPose {
    /** Bottom centre of the placed part; for a plug, the middle of its tip. */
    readonly at: Vec3;
    /** Size of the click area (and the highlight box) around the slot. */
    readonly area: Vec3;
    /** Where the camera looks at this slot from, as a direction. Leave out for «from the front and above». */
    readonly view?: Vec3;
    /** For a cable plug: the point the cable comes from (the power supply, the disk). A tube joins them. */
    readonly cableFrom?: Vec3;
    /** The same, by the kind of plug, for a socket several devices may use: a USB port for the keyboard or the mouse. */
    readonly cablesFrom?: Readonly<Partial<Record<PartKind, Vec3>>>;
    /** Turn of a plug around the way it goes in, in radians: a USB plug stands upright in an upright socket. */
    readonly roll?: number;
    /** Shrink the placed part to fit the area, as a big device in a sorting basket. */
    readonly fit?: boolean;
    /** Turn of the placed part around the vertical, in radians: a plug in the back of the system unit, which faces away. */
    readonly yaw?: number;
    /** Slots of one basket share a group: a tap on a full spot puts the part in a free one. */
    readonly group?: string;
}
/** The socket lever: its pivot, and which value means «up». */
export interface LeverPose {
    readonly control: string;
    readonly pivot: Vec3;
    readonly length: number;
    readonly upValue: string;
}
/**
 * A button on the case that switches a control, such as the power button. `normal` is the way the
 * button's face looks, so the camera knows where to look at it from.
 */
export interface ButtonPose {
    readonly control: string;
    readonly at: Vec3;
    readonly normal: Vec3;
    /** Size of the button against the case's one: the monitor's button is smaller. */
    readonly size?: number;
    /** A slot that must hold a part for the button to be there: the monitor's button comes with the monitor. */
    readonly when?: string;
}
/** A sorting basket on the desk, with its sign. */
export interface CratePose {
    readonly at: Vec3;
    readonly label: ReadonlyArray<string>;
    readonly colour: string;
}
/** A closed box with a part inside; clicking it opens it (inspects the part), and the part stands there until it is taken. */
export interface BoxPose {
    readonly part: string;
    readonly at: Vec3;
}
/**
 * A part lying loose on the desk until it is taken or placed, so the student sees what there is to build with.
 * `at` is where its lowest point rests: 0 on the mat, DESK_TOP beside it.
 */
export interface LoosePose {
    readonly part: string;
    readonly at: Vec3;
    /** Turn around the vertical axis, in radians. */
    readonly yaw?: number;
    /** Laid on its side: a memory module lies flat instead of standing on its edge. */
    readonly flat?: boolean;
}
/** A device standing on the desk for the whole exercise: the monitor, the keyboard, the mouse. */
export interface PropPose {
    readonly kind: "monitor" | "keyboard" | "mouse" | "smartphone" | "powerStrip";
    readonly at: Vec3;
    /** Turn around the vertical axis, in radians. */
    readonly yaw?: number;
}
/** Labels printed on the board, next to what they name. */
export interface Silkscreen {
    readonly text: string;
    readonly at: readonly [number, number];
    readonly size?: number;
}
/** What is printed on our board and where its socket is: the same board in every scenario. */
export interface BoardFace {
    readonly labels: ReadonlyArray<Silkscreen>;
    /** Centre of the CPU socket on the board, x and z. */
    readonly socket: readonly [number, number];
}
/** How a scenario looks in 3D: what lies on the desk, where each of its slots and controls is. */
export interface SceneLayout {
    /** What the student builds on: the bare board on the desk, or the open case lying on its side. */
    readonly bench: "board" | "case" | "tower";
    readonly slots: Readonly<Record<string, SlotPose>>;
    readonly lever?: LeverPose;
    readonly buttons?: ReadonlyArray<ButtonPose>;
    /** The part that is the bench itself (the board, the case): clicking the bench inspects it. */
    readonly benchPart?: string;
    /** How high above the desk a part in hand floats. Above the case walls when building in the case. */
    readonly holdHeight?: number;
    /** Camera distance for a look at the whole bench. */
    readonly overview?: number;
    /** The control that switches the computer on: fans spin and the monitor lights up when it has this value. */
    readonly power?: {
        readonly control: string;
        readonly on: string;
        /** The monitor's own button, when it has one: the screen lights only when this is on too. */
        readonly screen?: {
            readonly control: string;
            readonly on: string;
        };
        /** Other controls the computer needs to get power at all: the power strip's switch. */
        readonly requires?: Readonly<Record<string, string>>;
        /**
         * Slots that must hold a part for a working picture, and what the screen shows without it:
         * nothing (no CPU power, the monitor on the wrong socket) or a «disk not found» message.
         */
        readonly needs?: ReadonlyArray<{
            readonly slot: string;
            readonly screen: "dark" | "noDisk";
        }>;
    };
    readonly props?: ReadonlyArray<PropPose>;
    /** Markers of a data path, by stop id: the USB port, the RAM, the processor. */
    readonly stops?: Readonly<Record<string, Vec3>>;
    readonly crates?: ReadonlyArray<CratePose>;
    readonly boxes?: ReadonlyArray<BoxPose>;
    readonly loose?: ReadonlyArray<LoosePose>;
    /** Where the camera goes once the exercise is done, to show the result: the lit monitor. */
    readonly finale?: {
        readonly at: Vec3;
        readonly distance: number;
        readonly view: Vec3;
    };
}
export declare const BOARD_TOP = 0.16;
/** Height of the bare desk top beside the mat, in bench coordinates: the mat lies a little higher. */
export declare const DESK_TOP = -0.05;
export declare const DIMM_LENGTH = 13.3;
/** Where the key in a RAM slot sits, along the slot from its centre. A module fits only with its notch here. */
export declare const DIMM_KEY = 1.3;
/** Our board (roughly ATX) in its own coordinates: where its connectors are, x and z. */
export declare const BOARD_CONNECTORS: {
    readonly atx24: readonly [14.2, -3];
    readonly eps8: readonly [-10.9, -10.75];
    readonly sata: readonly [13.9, 7.2];
    readonly pcieX16: readonly [-6.5, 8.8];
    readonly pcieX1: readonly [-8.5, 11];
};
/**
 * The outer face of the rear panel on the board, along x, and the middle of each port: z along the panel
 * and y above the board. As on a real board, a port's long side points away from the board (along y).
 */
export declare const REAR_FACE_X = -15.45;
export declare const REAR_PORTS: {
    readonly usb1: readonly [-10.8, 0.95];
    readonly usb2: readonly [-10.8, 2.55];
    readonly hdmi: readonly [-8.4, 0.95];
    readonly lan: readonly [-8.4, 2.6];
    readonly usb3: readonly [-6, 0.95];
    readonly usb4: readonly [-6, 2.55];
};
export declare const GRADE8_BOARD: BoardFace;
/** Layout of the grade 8 desk scenario (a board of our own design, roughly ATX-sized). */
export declare const grade8DeskLayout: SceneLayout;
/**
 * The case lies on its side with the open side up, its back towards the student, so the ports on
 * the back are in view. Case coordinates: x from the case's top (-x) to its bottom (+x), z from the
 * front (-z) to the back (+z), y up from the desk. The inside of the side wall the board stands on is at y = CASE_FLOOR.
 */
export declare const CASE_SIZE: Vec3;
export declare const CASE_FLOOR = 1;
/** Where our board's centre lands in the case, and its quarter turn there (3: the rear panel faces the back). */
export declare const BOARD_IN_CASE: Vec3;
export declare const BOARD_TURN_IN_CASE = 3;
/** A point on our board (board coordinates) in case coordinates, once the board is in the case. */
export declare const onBoard: (x: number, y: number, z: number) => Vec3;
/** Where the graphics card's own connectors end up: power on its top edge, HDMI on its bracket. */
export declare const GPU_POWER_LOCAL: Vec3;
export declare const GPU_HDMI_LOCAL: Vec3;
/** The disk's connectors on its back end: data and power. */
export declare const HDD_DATA_LOCAL: Vec3;
export declare const HDD_POWER_LOCAL: Vec3;
export declare const grade8CaseLayout: SceneLayout;
/** The case scenario's computer, built and switched on, with markers for the data path and a smartphone on the desk. */
export declare const grade8LabLayout: SceneLayout;
/**
 * The finished computer from the grade 8 case scenario stands upright at the right of the desk, its front
 * towards the student, its back (with the ports) towards the wall and its glass side towards the monitor.
 * A point in that case's coordinates, once the case stands: its top (-x) goes up, its open side (+y) to the
 * left, its front (-z) towards the student.
 */
export declare const TOWER_AT: Vec3;
export declare const standing: (v: Vec3) => Vec3;
export declare const grade3DeskLayout: SceneLayout;
/** The grade 8 case, built: the picture needs the monitor on the graphics card and power to the processor; the files need the disk's cable. */
export declare const grade8FaultLayout: SceneLayout;
/** The grade 3–4 desk, set up, with a power strip: no strip, no power; no monitor cable, no picture. */
export declare const grade3FaultLayout: SceneLayout;
/** Layouts by scenario id. */
export declare const layouts: Readonly<Record<string, SceneLayout>>;
