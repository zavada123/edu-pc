import type { PartKind } from "../core/parts.ts"

/** Board coordinates are centimetres: x to the right, z towards the student, y up from the desk. */
export type Vec3 = readonly [number, number, number]

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
  /** The same, by the kind of plug, for a socket several devices may use: a USB port for the keyboard or the mouse. */
  readonly cablesFrom?: Readonly<Partial<Record<PartKind, Vec3>>>
  /** Turn of a plug around the way it goes in, in radians: a USB plug stands upright in an upright socket. */
  readonly roll?: number
  /** Shrink the placed part to fit the area, as a big device in a sorting basket. */
  readonly fit?: boolean
  /** Turn of the placed part around the vertical, in radians: a plug in the back of the system unit, which faces away. */
  readonly yaw?: number
  /** Slots of one basket share a group: a tap on a full spot puts the part in a free one. */
  readonly group?: string
}

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
  /** Where the camera goes once the exercise is done, to show the result: the lit monitor. */
  readonly finale?: { readonly at: Vec3; readonly distance: number; readonly view: Vec3 }
}

export const BOARD_TOP = 0.16
const SOCKET: readonly [number, number] = [-2, -4]
const DIMM_X = [5.2, 6.1, 7.0, 7.9] as const
const DIMM_Z = -3.5

export const DIMM_LENGTH = 13.3
/** Where the key in a RAM slot sits, along the slot from its centre. A module fits only with its notch here. */
export const DIMM_KEY = 1.3

/** Our board (roughly ATX) in its own coordinates: where its connectors are, x and z. */
export const BOARD_CONNECTORS = {
  atx24: [14.2, -3],
  eps8: [-10.9, -10.75],
  sata: [13.9, 7.2],
  pcieX16: [-6.5, 8.8],
  pcieX1: [-8.5, 11]
} as const satisfies Record<string, readonly [number, number]>

/**
 * The outer face of the rear panel on the board, along x, and the middle of each port: z along the panel
 * and y above the board. As on a real board, a port's long side points away from the board (along y).
 */
export const REAR_FACE_X = -15.45
export const REAR_PORTS = {
  usb1: [-10.8, 0.95],
  usb2: [-10.8, 2.55],
  hdmi: [-8.4, 0.95],
  lan: [-8.4, 2.6],
  usb3: [-6, 0.95],
  usb4: [-6, 2.55]
} as const satisfies Record<string, readonly [number, number]>

export const GRADE8_BOARD: BoardFace = {
  socket: SOCKET,
  labels: [
    { text: "CPU_FAN", at: [-2, -11.6] },
    { text: "SYS_FAN", at: [-12.2, 4.3] },
    { text: "A1", at: [DIMM_X[0], -10.9], size: 0.55 },
    { text: "A2", at: [DIMM_X[1], -10.9], size: 0.55 },
    { text: "B1", at: [DIMM_X[2], -10.9], size: 0.55 },
    { text: "B2", at: [DIMM_X[3], -10.9], size: 0.55 },
    { text: "M.2", at: [-8.6, 6.4] },
    { text: "CPU", at: [-3.6, 0.7] },
    { text: "SATA", at: [12.4, 7.2], size: 0.5 },
    { text: "EDU BOARD 8", at: [10.5, 9.5], size: 0.9 }
  ]
}

const dimm = (x: number): SlotPose => ({ at: [x, BOARD_TOP + 0.55, DIMM_Z], area: [0.8, 1.4, DIMM_LENGTH + 0.3] })

/** Layout of the grade 8 desk scenario (a board of our own design, roughly ATX-sized). */
export const grade8DeskLayout: SceneLayout = {
  bench: "board",
  benchPart: "board",
  slots: {
    cpuSocket: { at: [SOCKET[0], BOARD_TOP + 0.42, SOCKET[1]], area: [4.6, 1.2, 4.6] },
    cpuTop: { at: [SOCKET[0], BOARD_TOP + 0.84, SOCKET[1]], area: [4.2, 1.2, 4.2] },
    coolerMount: { at: [SOCKET[0], BOARD_TOP + 0.86, SOCKET[1]], area: [8.4, 2, 8.4] },
    cpuFan: { at: [-2, BOARD_TOP, -10.6], area: [2.2, 1.4, 1.6] },
    sysFan: { at: [-12.2, BOARD_TOP, 3.2], area: [2.2, 1.4, 1.6] },
    dimmA1: dimm(DIMM_X[0]),
    dimmA2: dimm(DIMM_X[1]),
    dimmB1: dimm(DIMM_X[2]),
    dimmB2: dimm(DIMM_X[3]),
    m2Slot: { at: [-3.4, BOARD_TOP + 0.35, 4.6], area: [9, 1, 2.8] }
  },
  lever: { control: "socketLever", pivot: [SOCKET[0] + 2.35, BOARD_TOP + 0.3, SOCKET[1] + 2.1], length: 4.2, upValue: "up" }
}

