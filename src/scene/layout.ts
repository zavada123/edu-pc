import { Matrix4, Quaternion } from "three"
import type { PartKind } from "../core/parts.ts"
import {
  BOARD_PORTS,
  type ConnectorKind,
  type DeviceFrame,
  frameOf,
  GPU_PORTS,
  HDD_PORTS,
  IDENTITY,
  type Port,
  portPose,
  portZone,
  PSU_FACE_Z,
  PSU_HOLE as PSU_HOLE_LOCAL,
  PSU_PORTS,
  type Vec3
} from "./ports.ts"
import { COOLER_FAN_CABLE, COOLER_ROUTE, FRONT_IO, REAR_FAN, type RouteStep, ROUTES } from "./routes.ts"

export type { Vec3 } from "./ports.ts"

/** Where a part stands once it is placed in a slot, and the click area around the slot. */
export interface SlotPose {
  /** Bottom centre of the placed part; for a plug, the middle of its tip. */
  readonly at: Vec3
  /** Size of the click area (and the highlight box) around the slot. */
  readonly area: Vec3
  /** Where the camera looks at this slot from, as a direction. Leave out for «from the front and above». */
  readonly view?: Vec3
  /** For a cable plug: the point the cable comes from (the power supply, the disk). A tube joins them. */
  readonly cableFrom?: Vec3
  /**
   * Points the cable passes on its way from the plug to where it comes from: through the grommets in the
   * board tray and behind it, so it does not cross the graphics card.
   */
  readonly via?: ReadonlyArray<Vec3>
  /** The same, by the kind of plug, for a socket several devices may use: a USB port for the keyboard or the mouse. */
  readonly cablesFrom?: Readonly<Partial<Record<PartKind, Vec3>>>
  /** Turn of a plug around the way it goes in, in radians: a USB plug stands upright in an upright socket. */
  readonly roll?: number
  /** Tilt of a plug around x, in radians: π/2 lays a plug made to go in from above on its side, going in towards -z. */
  readonly pitch?: number
  /**
   * For a plug in a port from the port map: the turn that seats it (a quaternion, x y z w), which kind of
   * connector it is (that picks the plug's model), and the middle of the click area round socket and plug.
   * A pose with `orient` ignores `yaw`, `pitch` and `roll`.
   */
  readonly orient?: readonly [number, number, number, number]
  readonly connector?: ConnectorKind
  readonly areaAt?: Vec3
  /**
   * The cable's way from the plug to its other end, one axis at a time (see routes.ts). It starts where the
   * cable leaves the plug straight and ends at the other plug's lead, or at `cableFrom`.
   */
  readonly route?: ReadonlyArray<RouteStep>
  /** Shrink the placed part to fit the area, as a big device in a sorting basket. */
  /**
   * A cover over other slots (the case's side panel over the whole inside): it takes the pointer only while
   * the part in hand fits it, so on other steps it does not hide the slots under it.
   */
  readonly cover?: boolean
  readonly fit?: boolean
  /** Turn of the placed part around the vertical, in radians: a plug in the back of the system unit, which faces away. */
  readonly yaw?: number
  /** Slots of one basket share a group: a tap on a full spot puts the part in a free one. */
  readonly group?: string
}

/** The middle of a slot's click area: given for a port, otherwise standing on the slot's point. */
export const zoneCentre = (pose: SlotPose): Vec3 => pose.areaAt ?? [pose.at[0], pose.at[1] + pose.area[1] / 2 - 0.3, pose.at[2]]

/** The socket lever: its pivot, and which value means «up». */
export interface LeverPose {
  readonly control: string
  readonly pivot: Vec3
  readonly length: number
  readonly upValue: string
}

/**
 * A button on the case that switches a control, such as the power button. `normal` is the way the
 * button's face looks, so the camera knows where to look at it from.
 */
export interface ButtonPose {
  readonly control: string
  readonly at: Vec3
  readonly normal: Vec3
  /** Size of the button against the case's one: the monitor's button is smaller. */
  readonly size?: number
  /** A slot that must hold a part for the button to be there: the monitor's button comes with the monitor. */
  readonly when?: string
}

