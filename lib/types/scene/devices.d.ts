import { type Group, type Material } from "three";
/** A power supply: 8.6 × 15 × 14 cm. Its back (+z) has the mains socket and switch; its fan faces +x. */
export declare const powerSupply: () => Group;
/**
 * A graphics card standing on its edge: the board in the y–z plane, the cooler with two fans on +x,
 * the bracket with the ports at +z. Its origin is the bottom of the gold contacts.
 */
export declare const graphicsCard: () => Group;
/** A 3.5-inch hard disk lying flat: 10.2 × 2.6 × 14.7 cm, its connectors on the back end (+z). */
export declare const hardDisk: () => Group;
/** The 24-pin plug for the board: wide, with a latch, going into its socket from above. */
export declare const atxPlug: () => Group;
/** An 8-pin power plug for the processor or the graphics card. They look alike; only the tag differs. */
export declare const eightPinPlug: (tag: "CPU" | "PCIe") => Group;
/** The flat L-shaped SATA power plug: it goes into the back of the disk, horizontally. */
export declare const sataPowerPlug: () => Group;
/** The small red SATA data plug: it goes into the board's SATA port from above. */
export declare const sataDataPlug: () => Group;
/**
 * The plug of a removable cable at the power supply's end: an 8-pin block going +z into a red socket on the
 * supply, its cable leaving towards -z, into the case.
 */
export declare const psuPlug: () => Group;
/** The thin plugs of the case's front panel: they go into the board's headers from above. */
export declare const headerPlug: (kind: "panel" | "audio" | "usb") => Group;
/** An HDMI plug, pointing -z into the socket. */
export declare const hdmiPlug: () => Group;
/** A USB plug, pointing -z into the socket; grey for the keyboard, black for the mouse. */
export declare const usbPlug: (body: Material) => Group;
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
