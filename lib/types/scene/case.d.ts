import { Group } from "three";
/** A case fan `s` cm across lying in the x–z plane, blowing along y; turn it to face where it should. */
export declare const caseFan: (s?: number) => Group;
export declare const buildCase: () => Group;
/**
 * The power button: a round button with a light ring. Its face points along -x (the case's top);
 * the scene places it, makes it glow as a hint and lights the ring once the computer is on.
 */
export declare const powerButton: () => Group;
/**
 * The rubber grommets in the board tray that cables go through (see routes.ts). The case's model has the long
 * ones in front of the board itself: on it only the others are drawn, on its tray (`atY`).
 */
export declare const trayGrommets: (atY: number, onModel: boolean) => Group;