/** A sorting basket on the desk, with its sign. */
export interface CratePose {
  readonly at: Vec3
  readonly label: ReadonlyArray<string>
  readonly colour: string
}

/** A closed box with a part inside; clicking it opens it (inspects the part), and the part stands there until it is taken. */
export interface BoxPose {
  readonly part: string
  readonly at: Vec3
}

/**
 * A part lying loose on the desk until it is taken or placed, so the student sees what there is to build with.
 * `at` is where its lowest point rests: 0 on the mat, DESK_TOP beside it.
 */
export interface LoosePose {
  readonly part: string
  readonly at: Vec3
  /** Turn around the vertical axis, in radians. */
  readonly yaw?: number
  /** Laid on its side: a memory module lies flat instead of standing on its edge. */
  readonly flat?: boolean
}

/** A device standing on the desk for the whole exercise: the monitor, the keyboard, the mouse. */
export interface PropPose {
  readonly kind: "monitor" | "keyboard" | "mouse" | "smartphone" | "powerStrip"
  readonly at: Vec3
  /** Turn around the vertical axis, in radians. */
  readonly yaw?: number
}

/** Labels printed on the board, next to what they name. */
export interface Silkscreen {
  readonly text: string
  readonly at: readonly [number, number]
  readonly size?: number
}

/** What is printed on our board and where its socket is: the same board in every scenario. */
export interface BoardFace {
  readonly labels: ReadonlyArray<Silkscreen>
  /** Centre of the CPU socket on the board, x and z. */
  readonly socket: readonly [number, number]
}

/** How a scenario looks in 3D: what lies on the desk, where each of its slots and controls is. */
export interface SceneLayout {
  /** What the student builds on: the bare board on the desk, or the open case lying on its side. */
  readonly bench: "board" | "case" | "tower"
  readonly slots: Readonly<Record<string, SlotPose>>
  readonly lever?: LeverPose
  readonly buttons?: ReadonlyArray<ButtonPose>
  /** The part that is the bench itself (the board, the case): clicking the bench inspects it. */
  readonly benchPart?: string
  /** How high above the desk a part in hand floats. Above the case walls when building in the case. */
  readonly holdHeight?: number
  /** Camera distance for a look at the whole bench. */
  readonly overview?: number
  /** The control that switches the computer on: fans spin and the monitor lights up when it has this value. */
  readonly power?: {
    readonly control: string
    readonly on: string
    /** The monitor's own button, when it has one: the screen lights only when this is on too. */
    readonly screen?: { readonly control: string; readonly on: string }
    /** Other controls the computer needs to get power at all: the power strip's switch. */
    readonly requires?: Readonly<Record<string, string>>
    /**
     * Slots that must hold a part for a working picture, and what the screen shows without it:
     * nothing (no CPU power, the monitor on the wrong socket) or a «disk not found» message.
     */
    readonly needs?: ReadonlyArray<{ readonly slot: string; readonly screen: "dark" | "noDisk" }>
  }
  readonly props?: ReadonlyArray<PropPose>
  /** Markers of a data path, by stop id: the USB port, the RAM, the processor. */
  readonly stops?: Readonly<Record<string, Vec3>>
  readonly crates?: ReadonlyArray<CratePose>
  readonly boxes?: ReadonlyArray<BoxPose>
  readonly loose?: ReadonlyArray<LoosePose>
  /** The desk top's width and depth, when the exercise needs more room than the usual desk. */
  readonly desk?: readonly [number, number]
  /** Where the camera goes once the exercise is done, to show the result: the lit monitor. */
  readonly finale?: { readonly at: Vec3; readonly distance: number; readonly view: Vec3 }
}

export const BOARD_TOP = 0.16
/** Height of the bare desk top beside the mat, in bench coordinates: the mat lies a little higher. */
export const DESK_TOP = -0.05
/*
 * Our board is a real one, the ASUS ROG Strix Z370-E (ATX, 24.4 × 30.5 cm), lying with its rear panel to the
 * left (-x). Everything below is measured on its model (`public/models/motherboard.glb`), so a part placed
 * here sits where it sits on the real board.
 */
