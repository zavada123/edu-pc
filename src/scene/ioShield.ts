import { ExtrudeGeometry, Group, Mesh, Path, Shape, ShapeGeometry } from "three"
import { mat } from "./kit.ts"
import { BOARD_IN_CASE, CASE_FRAMES, IO_REACH } from "./layout.ts"

/*
 * The realistic board's I/O shield. On a real build it comes in the board's box (each board has its own
 * cut-outs) and the case only has the standard opening; on this board, as on many higher-end ones, it is
 * built on, so it goes with the board: on the desk, into the case, into the tower. Measured where it stands
 * in the case and carried back into the board's own coordinates.
 */

/**
 * Where the shield stands once the board is in the realistic case: it fills the case's I/O opening (x, y in
 * case coordinates, measured on the case's file) against the inside of the back wall (z 21.96).
 */
const IO_SHIELD = { x: [-18.55, -2.2], y: [2.0, 6.5], z: 21.92, thick: 0.08 } as const

/**
 * The shield's cut-outs, one per block of the board's rear ports, in case x and height above the board
 * (measured on the board's file, from its top: the Wi-Fi antennas, USB and USB-C, DVI with HDMI and
 * DisplayPort, the USB 2 pair, LAN over USB 3, the audio jacks). Round them the plate stays whole.
 */
const IO_PORT_HOLES: ReadonlyArray<{ readonly x: readonly [number, number]; readonly y: readonly [number, number] }> = [
  { x: [-17.85, -16.85], y: [-0.05, 3.55] },
  { x: [-16.75, -15.45], y: [-0.05, 1.75] },
  { x: [-14.65, -10.65], y: [0.05, 2.75] },
  { x: [-10.25, -8.95], y: [-0.05, 1.75] },
  { x: [-8.55, -6.85], y: [-0.05, 2.95] },
  { x: [-6.45, -4.25], y: [0.05, 3.45] },
]

/**
 * The back of the cut-outs, just behind the ports' faces (the deepest, HDMI and DisplayPort, are 1.56 behind
 * the board's own I/O cover):
 * the port block's own cover has gaps between its ports, so without it the board's inside shows through them.
 */
const IO_BACKING_Z = 20.05 + IO_REACH

const rect = (x0: number, x1: number, y0: number, y1: number, path: Path = new Path()): Path =>
  path.moveTo(x0, y0).lineTo(x0, y1).lineTo(x1, y1).lineTo(x1, y0).closePath()

/** The shield plate with a cut-out for each block of rear ports, in case coordinates. */
const ioShieldPlate = (): Mesh => {
  const [x0, x1] = IO_SHIELD.x
  const [y0, y1] = IO_SHIELD.y
  const boardY = BOARD_IN_CASE[1]
  const plate = new Shape().moveTo(x0, y0).lineTo(x1, y0).lineTo(x1, y1).lineTo(x0, y1).closePath()
  const holes = IO_PORT_HOLES.map((h) => ({
    x: h.x,
    y: [Math.max(y0 + 0.01, boardY + h.y[0]), Math.min(y1 - 0.01, boardY + h.y[1])] as const,
  }))
  for (const h of holes) plate.holes.push(rect(h.x[0], h.x[1], h.y[0], h.y[1]))
  const mesh = new Mesh(new ExtrudeGeometry(plate, { depth: IO_SHIELD.thick, bevelEnabled: false }), mat("#d2d2d2", { metal: 0.35, rough: 0.45 }))
  mesh.position.z = IO_SHIELD.z - IO_SHIELD.thick / 2
  mesh.receiveShadow = true
  const bx0 = Math.min(...holes.map((h) => h.x[0]))
  const bx1 = Math.max(...holes.map((h) => h.x[1]))
  const by0 = Math.min(...holes.map((h) => h.y[0]))
  const by1 = Math.max(...holes.map((h) => h.y[1]))
  const back = rect(bx0, bx1, by0, by1, new Shape()) as Shape
  const backing = new Mesh(new ShapeGeometry(back), mat("#5d6268", { metal: 0.6, rough: 0.6 }))
  backing.position.z = IO_BACKING_Z - mesh.position.z
  mesh.add(backing)
  return mesh
}

/** The I/O shield on the realistic board, in the board's own coordinates: it fills the case's I/O opening once the board is in. */
export const boardIoShield = (): Group => {
  const toBoard = new Group()
  CASE_FRAMES.board.matrix.clone().invert().decompose(toBoard.position, toBoard.quaternion, toBoard.scale)
  toBoard.add(ioShieldPlate())
  return toBoard
}
