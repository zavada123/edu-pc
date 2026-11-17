import { Vector3 } from "three";
import type { Vec3 } from "./ports.ts";
/**
 * Where every cable runs inside the case: one fixed way for each, the way a tidy builder lays it.
 *
 * A route is a list of steps, each along one axis only: to a given x, y or z, or to the other end's (`"end"`).
 * It starts where the cable has left its plug straight (the plug's lead) and ends at the lead of the plug on its
 * other end, or at the point the cable comes from (the hole in the power supply, the fan). So a cable never runs
 * at a slant, and where it goes behind the board tray it goes through a grommet. The tests check every route.
 *
 * Case coordinates: x from the case's top (-x) to its bottom (+x), y up from the side wall the board stands on,
 * z from the front (-z) to the back (+z).
 *
 * The tray, as measured on the case's model: flat at y 1.6 under the board; in front of the board it rises in a
 * slope with two long rubber grommets in it to a flat step at y 3; at the bottom (x > 11.36) it ends, and the
 * power supply and the disk stand in an open bay below it. Behind the tray, down to the side wall (y 0.25), the
 * cables are out of sight.
 */
export type Axis = "x" | "y" | "z";
export type RouteStep = readonly [Axis, number | "end"];
/** The tray's face under the board, and its underside. */
export declare const TRAY_Y = 1.6;
export declare const TRAY_UNDER_Y = 1.46;
/** The side wall's inner face: the floor of the space behind the tray. */
export declare const SIDE_WALL_Y = 0.25;
/** The slope in front of the board, from its foot at the board's edge to its top at the step. */
export declare const SLOPE: {
    readonly footZ: -1.54;
    readonly footY: 1.5;
    readonly topZ: -4.71;
    readonly topY: 3.04;
};
/** The step in front of the slope: its face, and its underside. */
export declare const STEP_Y = 3.03;
export declare const STEP_UNDER_Y = 2.89;
/** Where the tray ends at the bottom of the case: past it is the open bay of the power supply and the disk. */
export declare const TRAY_END_X = 11.36;
/** How high the tray's face is at (x, z), or null in the open bay. */
export declare const trayTop: (x: number, z: number) => number | null;
/** A hole in the tray with a rubber grommet: x and z of its corners. Cables pass the tray only through these. */
export interface Grommet {
    readonly id: string;
    readonly x: readonly [number, number];
    readonly z: readonly [number, number];
    /** Only the code-built case needs it drawn: the case's model has its own. */
    readonly modelHasIt: boolean;
}
export declare const GROMMETS: ReadonlyArray<Grommet>;
/** The rear case fan, inside the back wall: its middle, its size, and where its cable leaves the frame. */
export declare const REAR_FAN: {
    at: Vec3;
    size: number;
    cableOut: Vec3;
};
/**
 * The heights cables run at behind the tray. Low enough to pass under the disk in the open bay (its bottom is
 * at y 1); the thin front panel wires run higher where they cross the others.
 */
export declare const BEHIND_Y = 0.63;
/** Where the front panel's wires (buttons, audio, USB) come from: behind the tray at the front top corner, side by side. */
export declare const FRONT_IO: {
    readonly panel: Vec3;
    readonly audio: Vec3;
    readonly usb3: Vec3;
};
/**
 * Behind the slope the power cables run along x side by side, each in its own lane: the one nearest the board
 * turns off first in the bay, so none crosses another.
 */
export declare const FRONT_LANE_Z: {
    readonly atx: -3.2;
    readonly sata: -4.21;
    readonly pcie: -4.95;
    readonly usb3: -2.6;
};
/** Runs a route from `from`, filling `"end"` with the coordinate of `end`. Returns the corners, `from` not included. */
export declare const runRoute: (from: Vector3, steps: ReadonlyArray<RouteStep>, end: Vector3) => Vector3[];
/**
 * The cable routes inside the case, by the slot of the plug the cable is drawn from. Each starts at that plug's
 * lead (the plug's straight way out) and ends at the other end's lead or at the point the cable comes from.
 */
export declare const ROUTES: Readonly<Record<string, ReadonlyArray<RouteStep>>>;
/** The cooler's fan wire on the desk board, in board coordinates: from the CPU_FAN header up the cooler's side. */
export declare const COOLER_FAN_CABLE: Vec3;
export declare const COOLER_ROUTE: ReadonlyArray<RouteStep>;
