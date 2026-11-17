import { Euler, Matrix4, Quaternion, Vector3 } from "three"

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

export type Vec3 = readonly [number, number, number]

/** The kinds of connectors, each with its own plug. */
export type ConnectorKind =
  | "atx24"
  | "eps8"
  | "pcie8"
  | "fan4"
  | "fPanel"
  | "hdAudio"
  | "usb3Header"
  | "sataData"
  | "sataPower"
  | "psu8"
  | "psu6"
  | "usbA"
  | "hdmi"

export interface Port {
  readonly kind: ConnectorKind
  /** What the port is called, in Ukrainian, as the tags and the pointer note say it. */
  readonly name: string
  /** The middle of the face a plug sits on once it is all the way in. */
  readonly at: Vec3
  /** The way a plug moves when it goes in: down into the board, sideways into a right-angled header. */
  readonly insert: Vec3
  /**
   * The way the connector's long side runs. A plug's latch or key is on the side `along × -insert`, so this
   * also says which way round the plug goes.
   */
  readonly along: Vec3
  /** Size of the socket's body on the device: along its long side, across it, and how deep a plug goes in. */
  readonly housing: Vec3
}

/** How a plug of each kind is built: its size, and how far its cable runs straight out of it before it may bend. */
export interface PlugSpec {
  /** Along the long side, across it, and its height from the face it sits on to where the cable leaves. */
  readonly size: Vec3
  /** How far the cable leaves the plug straight, along the way the plug went in. */
  readonly lead: number
  /** Cable radius and colour. */
  readonly cable: { readonly r: number; readonly color: string }
}

export const PLUGS: Readonly<Record<ConnectorKind, PlugSpec>> = {
  atx24: { size: [5.36, 0.98, 1.5], lead: 1.3, cable: { r: 0.34, color: "#141518" } },
  eps8: { size: [1.82, 0.9, 1.4], lead: 1.1, cable: { r: 0.2, color: "#141518" } },
  pcie8: { size: [1.44, 0.72, 1.3], lead: 1.1, cable: { r: 0.2, color: "#141518" } },
  fan4: { size: [1.0, 0.56, 0.7], lead: 0.6, cable: { r: 0.08, color: "#141518" } },
  fPanel: { size: [2.6, 0.62, 0.85], lead: 0.8, cable: { r: 0.11, color: "#2b2d31" } },
  hdAudio: { size: [1.32, 0.62, 0.85], lead: 0.8, cable: { r: 0.11, color: "#141518" } },
  usb3Header: { size: [2.42, 1.0, 1.1], lead: 0.7, cable: { r: 0.18, color: "#1d3f8f" } },
  sataData: { size: [1.3, 0.62, 0.95], lead: 0.6, cable: { r: 0.09, color: "#c0392b" } },
  sataPower: { size: [3.9, 0.62, 1.05], lead: 0.7, cable: { r: 0.14, color: "#141518" } },
  psu8: { size: [2.1, 1.0, 1.5], lead: 1.0, cable: { r: 0.2, color: "#141518" } },
  psu6: { size: [1.6, 1.0, 1.5], lead: 1.0, cable: { r: 0.14, color: "#141518" } },
  usbA: { size: [1.6, 0.8, 2.2], lead: 1.0, cable: { r: 0.2, color: "#3e434a" } },
  hdmi: { size: [1.9, 1.0, 2.4], lead: 1.0, cable: { r: 0.3, color: "#1b1d21" } }
}

const DOWN: Vec3 = [0, -1, 0]

// ---------- the motherboard (ASUS ROG Strix Z370-E), in board coordinates ----------

/** A header whose plug goes in from above, its long side along x. */
const topHeader = (kind: ConnectorKind, name: string, at: Vec3, housing: Vec3, along: Vec3 = [1, 0, 0]): Port => ({
  kind,
  name,
  at,
  insert: DOWN,
  along,
  housing
})