// ---------- the case ----------

/**
 * The case lies on its side with the open side up, its back towards the student, so the ports on
 * the back are in view. Case coordinates: x from the case's top (-x) to its bottom (+x), z from the
 * front (-z) to the back (+z), y up from the desk. The inside of the side wall the board stands on is at y = CASE_FLOOR.
 */
export const CASE_SIZE: Vec3 = [43, 21, 45]
export const CASE_FLOOR = 1
const STANDOFF = 0.6
/** Where our board's centre lands in the case, and its quarter turn there (3: the rear panel faces the back). */
export const BOARD_IN_CASE: Vec3 = [-7.3, CASE_FLOOR + STANDOFF, 6.2]
export const BOARD_TURN_IN_CASE = 3

/** A point on our board (board coordinates) in case coordinates, once the board is in the case. */
export const onBoard = (x: number, y: number, z: number): Vec3 => [BOARD_IN_CASE[0] + z, BOARD_IN_CASE[1] + y, BOARD_IN_CASE[2] - x]

const PSU_AT: Vec3 = [16.2, CASE_FLOOR, 14.4]
const HDD_AT: Vec3 = [14.1, CASE_FLOOR, -13.2]
/** The slot for the graphics card: card fingers sit 0.8 cm deep in the PCIe slot. */
const pcie = (at: readonly [number, number]): Vec3 => onBoard(at[0], BOARD_TOP + 1.1 - 0.8, at[1])
const GPU_AT = pcie(BOARD_CONNECTORS.pcieX16)
/** Where the graphics card's own connectors end up: power on its top edge, HDMI on its bracket. */
export const GPU_POWER_LOCAL: Vec3 = [1.9, 11.6, -7]
export const GPU_HDMI_LOCAL: Vec3 = [1.75, 2.0, 9.05]
/** The disk's connectors on its back end: data and power. */
export const HDD_DATA_LOCAL: Vec3 = [-2.6, 1.3, 7.4]
export const HDD_POWER_LOCAL: Vec3 = [1.0, 1.3, 7.4]
/** Where the power supply's cables come out: the middle of its side that faces the inside of the case. */
const PSU_CABLES: Vec3 = [PSU_AT[0] - 4.6, CASE_FLOOR + 4, PSU_AT[2] - 4]

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const BACK: Vec3 = [0, 0.45, 1]
/** Cables of the desk devices run from the back of the case down to the desk. */
const toDesk = (at: Vec3): Vec3 => [at[0], 0.3, at[2] + 10]
const UPRIGHT = Math.PI / 2
const rearPort = (port: readonly [number, number]): SlotPose => {
  const at = onBoard(REAR_FACE_X, BOARD_TOP + port[1], port[0])
  return { at, area: [1.1, 1.6, 1.4], view: BACK, cableFrom: toDesk(at), roll: UPRIGHT }
}

