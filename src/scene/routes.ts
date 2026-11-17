import { Vector3 } from "three"
import type { Vec3 } from "./ports.ts"

/**
 * Where every cable runs inside the case: one fixed way for each, the way a tidy builder lays it.
 *
 * A route is a list of steps, each along one axis only: to a given x, y or z, or to the other end's (`"end"`).
 * It starts where the cable has left its plug straight (the plug's lead) and ends at the lead of the plug on its
 * other end, or at the point the cable comes from (the hole in the power supply, the fan). So a cable never runs
 * at a slant, and where it goes behind the board tray it goes through a grommet. The tests check every route.
 *
 * Case coordinates: x from the case's top (-x) to its bottom (+x), y up from the side wall the board stands on,
 * z from the front (-z) to the back (+z).
 *
 * The tray, as measured on the case's model: flat at y 1.6 under the board; in front of the board it rises in a
 * slope with two long rubber grommets in it to a flat step at y 3; at the bottom (x > 11.36) it ends, and the
 * power supply and the disk stand in an open bay below it. Behind the tray, down to the side wall (y 0.25), the
 * cables are out of sight.
 */

export type Axis = "x" | "y" | "z"
export type RouteStep = readonly [Axis, number | "end"]

/** The tray's face under the board, and its underside. */
export const TRAY_Y = 1.6
export const TRAY_UNDER_Y = 1.46
/** The side wall's inner face: the floor of the space behind the tray. */
export const SIDE_WALL_Y = 0.25
/** The slope in front of the board, from its foot at the board's edge to its top at the step. */
export const SLOPE = { footZ: -1.54, footY: 1.5, topZ: -4.71, topY: 3.04 } as const
/** The step in front of the slope: its face, and its underside. */
export const STEP_Y = 3.03
export const STEP_UNDER_Y = 2.89
/** Where the tray ends at the bottom of the case: past it is the open bay of the power supply and the disk. */
export const TRAY_END_X = 11.36

/** How high the tray's face is at (x, z), or null in the open bay. */
export const trayTop = (x: number, z: number): number | null => {
  if (x > TRAY_END_X) return null
  if (z >= SLOPE.footZ) return TRAY_Y
  if (z <= SLOPE.topZ) return STEP_Y
  return SLOPE.footY + ((z - SLOPE.footZ) / (SLOPE.topZ - SLOPE.footZ)) * (SLOPE.topY - SLOPE.footY)
}

/** A hole in the tray with a rubber grommet: x and z of its corners. Cables pass the tray only through these. */
export interface Grommet {
  readonly id: string
  readonly x: readonly [number, number]
  readonly z: readonly [number, number]
  /** Only the code-built case needs it drawn: the case's model has its own. */
  readonly modelHasIt: boolean
}

export const GROMMETS: ReadonlyArray<Grommet> = [
  // the two long rubber strips in the slope in front of the board, as the case's model has them
  { id: "front1", x: [-11.8, -2.15], z: [SLOPE.topZ, SLOPE.footZ], modelHasIt: true },
  { id: "front2", x: [-2.08, 7.57], z: [SLOPE.topZ, SLOPE.footZ], modelHasIt: true },
  // above the board's top edge, for the processor's cable
  { id: "top", x: [-20.5, -19.9], z: [14.4, 17.6], modelHasIt: false }
]

/** The rear case fan, inside the back wall: its middle, its size, and where its cable leaves the frame. */
export const REAR_FAN = { at: [-10.6, 12.1, 21.0] as Vec3, size: 8.4, cableOut: [-6.7, 8.2, 20.4] as Vec3 }

/**
 * The heights cables run at behind the tray. Low enough to pass under the disk in the open bay (its bottom is
 * at y 1); the thin front panel wires run higher where they cross the others.
 */
export const BEHIND_Y = 0.63
const HIGH_Y = 1.15

/** Where the front panel's wires (buttons, audio, USB) come from: behind the tray at the front top corner, side by side. */
export const FRONT_IO = {
  panel: [-19.2, BEHIND_Y, -13.8] as Vec3,
  audio: [-18.8, HIGH_Y, -13.8] as Vec3,
  usb3: [-18.3, HIGH_Y + 0.05, -13.8] as Vec3
} as const

/**
 * Behind the slope the power cables run along x side by side, each in its own lane: the one nearest the board
 * turns off first in the bay, so none crosses another.
 */
