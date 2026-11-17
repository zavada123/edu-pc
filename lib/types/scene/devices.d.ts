import { type Group, type Material } from "three";
import { type ConnectorKind } from "./ports.ts";
/**
 * A power supply: 8.6 × 15 × 15.2 cm. Its back (+z) has the mains socket and switch; its fan faces +x; its
 * front (-z) faces the inside of the case and carries the panel of sockets (`psuPanel`).
 */
export declare const powerSupply: () => Group;
/**
 * The panel of sockets on the power supply's front (-z): two HDD/SATA sockets and two PCI-E sockets, each a
 * red housing sunk into the panel with its pin holes, a clear printed name over each pair, and the round
 * grommet the built-in cables come out of. It goes on the realistic power supply too, over its blurred picture
 * of sockets, so the sockets are where the port map says. The names read the right way from inside the case.
 */
export declare const psuPanel: () => Group;
/**
 * A graphics card standing on its edge: the board in the y–z plane, the cooler with two fans on +x,
 * the bracket with the ports at +z. Its origin is the bottom of the gold contacts.
 */
export declare const graphicsCard: () => Group;
/** A 3.5-inch hard disk lying flat, label up: 10.2 × 2.1 × 14.7 cm, its connectors low on the back end (+z). */
export declare const hardDisk: () => Group;
/** A plug of the given connector kind, standing up as described above. */
export declare const plugModel: (kind: ConnectorKind, grip?: Material) => Group;
/** The tempered glass side panel with its dark painted border and four thumbscrews. */
export declare const sidePanel: () => Group;
/** A monitor facing +z. Its screen is dark until the computer is on; the scene finds it by `screen`. */
export declare const monitor: () => Group;
/** A keyboard: a dark base with rows of keys. */
export declare const keyboard: () => Group;
/** A mouse: a rounded body with two buttons and a wheel. */
export declare const mouse: () => Group;
/** A pair of desk speakers facing +z, with a woofer and a tweeter each. */
export declare const speakers: () => Group;
/** An inkjet printer: a light body, a paper tray at the back and a sheet coming out at the front. */
export declare const printer: () => Group;
/** A USB flash drive: a small blue body with a metal tip. */
export declare const flashDrive: () => Group;
/** A smartphone lying on its back, screen up: the photos come from it. */
export declare const smartphone: () => Group;
/** A power strip on the desk with its switch; the computer gets power only when it is on. */
export declare const powerStrip: () => Group;
/** An open crate for sorting devices, with a coloured sign on its front. */
export declare const crate: (label: ReadonlyArray<string>, colour: string) => Group;
/** A closed cardboard box with the device's name on it. */
export declare const cardboardBox: (name: string) => Group;
