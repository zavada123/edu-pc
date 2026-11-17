import { Box3, Group, Vector3 } from "three";
import type { PartKind } from "../core/parts.ts";
import { type SlotPose } from "./layout.ts";
import { type ConnectorKind } from "./ports.ts";
import { type RouteStep } from "./routes.ts";
/** The board as the grade 8 students leave the desk: CPU, cooler and its cable, two RAM modules, the SSD. */
export declare const assembledBoard: () => Group;
/** Kinds with a model of their own; the rest get a plain box for now. */
export declare const MODELLED: ReadonlySet<PartKind>;
/**
 * The model of a part in the scene. `placed` is its look once installed. A device's cable
 * (monitorCable, keyboardCable, mouseCable) is its plug: that is what the student holds and plugs in.
 */
export declare const buildModel: (kind: PartKind, placed: boolean) => Group;
/** The connector each cable's plug is, wherever it goes: a slot from the port map may say a closer one (a 6-pin socket). */
export declare const PLUG_OF: Partial<Record<PartKind, ConnectorKind>>;
export type DeviceKind = "monitor" | "keyboard" | "mouse" | "speakers" | "printer" | "flashDrive" | "smartphone" | "powerStrip";
/** The device itself, for desk props, baskets and tray pictures. */
export declare const deviceModel: (kind: DeviceKind) => Group;
/** The picture in the tray: the device for a device's cable, otherwise the part as held. */
export declare const iconModel: (kind: PartKind) => Group;
/** Where a plug's cable leaves it, and the end of its straight lead, in the plug's parent's coordinates. */
export interface CableEnd {
    readonly start: Vector3;
    readonly lead: Vector3;
}
/**
 * A neat lane between two points inside the case: level at the height of the higher one, along one axis
 * and then the other. Only for a cable whose ends have no route of their own (a plug hanging loose).
 * The first leg never goes back the way `from` came.
 */
export declare const laneBetween: (from: Vector3, to: Vector3, came: Vector3) => Vector3[];
/** A polyline with every corner cut round: a curve through it runs straight and bends only at the corners. */
export declare const roundCorners: (points: ReadonlyArray<Vector3>, bend: number) => Vector3[];
/**
 * The corners a cable passes, from where it leaves the plug to its other end: straight out of the plug, then
 * its route (see routes.ts), then straight into the plug on its other end, or to the point it comes from.
 * Without a route (a plug hanging loose) it takes a plain lane there.
 */
export declare const cablePath: (end: CableEnd, route: ReadonlyArray<RouteStep> | undefined, target: Vector3, other: CableEnd | null) => Vector3[];
/** Where the cable leaves a plug standing in a slot: for drawing a cable that ends in it. */
export declare const plugEnd: (kind: PartKind, pose: SlotPose, turn: number) => CableEnd | null;
/**
 * A part as it stands in its slot: moved there, turned, scaled, with its cable when it has one.
 * `cable`: "own" draws the cable to where the pose says it comes from; a cable end draws it to the plug on
 * the cable's other end; "none" draws no cable (the other end's cable is drawn with that end).
 */
export declare const placedModel: (kind: PartKind, pose: SlotPose, turn: number, cable?: CableEnd | "own" | "none") => Group;
/**
 * The finished computer from the grade 8 case scenario, without the graphics card, standing upright
 * with its front to the student (see `standing`): the system unit of the grade 3–4 desk. The monitor goes into the board's HDMI.
 */
export declare const systemUnit: () => Group;
/** A part of the solved grade 8 case: where it stands, and how its cable is drawn (see `placedModel`). */
export interface SolvedPart {
    readonly slot: string;
    readonly part: string;
    readonly kind: PartKind;
    readonly pose: SlotPose;
    readonly turn: number;
    readonly cable: CableEnd | "own" | "none";
}
/**
 * Every part of the grade 8 case scenario in its place, as the scene draws it once all are in: a cable with
 * two plugs is drawn once, from its first end to the plug on its second.
 */
export declare const solvedCase: () => SolvedPart[];
/** The corners of a placed part's cable, as `placedModel` draws it before rounding them: for checking routes. */
export declare const cableCorners: (p: SolvedPart) => Vector3[] | null;
/** The box a placed part's plug takes, in its parent's coordinates: other cables keep off it. */
export declare const plugBox: (p: SolvedPart) => Box3 | null;