const SOCKET: readonly [number, number] = [0.66, -6.71]
const DIMM_X = [6.2, 7.15, 8.1, 9.05] as const
const DIMM_Z = -6.7
/** Middle of the M.2 slot, from the connector to the screw. */
const M2: readonly [number, number] = [-0.91, 0.89]

export const DIMM_LENGTH = 13.3
/** Where the key in a RAM slot sits, along the slot from its centre. A module fits only with its notch here. */
export const DIMM_KEY = 1.3

/** Our board in its own coordinates: where its connectors are, x and z. */
export const BOARD_CONNECTORS = {
  pcieX16: [-3.3, 2.9],
  pcieX1: [-6.6, 5.0]
} as const satisfies Record<string, readonly [number, number]>

/** The board's mounting holes, x and z: the case has a brass standoff under each. */
export const BOARD_HOLES: ReadonlyArray<readonly [number, number]> = [
  [-10.8, -13.8],
  [10.8, -13.8],
  [-10.8, 13.8],
  [10.8, 13.8],
  [-10.8, 3.5],
  [10.8, 3.5],
  [0, -13.8]
]

/**
 * The outer face of the rear panel on the board, along x, and the middle of each port: z along the panel
 * and y above the board, from the port map. As on a real board, a port's long side points away from the board (along y).
 */
const rear = (port: Port): readonly [number, number] => [port.at[2], port.at[1] - BOARD_TOP]
export const REAR_FACE_X = BOARD_PORTS.usb2Low.at[0]
export const REAR_PORTS = {
  usb1: rear(BOARD_PORTS.usb2Low),
  usb2: rear(BOARD_PORTS.usb2High),
  hdmi: rear(BOARD_PORTS.hdmi),
  lan: [-1.3, 2.6],
  usb3: rear(BOARD_PORTS.usb3Low),
  usb4: rear(BOARD_PORTS.usb3High)
} as const satisfies Record<string, readonly [number, number]>

export const GRADE8_BOARD: BoardFace = {
  socket: SOCKET,
  labels: [
    { text: "CPU_FAN", at: [5.2, -12] },
    { text: "SYS_FAN", at: [-6.2, -0.5] },
    { text: "A1", at: [DIMM_X[0], -14.1], size: 0.55 },
    { text: "A2", at: [DIMM_X[1], -14.1], size: 0.55 },
    { text: "B1", at: [DIMM_X[2], -14.1], size: 0.55 },
    { text: "B2", at: [DIMM_X[3], -14.1], size: 0.55 },
    { text: "M.2", at: [-0.9, 2.4] },
    { text: "CPU", at: [0.66, -3.4] },
    { text: "SATA", at: [9.8, 9.2], size: 0.5 },
    { text: "Z370-E", at: [5, 13], size: 0.9 }
  ]
}

const round = (v: number): number => Math.round(v * 10000) / 10000
/**
 * The slot of a port from the port map, wherever its device stands: the plug's place and turn, the click area
 * round socket and plug, and a look at it from the side the plug comes from.
 */
export const portSlot = (port: Port, frame: DeviceFrame, extra: Partial<SlotPose> = {}): SlotPose => {
  const pose = portPose(port, frame)
  const zone = portZone(port, pose)
  const up = pose.insert.clone().negate()
  const q = pose.orient
  return {
    at: [round(pose.at.x), round(pose.at.y), round(pose.at.z)],
    orient: [q.x, q.y, q.z, q.w],
    connector: port.kind,
    area: [round(zone.size.x), round(zone.size.y), round(zone.size.z)],
    areaAt: [round(zone.centre.x), round(zone.centre.y), round(zone.centre.z)],
    view: [round(up.x + 0.15), round(up.y + 0.9), round(up.z + 0.35)],
    ...extra
  }
}

const dimm = (x: number): SlotPose => ({ at: [x, BOARD_TOP + 0.43, DIMM_Z], area: [0.8, 1.4, DIMM_LENGTH + 0.3] })