/** A SATA port on the board's right edge: a pair of them stacked in each block, facing out of the edge (+x). */
const SATA_FACE_X = 12.185
const SATA_Y = [0.6, 1.42] as const
const SATA_Z = [7.59, 9.22, 10.87] as const
const sataPort = (block: number, level: number): Port => ({
  kind: "sataData",
  name: `Роз'єм SATA ${block * 2 + level + 1} на платі`,
  at: [SATA_FACE_X, SATA_Y[level] ?? 0, SATA_Z[block] ?? 0],
  insert: [-1, 0, 0],
  along: [0, 0, 1],
  housing: [1.45, 0.75, 1.69]
})

/** A port in the board's rear panel: the plug goes in towards +x, its long side along the panel (z). */
const rearPort = (kind: "usbA" | "hdmi", name: string, faceX: number, y: number, z: number, housing: Vec3): Port => ({
  kind,
  name,
  at: [faceX, y, z],
  insert: [1, 0, 0],
  along: [0, 0, 1],
  housing
})

export const BOARD_PORTS = {
  // the 24-pin socket stands along the right edge; its latch faces the edge (+x)
  atx24: topHeader("atx24", "Роз'єм живлення плати ATX (24 контакти)", [11.48, 1.844, -5.01], [5.3, 0.93, 1.84], [0, 0, -1]),
  // the 8-pin CPU socket in the top left corner; its latch faces the board's top edge (-z)
  eps8: topHeader("eps8", "Роз'єм живлення процесора CPU (8 контактів)", [-6.446, 1.769, -14.658], [1.78, 0.87, 1.77], [-1, 0, 0]),
  cpuFan: topHeader("fan4", "Роз'єм вентилятора процесора CPU_FAN", [5.18, 0.43, -13.68], [0.95, 0.54, 0.6]),
  cpuOpt: topHeader("fan4", "Роз'єм CPU_OPT", [5.18, 0.43, -12.77], [0.95, 0.54, 0.6]),
  chaFan1: topHeader("fan4", "Роз'єм вентилятора корпусу CHA_FAN1", [-6.217, 0.43, -1.64], [0.95, 0.54, 0.6]),
  chaFan2: topHeader("fan4", "Роз'єм вентилятора корпусу CHA_FAN2", [-6.217, 0.43, -0.41], [0.95, 0.54, 0.6]),
  // 10 × 2 pins in the bottom right corner, pitch 2.54 mm, along the bottom edge
  fPanel: topHeader("fPanel", "Роз'єм кнопок корпусу F_PANEL", [10.605, 0.33, 14.57], [2.55, 0.6, 0.6]),
  // 5 × 2 pins with one missing (the key), the leftmost header on the bottom edge
  hdAudio: topHeader("hdAudio", "Роз'єм аудіо передньої панелі HD_AUDIO", [-7.435, 0.33, 14.74], [1.3, 0.6, 0.6]),
  // the 19-pin USB 3.0 header lies on its side at the right edge: its plug goes in sideways (-x)
  usb3Header: {
    kind: "usb3Header",
    name: "Роз'єм USB 3.0 для корпусу",
    at: [12.14, 0.53, 5.34],
    insert: [-1, 0, 0],
    along: [0, 0, 1],
    housing: [2.39, 0.67, 0.98]
  },
  sata1: sataPort(0, 0),
  sata2: sataPort(0, 1),
  sata3: sataPort(1, 0),
  sata4: sataPort(1, 1),
  sata5: sataPort(2, 0),
  sata6: sataPort(2, 1),
  // the rear panel: its outer face is at x ≈ -12.09
  usb2Low: rearPort("usbA", "Роз'єм USB 2.0", -12.09, 0.536, -5.46, [1.22, 0.57, 1.26]),
  usb2High: rearPort("usbA", "Роз'єм USB 2.0", -12.09, 1.349, -5.46, [1.22, 0.57, 1.26]),
  usb3Low: rearPort("usbA", "Роз'єм USB 3.0", -12.109, 0.524, -3.539, [1.22, 0.57, 1.26]),
  usb3High: rearPort("usbA", "Роз'єм USB 3.0", -12.109, 1.366, -3.539, [1.22, 0.57, 1.26]),
  hdmi: rearPort("hdmi", "Роз'єм HDMI на платі", -12.054, 0.62, -7.37, [1.65, 0.69, 1.31])
} as const satisfies Record<string, Port>

