import { Group, Vector3 } from "three";
import type { PartKind } from "../core/parts.ts";
import { type SlotPose } from "./layout.ts";
/** The board as the grade 8 students leave the desk: CPU, cooler and its cable, two RAM modules, the SSD. */
export declare const assembledBoard: () => Group;
/** Kinds with a model of their own; the rest get a plain box for now. */
export declare const MODELLED: ReadonlySet<PartKind>;
/**
 * The model of a part in the scene. `placed` is its look once installed. A device's cable
 * (monitorCable, keyboardCable, mouseCable) is its plug: that is what the student holds and plugs in.
 */
export declare const buildModel: (kind: PartKind, placed: boolean) => Group;
export type DeviceKind = "monitor" | "keyboard" | "mouse" | "speakers" | "printer" | "flashDrive" | "smartphone" | "powerStrip";
/** The device itself, for desk props, baskets and tray pictures. */
export declare const deviceModel: (kind: DeviceKind) => Group;
/** The picture in the tray: the device for a device's cable, otherwise the part as held. */
export declare const iconModel: (kind: PartKind) => Group;
/** Where a plug's cable leaves it, and a point a little further along, in the plug's parent's coordinates. */
export interface CableEnd {
    readonly start: Vector3;
    readonly lead: Vector3;
}
/**
 * A neat lane between two points inside the case: level at the height of the higher one, along one axis
 * and then the other, the way a tidy builder lays a cable. The first leg never goes back the way `from` came.
 */
export declare const laneBetween: (from: Vector3, to: Vector3, came: Vector3) => Vector3[];
/** A polyline with every corner cut round: a curve through it runs straight and bends only at the corners. */
export declare const roundCorners: (points: ReadonlyArray<Vector3>, bend: number) => Vector3[];
/** Where the cable leaves a plug standing in a slot: for drawing a cable that ends in it. */
export declare const plugEnd: (kind: PartKind, pose: SlotPose, turn: number) => CableEnd | null;
/**
 * A part as it stands in its slot: moved there, turned, rolled, scaled, with its cable when it has one.
 * `cable`: "own" draws the cable to where the pose says it comes from; a cable end draws it to the plug on
 * the cable's other end; "none" draws no cable (the other end's cable is drawn with that end).
 */
export declare const placedModel: (kind: PartKind, pose: SlotPose, turn: number, cable?: CableEnd | "own" | "none") => Group;
/**
 * The finished computer from the grade 8 case scenario, without the graphics card, standing upright
 * with its front to the student (see `standing`): the system unit of the grade 3–4 desk. The monitor goes into the board's HDMI.
 */
export declare const systemUnit: () => Group;