/** Layout of the grade 8 desk scenario: the bare board on the mat. */
export const grade8DeskLayout: SceneLayout = {
  bench: "board",
  benchPart: "board",
  slots: {
    cpuSocket: { at: [SOCKET[0], BOARD_TOP + 0.17, SOCKET[1]], area: [4.6, 1.2, 4.6] },
    cpuTop: { at: [SOCKET[0], BOARD_TOP + 0.6, SOCKET[1]], area: [4.2, 1.2, 4.2] },
    coolerMount: { at: [SOCKET[0], BOARD_TOP + 0.62, SOCKET[1]], area: [8.4, 2, 8.4] },
    // the cooler's fan wire: its plug goes into CPU_FAN, the wire runs up the cooler's side to its fan
    cpuFan: portSlot(BOARD_PORTS.cpuFan, IDENTITY, { route: COOLER_ROUTE, cableFrom: COOLER_FAN_CABLE, view: [0.3, 1, 0.5] }),
    sysFan: portSlot(BOARD_PORTS.chaFan1, IDENTITY, { cableFrom: COOLER_FAN_CABLE, view: [0.3, 1, 0.5] }),
    dimmA1: dimm(DIMM_X[0]),
    dimmA2: dimm(DIMM_X[1]),
    dimmB1: dimm(DIMM_X[2]),
    dimmB2: dimm(DIMM_X[3]),
    // the M.2 connector is at the slot's right end (+x): the stick is turned half round
    m2Slot: { at: [M2[0], BOARD_TOP + 0.5, M2[1]], area: [9, 1, 2.8], yaw: Math.PI }
  },
  lever: { control: "socketLever", pivot: [SOCKET[0] + 3.25, BOARD_TOP + 0.3, SOCKET[1] + 3.5], length: 6.2, upValue: "up" },
  overview: 64,
  // the new parts lie on the mat round the board, the way they come out of their boxes
  loose: [
    { part: "cooler", at: [-21, 0, -6] },
    { part: "cpu", at: [-21, 0, 6] },
    { part: "paste", at: [-21, 0, 14], yaw: 0.3 },
    { part: "ram1", at: [19.5, 0, -1], flat: true },
    { part: "ram2", at: [23.5, 0, -1], flat: true },
    { part: "ssd", at: [-3, 0, 18.5] },
    { part: "coolerCable", at: [8, 0, 18.5], yaw: 0.5 }
  ]
}

// ---------- the case ----------

/**
 * The case lies on its side with the open side up, its back towards the student, so the ports on
 * the back are in view. Case coordinates: x from the case's top (-x) to its bottom (+x), z from the
 * front (-z) to the back (+z), y up from the desk. The inside of the side wall the board stands on is at y = CASE_FLOOR.
 */
export const CASE_SIZE: Vec3 = [43, 21, 45]
export const CASE_FLOOR = 1
/** The board stands on 6 mm standoffs on the realistic case's tray (y 1.6, see routes.ts): its rear ports then fill the I/O shield. */
const STANDOFF = 1.2
/**
 * Where our board's centre lands in the case, and its quarter turn there (3: the rear panel faces the back).
 * Its ports reach into the I/O shield in the case's back wall, as on a real build, and its graphics card's
 * bracket comes up to the slot covers.
 */
export const BOARD_IN_CASE: Vec3 = [-4.25, CASE_FLOOR + STANDOFF, 9.65]
export const BOARD_TURN_IN_CASE = 3

/** A point on our board (board coordinates) in case coordinates, once the board is in the case. */
export const onBoard = (x: number, y: number, z: number): Vec3 => [BOARD_IN_CASE[0] + z, BOARD_IN_CASE[1] + y, BOARD_IN_CASE[2] - x]

const PSU_AT: Vec3 = [16.2, CASE_FLOOR, 14.4]
const HDD_AT: Vec3 = [16.2, CASE_FLOOR, -8]
/** The slot for the graphics card: card fingers sit 0.8 cm deep in the PCIe slot. */
const pcie = (at: readonly [number, number]): Vec3 => onBoard(at[0], BOARD_TOP + 1.1 - 0.8, at[1])
const GPU_AT = pcie(BOARD_CONNECTORS.pcieX16)

/** Where each device stands in the case: its ports go with it (see ports.ts). */
export const CASE_FRAMES = {
  board: frameOf(BOARD_IN_CASE, BOARD_TURN_IN_CASE),
  psu: frameOf(PSU_AT),
  hdd: frameOf(HDD_AT),
  gpu: frameOf(GPU_AT)
} as const satisfies Record<string, DeviceFrame>

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const BACK: Vec3 = [0, 0.45, 1]
/** Cables of the desk devices run from the back of the case down to the desk. */
const toDesk = (at: Vec3): Vec3 => [at[0], 0.3, at[2] + 10]

