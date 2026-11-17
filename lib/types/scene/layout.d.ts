import type { PartKind } from "../core/parts.ts";
import { type ConnectorKind, type DeviceFrame, type Port, type Vec3 } from "./ports.ts";
import { type RouteStep } from "./routes.ts";
export type { Vec3 } from "./ports.ts";
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
    /**
     * Points the cable passes on its way from the plug to where it comes from: through the grommets in the
     * board tray and behind it, so it does not cross the graphics card.
     */
    readonly via?: ReadonlyArray<Vec3>;
    /** The same, by the kind of plug, for a socket several devices may use: a USB port for the keyboard or the mouse. */
    readonly cablesFrom?: Readonly<Partial<Record<PartKind, Vec3>>>;
    /** Turn of a plug around the way it goes in, in radians: a USB plug stands upright in an upright socket. */
    readonly roll?: number;
    /** Tilt of a plug around x, in radians: π/2 lays a plug made to go in from above on its side, going in towards -z. */
    readonly pitch?: number;
    /**
     * For a plug in a port from the port map: the turn that seats it (a quaternion, x y z w), which kind of
     * connector it is (that picks the plug's model), and the middle of the click area round socket and plug.
     * A pose with `orient` ignores `yaw`, `pitch` and `roll`.
     */
    readonly orient?: readonly [number, number, number, number];
    readonly connector?: ConnectorKind;
    readonly areaAt?: Vec3;
    /**
     * The cable's way from the plug to its other end, one axis at a time (see routes.ts). It starts where the
     * cable leaves the plug straight and ends at the other plug's lead, or at `cableFrom`.
     */
    readonly route?: ReadonlyArray<RouteStep>;
    /** Shrink the placed part to fit the area, as a big device in a sorting basket. */
    /**
     * A cover over other slots (the case's side panel over the whole inside): it takes the pointer only while
     * the part in hand fits it, so on other steps it does not hide the slots under it.
     */
    readonly cover?: boolean;
    readonly fit?: boolean;
    /** Turn of the placed part around the vertical, in radians: a plug in the back of the system unit, which faces away. */
    readonly yaw?: number;
    /** Slots of one basket share a group: a tap on a full spot puts the part in a free one. */
    readonly group?: string;
}
/** The middle of a slot's click area: given for a port, otherwise standing on the slot's point. */
export declare const zoneCentre: (pose: SlotPose) => Vec3;
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
    /** The desk top's width and depth, when the exercise needs more room than the usual desk. */
    readonly desk?: readonly [number, number];
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
/** Our board in its own coordinates: where its connectors are, x and z. */
export declare const BOARD_CONNECTORS: {
    readonly pcieX16: readonly [-3.3, 2.9];
    readonly pcieX1: readonly [-6.6, 5];
};
/** The board's mounting holes, x and z: the case has a brass standoff under each. */
export declare const BOARD_HOLES: ReadonlyArray<readonly [number, number]>;
export declare const REAR_FACE_X: number;
export declare const REAR_PORTS: {
    readonly usb1: readonly [number, number];
    readonly usb2: readonly [number, number];
    readonly hdmi: readonly [number, number];
    readonly lan: readonly [-1.3, 2.6];
    readonly usb3: readonly [number, number];
    readonly usb4: readonly [number, number];
};
export declare const GRADE8_BOARD: BoardFace;
/**
 * The slot of a port from the port map, wherever its device stands: the plug's place and turn, the click area
 * round socket and plug, and a look at it from the side the plug comes from.
 */
export declare const portSlot: (port: Port, frame: DeviceFrame, extra?: Partial<SlotPose>) => SlotPose;
/** Layout of the grade 8 desk scenario: the bare board on the mat. */
export declare const grade8DeskLayout: SceneLayout;
/**
 * The case lies on its side with the open side up, its back towards the student, so the ports on
 * the back are in view. Case coordinates: x from the case's top (-x) to its bottom (+x), z from the
 * front (-z) to the back (+z), y up from the desk. The inside of the side wall the board stands on is at y = CASE_FLOOR.
 */
export declare const CASE_SIZE: Vec3;
export declare const CASE_FLOOR = 1;
/**
 * Where our board's centre lands in the case, and its quarter turn there (3: the rear panel faces the back).
 * Its ports reach into the I/O shield in the case's back wall, as on a real build, and its graphics card's
 * bracket comes up to the slot covers.
 */
/**
 * How far the board sits towards the back past where its graphics card's bracket would put it: the realistic
 * board's rear ports then come out flush with the outside of the case's back wall (z 22.06) instead of sinking
 * 3 mm behind it. The card keeps its place at the slot covers (see GPU_AT).
 */
export declare const IO_REACH = 0.3;
export declare const BOARD_IN_CASE: Vec3;
export declare const BOARD_TURN_IN_CASE = 3;
/** A point on our board (board coordinates) in case coordinates, once the board is in the case. */
export declare const onBoard: (x: number, y: number, z: number) => Vec3;
/** Where each device stands in the case: its ports go with it (see ports.ts). */
export declare const CASE_FRAMES: {
    readonly board: DeviceFrame;
    readonly psu: DeviceFrame;
    readonly hdd: DeviceFrame;
    readonly gpu: DeviceFrame;
};
export declare const grade8CaseLayout: SceneLayout;
/** Where the power supply's socket face is, along z in the case. */
export declare const PSU_FACE_IN_CASE: number;
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
