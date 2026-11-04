import { Group } from "three";
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
/** A part as it stands in its slot: moved there, turned, rolled, scaled, with its cable when it has one. */
export declare const placedModel: (kind: PartKind, pose: SlotPose, turn: number) => Group;
/**
 * The finished computer from the grade 8 case scenario, without the graphics card, standing upright
 * with its glass side to the right: the system unit of the grade 3–4 desk. The monitor goes into the board's HDMI.
 */
export declare const systemUnit: () => Group;