/** The point inside the power supply's hole that its built-in cables come out of, in case coordinates. */
const PSU_CABLES: Vec3 = add(PSU_AT, PSU_HOLE_LOCAL)
/** The power supply's face with the sockets, in case coordinates: for the camera. */
const PSU_FACE = PSU_AT[2] + PSU_FACE_Z

/** A port of the board in the case, with its route (see routes.ts) when it has one. */
const inCase = (port: Port, frame: DeviceFrame, slot: string, extra: Partial<SlotPose> = {}): SlotPose => {
  const route = ROUTES[slot]
  return portSlot(port, frame, { ...(route ? { route } : {}), ...extra })
}

/** A socket on the power supply: a plug in it on its own hangs its cable down in front of the supply. */
const psuSocketSlot = (port: Port, slot: string): SlotPose => {
  const pose = portSlot(port, CASE_FRAMES.psu, { view: [0.4, 0.6, -1] })
  return inCase(port, CASE_FRAMES.psu, slot, { view: [0.4, 0.6, -1], cableFrom: [pose.at[0], CASE_FLOOR + 0.4, pose.at[2] - 3.5] })
}

const rearPort = (port: Port): SlotPose => {
  const slot = portSlot(port, CASE_FRAMES.board, { view: BACK })
  return { ...slot, cableFrom: toDesk(slot.at) }
}

