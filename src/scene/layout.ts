/** Board coordinates are centimetres: x to the right, z towards the student, y up from the desk. */
export type Vec3 = readonly [number, number, number]

/** Where a part stands once it is placed in a slot, and the click area around the slot. */
export interface SlotPose {
  /** Bottom centre of the placed part. */
  readonly at: Vec3
  /** Size of the click area (and the highlight box) around the slot. */
  readonly area: Vec3
}

/** The socket lever: its pivot, and which value means «up». */
export interface LeverPose {
  readonly control: string
  readonly pivot: Vec3
  readonly length: number
  readonly upValue: string
}

/** Labels printed on the board, next to what they name. */
export interface Silkscreen {
  readonly text: string
  readonly at: readonly [number, number]
  readonly size?: number
}

/** How a scenario looks in 3D: where each of its slots and controls is on the board. */
export interface SceneLayout {
  readonly slots: Readonly<Record<string, SlotPose>>
  readonly lever?: LeverPose
  readonly labels: ReadonlyArray<Silkscreen>
  /** The part that is the board itself: clicking the board inspects it. */
  readonly boardPart?: string
  /** Centre of the CPU socket on the board, x and z. */
  readonly socket: readonly [number, number]
}

export const BOARD_TOP = 0.16
const SOCKET: readonly [number, number] = [-2, -4]
const DIMM_X = [5.2, 6.1, 7.0, 7.9] as const
const DIMM_Z = -3.5

export const DIMM_LENGTH = 13.3
/** Where the key in a RAM slot sits, along the slot from its centre. A module fits only with its notch here. */
export const DIMM_KEY = 1.3

const dimm = (x: number): SlotPose => ({ at: [x, BOARD_TOP + 0.55, DIMM_Z], area: [0.8, 1.4, DIMM_LENGTH + 0.3] })

/** Layout of the grade 8 desk scenario (a board of our own design, roughly ATX-sized). */
export const grade8DeskLayout: SceneLayout = {
  boardPart: "board",
  socket: SOCKET,
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
  lever: { control: "socketLever", pivot: [SOCKET[0] + 2.35, BOARD_TOP + 0.3, SOCKET[1] + 2.1], length: 4.2, upValue: "up" },
  labels: [
    { text: "CPU_FAN", at: [-2, -11.6] },
    { text: "SYS_FAN", at: [-12.2, 4.3] },
    { text: "A1", at: [DIMM_X[0], -10.9], size: 0.55 },
    { text: "A2", at: [DIMM_X[1], -10.9], size: 0.55 },
    { text: "B1", at: [DIMM_X[2], -10.9], size: 0.55 },
    { text: "B2", at: [DIMM_X[3], -10.9], size: 0.55 },
    { text: "M.2", at: [-8.6, 6.4] },
    { text: "CPU", at: [-3.6, 0.7] },
    { text: "EDU BOARD 8", at: [10.5, 9.5], size: 0.9 }
  ]
}

/** Layouts by scenario id. */
export const layouts: Readonly<Record<string, SceneLayout>> = {
  "grade8-club-desk": grade8DeskLayout
}
