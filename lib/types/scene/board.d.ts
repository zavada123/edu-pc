import { type Group } from "three";
import type { Slot } from "../core/scenario.ts";
import { type BoardFace } from "./layout.ts";
type Poses = Readonly<Record<string, {
    readonly at: readonly [number, number, number];
}>>;
/**
 * The motherboard with its sockets and slots: the real board's model once it is loaded, otherwise one
 * built from the scenario's slots and where they are on the board.
 */
export declare const buildBoard: (face: BoardFace, slots: ReadonlyArray<Slot>, poses: Poses) => Group;
/** The socket lever: a metal bar along the socket's right side, pivoting at its front end. */
export declare const buildLever: (length: number) => Group;
/** The desk and the antistatic mat under the board. */
/** The desk top's size, width and depth, when the layout does not ask for a bigger one. */
export declare const DESK_SIZE: readonly [number, number];
export declare const buildDesk: (size?: readonly [number, number]) => Group;
export {};