export const grade8CaseLayout: SceneLayout = {
  bench: "case",
  benchPart: "case",
  holdHeight: CASE_SIZE[1] + 4,
  overview: 100,
  power: { control: "power", on: "on", requires: { psuSwitch: "on" } },
  slots: {
    psuBay: { at: PSU_AT, area: [8.8, 15, 14.2] },
    boardTray: { at: BOARD_IN_CASE, area: [30.7, 3, 24.6], cover: true },
    pcieX16: { at: GPU_AT, area: [1.6, 3, 9.4], view: [0.55, 0.8, 0.45] },
    pcieX1: { at: pcie(BOARD_CONNECTORS.pcieX1), area: [1.4, 2.4, 5.4], view: [0.55, 0.8, 0.45] },
    hddBay: { at: HDD_AT, area: [10.6, 3.4, 15] },
    // the board's own cables come from the hole in the power supply
    // two bundles side by side in the one hole
    atxPort: inCase(BOARD_PORTS.atx24, CASE_FRAMES.board, "atxPort", { cableFrom: add(PSU_CABLES, [-0.3, 0, 0]) }),
    cpuPowerPort: inCase(BOARD_PORTS.eps8, CASE_FRAMES.board, "cpuPowerPort", { cableFrom: add(PSU_CABLES, [0.32, 0, 0]) }),
    // removable cables: drawn from this end to the plug on their other end
    gpuPowerPort: inCase(GPU_PORTS.power1, CASE_FRAMES.gpu, "gpuPowerPort", { cableFrom: add(PSU_AT, [-1.4, 8.9, PSU_FACE_Z - 3]) }),
    hddPowerPort: inCase(HDD_PORTS.power, CASE_FRAMES.hdd, "hddPowerPort", { cableFrom: add(PSU_AT, [-1.4, 12.4, PSU_FACE_Z - 3]) }),
    sataPort: inCase(BOARD_PORTS.sata1, CASE_FRAMES.board, "sataPort", { cableFrom: add(HDD_AT, [0.3, 0.4, 10]) }),
    hddDataPort: inCase(HDD_PORTS.data, CASE_FRAMES.hdd, "hddDataPort", { view: [0.2, 0.8, 1], cableFrom: add(HDD_AT, [0.3, 0.4, 10]) }),
    psuPcie1: psuSocketSlot(PSU_PORTS.pcie1, "psuPcie1"),
    psuPcie2: psuSocketSlot(PSU_PORTS.pcie2, "psuPcie2"),
    psuSata1: psuSocketSlot(PSU_PORTS.sata1, "psuSata1"),
    psuSata2: psuSocketSlot(PSU_PORTS.sata2, "psuSata2"),
    // the front panel's wires come from behind the tray; the fan's from the fan
    fPanel: inCase(BOARD_PORTS.fPanel, CASE_FRAMES.board, "fPanel", { cableFrom: FRONT_IO.panel }),
    hdAudio: inCase(BOARD_PORTS.hdAudio, CASE_FRAMES.board, "hdAudio", { cableFrom: FRONT_IO.audio }),
    usb3Header: inCase(BOARD_PORTS.usb3Header, CASE_FRAMES.board, "usb3Header", { cableFrom: FRONT_IO.usb3 }),
    chaFan: inCase(BOARD_PORTS.chaFan1, CASE_FRAMES.board, "chaFan", { cableFrom: REAR_FAN.cableOut }),
    caseSide: { at: [0, CASE_SIZE[1], 0], area: [CASE_SIZE[0], 1.2, CASE_SIZE[2]], cover: true },
    gpuHdmi: (() => {
      const slot = portSlot(GPU_PORTS.hdmi, CASE_FRAMES.gpu, { view: BACK })
      return { ...slot, cableFrom: toDesk(slot.at) }
    })(),
    boardHdmi: rearPort(BOARD_PORTS.hdmi),
    usb1: rearPort(BOARD_PORTS.usb2Low),
    usb2: rearPort(BOARD_PORTS.usb2High),
    usb3: rearPort(BOARD_PORTS.usb3Low),
    usb4: rearPort(BOARD_PORTS.usb3High)
  },
  finale: { at: [0, 16, -24], distance: 110, view: [0.25, 0.55, 1] },
  buttons: [
    { control: "power", at: [-CASE_SIZE[0] / 2 - 0.05, 10.5, -12], normal: [-1, 0, 0] },
    // the switch on the back of the power supply, beside its mains socket
    { control: "psuSwitch", at: [14.6, 6.2, 22.4], normal: [0, 0, 1], size: 0.7 }
  ],
  props: [
    { kind: "monitor", at: [0, 0, -46] },
    { kind: "keyboard", at: [0, 0, -31] },
    { kind: "mouse", at: [29, 0, -31] }
  ],
  // the parts still to go into the case lie in a row on the desk in front of it, low enough not to hide it
  loose: [
    { part: "board", at: [-38, DESK_TOP, 36] },
    { part: "psu", at: [-8, DESK_TOP, 38], flat: true },
    { part: "gpu", at: [17, DESK_TOP, 40], flat: true, yaw: Math.PI / 2 },
    { part: "hdd", at: [43, DESK_TOP, 38] }
  ]
}

/** Where the power supply's socket face is, along z in the case. */
export const PSU_FACE_IN_CASE = PSU_FACE

// ---------- the grade 8 lab: the built computer at work ----------

const above = (v: Vec3, dy: number, dz = 0): Vec3 => [v[0], v[1] + dy, v[2] + dz]

/** The case scenario's computer, built and switched on, with markers for the data path and a smartphone on the desk. */
export const grade8LabLayout: SceneLayout = {
  ...grade8CaseLayout,
  loose: [],
  props: [...(grade8CaseLayout.props ?? []), { kind: "smartphone", at: [24, 0, 34], yaw: 0.4 }],
  finale: { at: [0, 18, -30], distance: 105, view: [0.25, 0.55, 1] },
  stops: {
    usb: above(grade8CaseLayout.slots.usb3?.at ?? [0, 0, 0], 3, 3),
    ram: onBoard((DIMM_X[1] + DIMM_X[3]) / 2, BOARD_TOP + 12, DIMM_Z),
    cpu: onBoard(SOCKET[0], BOARD_TOP + 10, SOCKET[1]),
    gpu: add(GPU_AT, [1.9, 17, 0]),
    monitor: [0, 27, -44],
    ssd: onBoard(M2[0], BOARD_TOP + 1.5, M2[1]),
    hdd: add(HDD_AT, [0, 5, 0])
  }
}

// ---------- the grade 3–4 desk ----------