// ---------- the graphics card (MSI RTX 3080 Gaming X Trio), in its own coordinates ----------

/** Its three 8-pin power sockets on the top edge, from the bracket end; the first one is used. */
const GPU_POWER_Z = [-11.66, -13.24, -14.85] as const

export const GPU_PORTS = {
  power1: {
    kind: "pcie8",
    name: "Роз'єм живлення відеокарти (8 контактів)",
    at: [0.215, 10.56, GPU_POWER_Z[0]],
    insert: DOWN,
    along: [0, 0, 1],
    housing: [1.4, 0.67, 0.76]
  },
  power2: {
    kind: "pcie8",
    name: "Роз'єм живлення відеокарти (8 контактів)",
    at: [0.215, 10.56, GPU_POWER_Z[1]],
    insert: DOWN,
    along: [0, 0, 1],
    housing: [1.4, 0.67, 0.76]
  },
  // on the bracket, the third full-size port from the top
  hdmi: {
    kind: "hdmi",
    name: "Роз'єм HDMI на відеокарті",
    at: [0.195, 4.64, 9.11],
    insert: [0, 0, -1],
    along: [0, 1, 0],
    housing: [1.02, 0.41, 0.3]
  }
} as const satisfies Record<string, Port>

/** The ports on the card's bracket, top to bottom, in its own coordinates (y of each middle). */
export const GPU_BRACKET_PORTS_Y = [7.74, 6.21, 4.64, 3.11] as const

// ---------- the hard disk (WD Green 1 TB), in its own coordinates ----------

export const HDD_PORTS = {
  power: {
    kind: "sataPower",
    name: "Роз'єм живлення SATA на диску",
    at: [-2.415, 0.35, 7.39],
    insert: [0, 0, -1],
    along: [1, 0, 0],
    housing: [3.85, 0.56, 0.6]
  },
  data: {
    kind: "sataData",
    name: "Роз'єм даних SATA на диску",
    at: [0.335, 0.35, 7.39],
    insert: [0, 0, -1],
    along: [1, 0, 0],
    housing: [1.33, 0.56, 0.6]
  }
} as const satisfies Record<string, Port>

// ---------- the power supply, in its own coordinates ----------

/**
 * The face of the power supply with the sockets for removable cables (-z, towards the inside of the case),
 * and the hole the built-in cables (board and processor) come out of. Our own panel of sockets goes on that face
 * (see `psuPanel` in devices.ts): two HDD/SATA sockets above, two PCI-E sockets below.
 */
export const PSU_FACE_Z = -7.75
export const PSU_HOLE: Vec3 = [-0.72, 2.4, PSU_FACE_Z]
export const PSU_SOCKET_X = [-1.4, 1.4] as const
export const PSU_SOCKET_Y = { sata: 12.4, pcie: 8.9 } as const

const psuSocket = (kind: "psu8" | "psu6", name: string, x: number, y: number): Port => ({
  kind,
  name,
  at: [x, y, PSU_FACE_Z],
  insert: [0, 0, 1],
  along: [0, 1, 0],
  housing: kind === "psu8" ? [2.1, 1.0, 1.0] : [1.6, 1.0, 1.0]
})