export const grade8CaseLayout: SceneLayout = {
  bench: "case",
  benchPart: "case",
  holdHeight: CASE_SIZE[1] + 4,
  overview: 100,
  power: { control: "power", on: "on" },
  slots: {
    psuBay: { at: PSU_AT, area: [8.8, 15, 14.2] },
    boardTray: { at: BOARD_IN_CASE, area: [24.6, 3, 30.7] },
    pcieX16: { at: GPU_AT, area: [1.6, 3, 9.4], view: [0.55, 0.8, 0.45] },
    pcieX1: { at: pcie(BOARD_CONNECTORS.pcieX1), area: [1.4, 2.4, 5.4], view: [0.55, 0.8, 0.45] },
    hddBay: { at: HDD_AT, area: [10.6, 3.4, 15] },
    atxPort: { at: onBoard(BOARD_CONNECTORS.atx24[0], BOARD_TOP + 1.6, BOARD_CONNECTORS.atx24[1]), area: [5.8, 2.4, 1.6], cableFrom: PSU_CABLES },
    cpuPowerPort: { at: onBoard(BOARD_CONNECTORS.eps8[0], BOARD_TOP + 1.2, BOARD_CONNECTORS.eps8[1]), area: [2.4, 2.2, 2.4], cableFrom: PSU_CABLES },
    gpuPowerPort: { at: add(GPU_AT, GPU_POWER_LOCAL), area: [2.4, 2.2, 2.4], cableFrom: PSU_CABLES, view: [0.3, 1, 0.5] },
    hddPowerPort: { at: add(HDD_AT, HDD_POWER_LOCAL), area: [2.6, 1.8, 1.8], cableFrom: PSU_CABLES },
    sataPort: {
      at: onBoard(BOARD_CONNECTORS.sata[0], BOARD_TOP + 0.9, BOARD_CONNECTORS.sata[1]),
      area: [1.8, 1.8, 1.8],
      cableFrom: add(HDD_AT, HDD_DATA_LOCAL)
    },
    caseSide: { at: [0, CASE_SIZE[1], 0], area: [CASE_SIZE[0], 1.2, CASE_SIZE[2]] },
    gpuHdmi: {
      at: add(GPU_AT, GPU_HDMI_LOCAL),
      area: [1.1, 1.8, 1.4],
      view: BACK,
      cableFrom: toDesk(add(GPU_AT, GPU_HDMI_LOCAL)),
      roll: UPRIGHT
    },
    boardHdmi: rearPort(REAR_PORTS.hdmi),
    usb1: rearPort(REAR_PORTS.usb1),
    usb2: rearPort(REAR_PORTS.usb2),
    usb3: rearPort(REAR_PORTS.usb3),
    usb4: rearPort(REAR_PORTS.usb4)
  },
  finale: { at: [0, 16, -24], distance: 110, view: [0.25, 0.55, 1] },
  buttons: [{ control: "power", at: [-CASE_SIZE[0] / 2 - 0.05, 10.5, -18], normal: [-1, 0, 0] }],
  props: [
    { kind: "monitor", at: [0, 0, -46] },
    { kind: "keyboard", at: [0, 0, -31] },
    { kind: "mouse", at: [29, 0, -31] }
  ]
}

// ---------- the grade 8 lab: the built computer at work ----------

const above = (v: Vec3, dy: number, dz = 0): Vec3 => [v[0], v[1] + dy, v[2] + dz]

/** The case scenario's computer, built and switched on, with markers for the data path and a smartphone on the desk. */
export const grade8LabLayout: SceneLayout = {
  ...grade8CaseLayout,
  props: [...(grade8CaseLayout.props ?? []), { kind: "smartphone", at: [24, 0, 34], yaw: 0.4 }],
  finale: { at: [0, 18, -30], distance: 105, view: [0.25, 0.55, 1] },
  stops: {
    usb: above(grade8CaseLayout.slots.usb3?.at ?? [0, 0, 0], 3, 3),
    ram: onBoard((DIMM_X[1] + DIMM_X[3]) / 2, BOARD_TOP + 12, DIMM_Z),
    cpu: onBoard(SOCKET[0], BOARD_TOP + 10, SOCKET[1]),
    gpu: add(GPU_AT, [1.9, 17, 0]),
    monitor: [0, 27, -44],
    ssd: onBoard(-3.4, BOARD_TOP + 1.5, 4.6),
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
/** The tower is turned half round: its back, with the ports, faces away from the student. */
const TOWER_YAW = Math.PI
/** The ports are seen from behind the system unit: the camera goes round to its back for the cables. */
const BEHIND: Vec3 = [-0.35, 0.5, -1]

const DESK_MONITOR: Vec3 = [-22, 0, -40]
const DESK_KEYBOARD: Vec3 = [-22, 0, -16]
const DESK_MOUSE: Vec3 = [10, 0, -16]
const CRATE_Z = 32
const CRATE_X = { in: -48, out: 0, store: 48 } as const
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
const towerPort = (slot: string): SlotPose => ({
  at: standing(grade8CaseLayout.slots[slot]?.at ?? [0, 0, 0]),
  area: [2.2, 2, 2.2],
  view: BEHIND,
  yaw: TOWER_YAW
})
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
  overview: 150,
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
  boxes: [
    { part: "monitor", at: [-50, 0, 8] },
    { part: "keyboard", at: [-30, 0, 8] },
    { part: "mouse", at: [-10, 0, 8] },
    { part: "speakers", at: [10, 0, 8] },
    { part: "printer", at: [30, 0, 8] },
    { part: "flash", at: [50, 0, 8] }
  ],
  finale: { at: [30, 18, -30], distance: 135, view: [-0.1, 0.5, 1] }
}

// ---------- troubleshooting: the built computers, one fault each ----------

const STRIP_AT: Vec3 = [44, 0, 8]

/** The grade 8 case, built: the picture needs the monitor on the graphics card and power to the processor; the files need the disk's cable. */
export const grade8FaultLayout: SceneLayout = {
  ...grade8CaseLayout,
  power: {
    control: "power",
    on: "on",
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