/**
 * The finished computer from the grade 8 case scenario stands upright at the right of the desk, its front
 * towards the student, its back (with the ports) towards the wall and its glass side towards the monitor.
 * A point in that case's coordinates, once the case stands: its top (-x) goes up, its open side (+y) to the
 * left, its front (-z) towards the student.
 */
export const TOWER_AT: Vec3 = [78, 0, -22.5]
export const standing = (v: Vec3): Vec3 => [TOWER_AT[0] - v[1], CASE_SIZE[0] / 2 - v[0], TOWER_AT[2] - v[2]]
/** How `standing` turns the case: x → -y, y → -x, z → -z. */
const STANDING_TURN = new Quaternion().setFromRotationMatrix(new Matrix4().set(0, -1, 0, 0, -1, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1))
/** The tower is turned half round: its back, with the ports, faces away from the student. */
const TOWER_YAW = Math.PI
/** The ports are seen from behind the system unit: the camera goes round to its back for the cables. */
const BEHIND: Vec3 = [-0.35, 0.5, -1]

const DESK_MONITOR: Vec3 = [-22, 0, -40]
const DESK_KEYBOARD: Vec3 = [-22, 0, -16]
const DESK_MOUSE: Vec3 = [10, 0, -16]
const CRATE_Z = 58
const CRATE_X = { in: -60, out: 0, store: 60 } as const
/** The grade 3–4 desk is bigger than the usual one: six boxes and three baskets stand on it without touching. */
const GRADE3_DESK: readonly [number, number] = [220, 150]
/** The closed boxes stand in a row with room between them, so every name on them can be read. */
const BOX_Z = 14
const CRATE_FLOOR = 1
/** The cables of the desk devices come out of their backs. */
const MONITOR_CABLE: Vec3 = [DESK_MONITOR[0] - 4, 8, DESK_MONITOR[2] - 3]
const KEYBOARD_CABLE: Vec3 = [DESK_KEYBOARD[0], 0.6, DESK_KEYBOARD[2] - 7.5]
const MOUSE_CABLE: Vec3 = [DESK_MOUSE[0], 0.8, DESK_MOUSE[2] - 5.5]

/** A spot in a basket: `n` spots side by side, this is spot `i`. */
const basket = (x: number, n: number, i: number, group: string): SlotPose => {
  const w = 38 / n
  return { at: [x - 19 + w * (i + 0.5), CRATE_FLOOR, CRATE_Z], area: [w - 0.5, 11, 24], fit: true, group }
}

/** A port on the back of the standing tower: a big click area, the cable coming from the device on the desk. */
const towerPort = (slot: string): SlotPose => {
  const inCasePose = grade8CaseLayout.slots[slot]
  const turned = inCasePose?.orient && inCasePose.connector ? STANDING_TURN.clone().multiply(new Quaternion(...inCasePose.orient)) : null
  return {
    at: standing(inCasePose?.at ?? [0, 0, 0]),
    area: [2.2, 2, 2.2],
    view: BEHIND,
    // the plug turns with the case as it stands up: it stays square in its port
    ...(turned && inCasePose?.connector
      ? { orient: [turned.x, turned.y, turned.z, turned.w] as const, connector: inCasePose.connector }
      : { yaw: TOWER_YAW })
  }
}
const usbPort = (slot: string): SlotPose => ({
  ...towerPort(slot),
  group: "usb",
  cablesFrom: { keyboardCable: KEYBOARD_CABLE, mouseCable: MOUSE_CABLE }
})

const caseButton = grade8CaseLayout.buttons?.[0]?.at ?? [0, 0, 0]