export const FRONT_LANE_Z = { atx: -3.2, sata: -4.21, pcie: -4.95, usb3: -2.6 } as const

/** Runs a route from `from`, filling `"end"` with the coordinate of `end`. Returns the corners, `from` not included. */
export const runRoute = (from: Vector3, steps: ReadonlyArray<RouteStep>, end: Vector3): Vector3[] => {
  const points: Vector3[] = []
  const at = from.clone()
  for (const [axis, to] of steps) {
    at[axis] = to === "end" ? end[axis] : to
    points.push(at.clone())
  }
  return points
}

/** In the open bay in front of the power supply: where its built-in cables rise to its hole. */
const PSU_RISE_Z = 5.4
/** Past the tray's end: the front panel's wires go down into the bay there and back under the tray. */
const BAY_X = { audio: 11.5, panel: 11.75 } as const
const BAY_Z = { audio: 0.1, panel: 0.8 } as const
/** In front of the graphics card's front end, where its power cable goes down through the grommet. */
const GPU_FRONT_Z = -4.35

/**
 * The cable routes inside the case, by the slot of the plug the cable is drawn from. Each starts at that plug's
 * lead (the plug's straight way out) and ends at the other end's lead or at the point the cable comes from.
 */
export const ROUTES: Readonly<Record<string, ReadonlyArray<RouteStep>>> = {
  // 24-pin: up out of the plug, forward into the grommet in front of the board, behind the tray to the bay,
  // under the disk to the power supply and up into its hole
  atxPort: [
    ["z", FRONT_LANE_Z.atx],
    ["y", BEHIND_Y],
    ["x", "end"],
    ["z", PSU_RISE_Z],
    ["y", "end"],
    ["z", "end"]
  ],
  // CPU 8-pin: over the board's top edge into the grommet above it, behind the tray all the way to the power supply
  cpuPowerPort: [
    ["x", -20.2],
    ["y", BEHIND_Y],
    ["x", "end"],
    ["z", PSU_RISE_Z],
    ["y", "end"],
    ["z", "end"]
  ],
  // the graphics card's power: along the top of the card past its front end, down the front grommet, behind the
  // tray to the bay, and straight up the power supply's face into the PCI-E socket
  gpuPowerPort: [
    ["z", GPU_FRONT_Z],
    ["y", BEHIND_Y],
    ["z", FRONT_LANE_Z.pcie],
    ["x", "end"],
    ["z", "end"],
    ["y", "end"]
  ],
  // the disk's power: back from the disk in the bay, then up the power supply's face to the HDD/SATA socket
  hddPowerPort: [
    ["z", 3.3],
    ["x", "end"],
    ["y", "end"],
    ["z", "end"]
  ],
  // SATA data: out of the board's side port into the grommet beside it, behind the tray to the bay, up behind the disk
  sataPort: [
    ["y", BEHIND_Y],
    ["x", "end"],
    ["z", 2.6],
    ["y", "end"],
    ["z", "end"]
  ],
  // the front panel's buttons: over the board's bottom edge, down into the bay, back under the tray to the front
  fPanel: [
    ["z", BAY_Z.panel],
    ["x", BAY_X.panel],
    ["y", BEHIND_Y],
    ["x", "end"],
    ["z", "end"]
  ],
  // the front panel's audio: over the board's bottom edge into the bay, along it, back under the tray to the front
  hdAudio: [
    ["x", BAY_X.audio],
    ["y", HIGH_Y],
    ["z", BAY_Z.audio],
    ["x", "end"],
    ["z", "end"]
  ],
  // the front panel's USB: straight out of the side header into the grommet, behind the tray to the front
  usb3Header: [
    ["y", HIGH_Y + 0.05],
    ["z", FRONT_LANE_Z.usb3],
    ["x", "end"],
    ["z", "end"]
  ],
  // the rear fan: up from the header, over the rear ports' cover to the fan's frame
  chaFan: [
    ["y", "end"],
    ["z", "end"],
    ["x", "end"]
  ]
}

/** The cooler's fan wire on the desk board, in board coordinates: from the CPU_FAN header up the cooler's side. */
export const COOLER_FAN_CABLE: Vec3 = [4.7, 5.4, -10.9]
export const COOLER_ROUTE: ReadonlyArray<RouteStep> = [
  ["z", "end"],
  ["y", "end"],
  ["x", "end"]
]