export const PSU_PORTS = {
  // the first PCI-E socket is on the side away from the HDD/SATA one in use: their cables do not cross
  pcie1: psuSocket("psu8", "Роз'єм PCI-E на блоці живлення", PSU_SOCKET_X[1], PSU_SOCKET_Y.pcie),
  pcie2: psuSocket("psu8", "Роз'єм PCI-E на блоці живлення", PSU_SOCKET_X[0], PSU_SOCKET_Y.pcie),
  sata1: psuSocket("psu6", "Роз'єм HDD/SATA на блоці живлення", PSU_SOCKET_X[0], PSU_SOCKET_Y.sata),
  sata2: psuSocket("psu6", "Роз'єм HDD/SATA на блоці живлення", PSU_SOCKET_X[1], PSU_SOCKET_Y.sata)
} as const satisfies Record<string, Port>

// ---------- placing a device, and its ports with it ----------

/** Where a device stands: its origin, and its turn as a slot pose gives it (see `posed` in models.ts). */
export interface DeviceFrame {
  readonly matrix: Matrix4
}

/** The frame of a part placed the way `posed` places it: at `at`, turned by quarter turns, yaw, pitch and roll. */
export const frameOf = (at: Vec3, turn = 0, yaw = 0, pitch = 0, roll = 0): DeviceFrame => {
  const q = new Quaternion().setFromEuler(new Euler(pitch, (-turn * Math.PI) / 2 + yaw, roll, "YXZ"))
  return { matrix: new Matrix4().compose(new Vector3(...at), q, new Vector3(1, 1, 1)) }
}

/** A frame inside another one: a device in a case, the case standing on the desk. */
export const within = (outer: DeviceFrame, inner: DeviceFrame): DeviceFrame => ({ matrix: outer.matrix.clone().multiply(inner.matrix) })

export const IDENTITY: DeviceFrame = { matrix: new Matrix4() }

/** A port where it ends up: its face, the way in, its long side and the turn a plug must take to sit in it. */
export interface PortPose {
  readonly at: Vector3
  readonly insert: Vector3
  readonly along: Vector3
  /** Turns a plug built standing up (going in along -y, long side along x) to sit in this port. */
  readonly orient: Quaternion
}

const snap = (v: Vector3): Vector3 => {
  // directions are whole axes: rounding keeps 1e-16 noise from turning straight cables a hair crooked
  for (const k of ["x", "y", "z"] as const) if (Math.abs(v[k]) < 1e-9) v[k] = 0
  return v
}

export const portPose = (port: Port, frame: DeviceFrame): PortPose => {
  const at = new Vector3(...port.at).applyMatrix4(frame.matrix)
  const insert = snap(new Vector3(...port.insert).transformDirection(frame.matrix))
  const along = snap(new Vector3(...port.along).transformDirection(frame.matrix))
  const up = insert.clone().negate()
  const side = new Vector3().crossVectors(along, up)
  const basis = new Matrix4().makeBasis(along, up, side)
  return { at, insert, along, orient: new Quaternion().setFromRotationMatrix(basis) }
}

/** The box round a port and its plug, in the frame's axes: what the student clicks and what lights up. */
export const portZone = (port: Port, pose: PortPose): { centre: Vector3; size: Vector3 } => {
  const plug = PLUGS[port.kind]
  const across = new Vector3().crossVectors(pose.along, pose.insert.clone().negate())
  // from inside the socket out to the top of the plug
  const depth = port.housing[2] * 0.5 + plug.size[2]
  const centre = pose.at.clone().addScaledVector(pose.insert, -(plug.size[2] - port.housing[2] * 0.5) / 2)
  const long = Math.max(port.housing[0], plug.size[0]) + 0.5
  const wide = Math.max(port.housing[1], plug.size[1]) + 0.5
  const size = new Vector3()
  for (const [dir, length] of [
    [pose.along, long],
    [across, wide],
    [pose.insert, depth + 0.4]
  ] as const) {
    size.x += Math.abs(dir.x) * length
    size.y += Math.abs(dir.y) * length
    size.z += Math.abs(dir.z) * length
  }
  return { centre, size }
}