export const grade3DeskLayout: SceneLayout = {
  bench: "tower",
  benchPart: "tower",
  holdHeight: 30,
  overview: 190,
  power: { control: "power", on: "on", screen: { control: "monitorPower", on: "on" } },
  slots: {
    in1: basket(CRATE_X.in, 2, 0, "in"),
    in2: basket(CRATE_X.in, 2, 1, "in"),
    out1: basket(CRATE_X.out, 3, 0, "out"),
    out2: basket(CRATE_X.out, 3, 1, "out"),
    out3: basket(CRATE_X.out, 3, 2, "out"),
    store1: basket(CRATE_X.store, 1, 0, "store"),
    deskMonitor: { at: DESK_MONITOR, area: [52, 8, 14] },
    deskKeyboard: { at: DESK_KEYBOARD, area: [44, 4, 15] },
    deskMouse: { at: DESK_MOUSE, area: [9, 4, 12] },
    hdmi: { ...towerPort("boardHdmi"), cableFrom: MONITOR_CABLE },
    usb1: usbPort("usb1"),
    usb2: usbPort("usb2"),
    usb3: usbPort("usb3"),
    usb4: usbPort("usb4")
  },
  buttons: [
    { control: "power", at: standing(caseButton), normal: [0, 1, 0] },
    { control: "monitorPower", at: [DESK_MONITOR[0] + 22, DESK_MONITOR[1] + 12.6, DESK_MONITOR[2] + 0.9], normal: [0, 0, 1], size: 0.55, when: "deskMonitor" }
  ],
  crates: [
    { at: [CRATE_X.in, 0, CRATE_Z], label: ["Передає", "в комп'ютер"], colour: "#2988cc" },
    { at: [CRATE_X.out, 0, CRATE_Z], label: ["Показує", "результат"], colour: "#f5a524" },
    { at: [CRATE_X.store, 0, CRATE_Z], label: ["Зберігає", "на потім"], colour: "#1fa35c" }
  ],
  // each device stands where its box was once opened: far enough apart that the wide ones do not touch
  boxes: [
    { part: "monitor", at: [-82, 0, BOX_Z] },
    { part: "keyboard", at: [-28, 0, BOX_Z] },
    { part: "mouse", at: [3, 0, BOX_Z] },
    { part: "printer", at: [32, 0, BOX_Z] },
    { part: "speakers", at: [74, 0, BOX_Z] },
    { part: "flash", at: [100, 0, BOX_Z] }
  ],
  desk: GRADE3_DESK,
  finale: { at: [30, 18, -30], distance: 135, view: [-0.1, 0.5, 1] }
}

// ---------- troubleshooting: the built computers, one fault each ----------

const STRIP_AT: Vec3 = [44, 0, 8]

/** The grade 8 case, built: the picture needs the monitor on the graphics card and power to the processor; the files need the disk's cable. */
export const grade8FaultLayout: SceneLayout = {
  ...grade8CaseLayout,
  // a fault exercise starts built: a part lying beside it would give the answer away
  loose: [],
  power: {
    control: "power",
    on: "on",
    requires: { psuSwitch: "on" },
    needs: [
      { slot: "cpuPowerPort", screen: "dark" },
      { slot: "gpuHdmi", screen: "dark" },
      { slot: "sataPort", screen: "noDisk" }
    ]
  }
}

/** The grade 3–4 desk, set up, with a power strip: no strip, no power; no monitor cable, no picture. */
export const grade3FaultLayout: SceneLayout = {
  ...grade3DeskLayout,
  boxes: [],
  props: [{ kind: "powerStrip", at: STRIP_AT }],
  buttons: [
    ...(grade3DeskLayout.buttons ?? []),
    { control: "strip", at: [STRIP_AT[0] + 12, 3.7, STRIP_AT[2]], normal: [0, 1, 0], size: 0.9 }
  ],
  power: {
    control: "power",
    on: "on",
    screen: { control: "monitorPower", on: "on" },
    requires: { strip: "on" },
    needs: [{ slot: "hdmi", screen: "dark" }]
  },
  // the result view takes in the power strip in front, too
  finale: { at: [26, 12, -18], distance: 140, view: [-0.1, 0.6, 1] }
}

/** Layouts by scenario id. */
export const layouts: Readonly<Record<string, SceneLayout>> = {
  "grade8-club-desk": grade8DeskLayout,
  "grade8-club-case": grade8CaseLayout,
  "grade8-club-lab": grade8LabLayout,
  "grade3-new-box": grade3DeskLayout,
  "grade8-fault-cpu-power": grade8FaultLayout,
  "grade8-fault-hdmi": grade8FaultLayout,
  "grade8-fault-disk": grade8FaultLayout,
  "grade3-fault-monitor": grade3FaultLayout,
  "grade3-fault-strip": grade3FaultLayout
}
