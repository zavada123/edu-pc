import { Matrix4, Quaternion, Vector3 } from "three";
/**
 * The port map: every socket a cable plugs into, on every device, in that device's own coordinates.
 *
 * Each position here is measured on the realistic model of the part (`public/models/*.glb`): the pins and
 * plastic housings found in the model's geometry, to a tenth of a millimetre. The code-built models (the
 * «Проста» graphics) draw their sockets from this same map, so a plug sits the same way at every quality.
 *
 * A port knows where its face is, which way a plug moves going in and which way its long side runs. Where it
 * ends up in the scene is worked out from where its device stands (`portPose`): nothing is typed in twice.
 */
export type Vec3 = readonly [number, number, number];
/** The kinds of connectors, each with its own plug. */
export type ConnectorKind = "atx24" | "eps8" | "pcie8" | "fan4" | "fPanel" | "hdAudio" | "usb3Header" | "sataData" | "sataPower" | "psu8" | "psu6" | "usbA" | "hdmi";
export interface Port {
    readonly kind: ConnectorKind;
    /** What the port is called, in Ukrainian, as the tags and the pointer note say it. */
    readonly name: string;
    /** The middle of the face a plug sits on once it is all the way in. */
    readonly at: Vec3;
    /** The way a plug moves when it goes in: down into the board, sideways into a right-angled header. */
    readonly insert: Vec3;
    /**
     * The way the connector's long side runs. A plug's latch or key is on the side `along × -insert`, so this
     * also says which way round the plug goes.
     */
    readonly along: Vec3;
    /** Size of the socket's body on the device: along its long side, across it, and how deep a plug goes in. */
    readonly housing: Vec3;
}
/** How a plug of each kind is built: its size, and how far its cable runs straight out of it before it may bend. */
export interface PlugSpec {
    /** Along the long side, across it, and its height from the face it sits on to where the cable leaves. */
    readonly size: Vec3;
    /** How far the cable leaves the plug straight, along the way the plug went in. */
    readonly lead: number;
    /** Cable radius and colour. */
    readonly cable: {
        readonly r: number;
        readonly color: string;
    };
}
export declare const PLUGS: Readonly<Record<ConnectorKind, PlugSpec>>;
export declare const BOARD_PORTS: {
    readonly atx24: Port;
    readonly eps8: Port;
    readonly cpuFan: Port;
    readonly cpuOpt: Port;
    readonly chaFan1: Port;
    readonly chaFan2: Port;
    readonly fPanel: Port;
    readonly hdAudio: Port;
    readonly usb3Header: {
        readonly kind: "usb3Header";
        readonly name: "Роз'єм USB 3.0 для корпусу";
        readonly at: readonly [12.14, 0.53, 5.34];
        readonly insert: readonly [-1, 0, 0];
        readonly along: readonly [0, 0, 1];
        readonly housing: readonly [2.39, 0.67, 0.98];
    };
    readonly sata1: Port;
    readonly sata2: Port;
    readonly sata3: Port;
    readonly sata4: Port;
    readonly sata5: Port;
    readonly sata6: Port;
    readonly usb2Low: Port;
    readonly usb2High: Port;
    readonly usb3Low: Port;
    readonly usb3High: Port;
    readonly hdmi: Port;
};
export declare const GPU_PORTS: {
    readonly power1: {
        readonly kind: "pcie8";
        readonly name: "Роз'єм живлення відеокарти (8 контактів)";
        readonly at: readonly [0.215, 10.56, -11.66];
        readonly insert: Vec3;
        readonly along: readonly [0, 0, 1];
        readonly housing: readonly [1.4, 0.67, 0.76];
    };
    readonly power2: {
        readonly kind: "pcie8";
        readonly name: "Роз'єм живлення відеокарти (8 контактів)";
        readonly at: readonly [0.215, 10.56, -13.24];
        readonly insert: Vec3;
        readonly along: readonly [0, 0, 1];
        readonly housing: readonly [1.4, 0.67, 0.76];
    };
    readonly hdmi: {
        readonly kind: "hdmi";
        readonly name: "Роз'єм HDMI на відеокарті";
        readonly at: readonly [0.195, 4.64, 9.11];
        readonly insert: readonly [0, 0, -1];
        readonly along: readonly [0, 1, 0];
        readonly housing: readonly [1.02, 0.41, 0.3];
    };
};
/** The ports on the card's bracket, top to bottom, in its own coordinates (y of each middle). */
export declare const GPU_BRACKET_PORTS_Y: readonly [7.74, 6.21, 4.64, 3.11];
export declare const HDD_PORTS: {
    readonly power: {
        readonly kind: "sataPower";
        readonly name: "Роз'єм живлення SATA на диску";
        readonly at: readonly [-2.415, 0.35, 7.39];
        readonly insert: readonly [0, 0, -1];
        readonly along: readonly [1, 0, 0];
        readonly housing: readonly [3.85, 0.56, 0.6];
    };
    readonly data: {
        readonly kind: "sataData";
        readonly name: "Роз'єм даних SATA на диску";
        readonly at: readonly [0.335, 0.35, 7.39];
        readonly insert: readonly [0, 0, -1];
        readonly along: readonly [1, 0, 0];
        readonly housing: readonly [1.33, 0.56, 0.6];
    };
};
/**
 * The face of the power supply with the sockets for removable cables (-z, towards the inside of the case),
 * and the hole the built-in cables (board and processor) come out of. Our own panel of sockets goes on that face
 * (see `psuPanel` in devices.ts): two HDD/SATA sockets above, two PCI-E sockets below.
 */
export declare const PSU_FACE_Z = -7.75;
export declare const PSU_HOLE: Vec3;
export declare const PSU_SOCKET_X: readonly [-1.4, 1.4];
export declare const PSU_SOCKET_Y: {
    readonly sata: 12.4;
    readonly pcie: 8.9;
};
export declare const PSU_PORTS: {
    readonly pcie1: Port;
    readonly pcie2: Port;
    readonly sata1: Port;
    readonly sata2: Port;
};
/** Where a device stands: its origin, and its turn as a slot pose gives it (see `posed` in models.ts). */
export interface DeviceFrame {
    readonly matrix: Matrix4;
}
/** The frame of a part placed the way `posed` places it: at `at`, turned by quarter turns, yaw, pitch and roll. */
export declare const frameOf: (at: Vec3, turn?: number, yaw?: number, pitch?: number, roll?: number) => DeviceFrame;
/** A frame inside another one: a device in a case, the case standing on the desk. */
export declare const within: (outer: DeviceFrame, inner: DeviceFrame) => DeviceFrame;
export declare const IDENTITY: DeviceFrame;
/** A port where it ends up: its face, the way in, its long side and the turn a plug must take to sit in it. */
export interface PortPose {
    readonly at: Vector3;
    readonly insert: Vector3;
    readonly along: Vector3;
    /** Turns a plug built standing up (going in along -y, long side along x) to sit in this port. */
    readonly orient: Quaternion;
}
export declare const portPose: (port: Port, frame: DeviceFrame) => PortPose;
/** The box round a port and its plug, in the frame's axes: what the student clicks and what lights up. */
export declare const portZone: (port: Port, pose: PortPose) => {
    centre: Vector3;
    size: Vector3;
};
