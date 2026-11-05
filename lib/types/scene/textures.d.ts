import { CanvasTexture } from "three";
import type { BoardFace } from "./layout.ts";
export declare const BOARD_W = 24.4;
export declare const BOARD_D = 30.5;
/** The board's top: solder mask, traces, vias, silkscreen labels and outlines, the socket's triangle. */
export declare const boardTexture: (layout: BoardFace) => CanvasTexture;
/** The socket's top: a dense grid of contact holes and a printed triangle in the front-left corner. */
export declare const socketTexture: () => CanvasTexture;
/** The CPU's metal lid: model name, specs, and the gold triangle that must meet the socket's triangle. */
export declare const cpuLidTexture: () => CanvasTexture;
/** Gold contact fingers on an edge: stripes with gaps. `count` stripes across the width. */
export declare const fingersTexture: (count: number) => CanvasTexture;
/** A paper sticker with a few lines of text. */
export declare const stickerTexture: (lines: ReadonlyArray<string>, bg?: string, ink?: string) => CanvasTexture;
/** Chip marking: a dot and a line of grey text on black. */
export declare const chipTexture: (text: string) => CanvasTexture;
/** Rows of square pin holes, for power connectors. */
export declare const pinGridTexture: (cols: number, rows: number) => CanvasTexture;
/** Parallel grooves for heatsink tops. */
export declare const groovesTexture: () => CanvasTexture;
/** The round sticker in the middle of a fan: a ring and a short name. */
export declare const hubTexture: () => CanvasTexture;
/** Honeycomb vent holes, for the back of the power supply and the case's vents. */
export declare const honeycombTexture: (bg?: string) => CanvasTexture;
/** A round wire fan guard over dark slots. */
export declare const fanGrilleTexture: () => CanvasTexture;
/** A short printed tag on a cable plug: «CPU», «PCIe». */
export declare const tagTexture: (text: string, bg?: string, ink?: string) => CanvasTexture;
/** What the monitor shows once the computer is on: a calm desktop with a greeting. */
export declare const desktopTexture: () => CanvasTexture;
/** What the monitor shows when the computer starts but cannot find a disk: a black screen with a message. */
export declare const noDiskTexture: () => CanvasTexture;
/** A sign with one or two lines of large text that shrink to fit: basket labels, box labels. */
export declare const signTexture: (lines: ReadonlyArray<string>, bg: string, ink: string) => CanvasTexture;
