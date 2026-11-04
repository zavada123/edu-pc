import type { Group } from "three"
import { M, box, cylinder, fanRotor, group, mat, mergeStatic, rounded, shadowed } from "./kit.ts"
import { BOARD_IN_CASE, CASE_FLOOR, CASE_SIZE, onBoard } from "./layout.ts"
import { fanGrilleTexture, honeycombTexture } from "./textures.ts"

/**
 * The case, lying on its side with the side panel off: the inside of the far side wall is the floor
 * the board stands on. The back faces the student (+z) with holes for the board's ports, the
 * graphics card's bracket and the power supply. See layout.ts for the coordinates.
 */

type Rect = readonly [number, number, number, number] // x0, y0, x1, y1

const [W, H, D] = CASE_SIZE
const WALL = 1
const steel = mat("#1d1f23", { metal: 0.6, rough: 0.45 })
const inside = mat("#2a2d33", { metal: 0.5, rough: 0.55 })

/** A wall in the x–y plane at depth z with rectangular holes, made of the boxes between the holes. */
const wallWithHoles = (outer: Rect, holes: ReadonlyArray<Rect>, z: number, depth: number): Group => {
  const xs = [...new Set([outer[0], outer[2], ...holes.flatMap((h) => [h[0], h[2]])])].sort((a, b) => a - b)
  const ys = [...new Set([outer[1], outer[3], ...holes.flatMap((h) => [h[1], h[3]])])].sort((a, b) => a - b)
  const g = group()
  for (let i = 0; i + 1 < xs.length; i++) {
    for (let j = 0; j + 1 < ys.length; j++) {
      const [x0, x1, y0, y1] = [xs[i] ?? 0, xs[i + 1] ?? 0, ys[j] ?? 0, ys[j + 1] ?? 0]
      const cx = (x0 + x1) / 2
      const cy = (y0 + y1) / 2
      if (holes.some((h) => cx > h[0] && cx < h[2] && cy > h[1] && cy < h[3])) continue
      g.add(box([x1 - x0, y1 - y0, depth], steel, cx, y0, z))
    }
  }
  return g
}

/** A 12 cm case fan lying in the x–z plane, blowing along y; turn it to face where it should. */
const caseFan = (): Group => {
  const frame = M.satinBlack
  const s = 12
  const g = group(
    box([s, 2.5, 0.8], frame, 0, 0, -s / 2 + 0.4),
    box([s, 2.5, 0.8], frame, 0, 0, s / 2 - 0.4),
    box([0.8, 2.5, s], frame, -s / 2 + 0.4, 0, 0),
    box([0.8, 2.5, s], frame, s / 2 - 0.4, 0, 0)
  )
  g.add(fanRotor(5.4, 7, mat("#2a2d33", { rough: 0.4 }), mat("#1b1d21", { rough: 0.4 }), 1.4))
  return g
}

/** The holes in the back wall, x and y in case coordinates. */
const IO_HOLE: Rect = [-19.2, 1.6, -6.4, 5.8]
const SLOTS_HOLE: Rect = [0.8, 1.8, 6.2, 15]
const PSU_HOLE: Rect = [11.9, CASE_FLOOR, W / 2 - WALL, 16.2]

export const buildCase = (): Group => {
  const x0 = -W / 2
  const z0 = -D / 2
  const g = group(
    // the far side wall: the floor the board stands on
    box([W, CASE_FLOOR, D], [steel, steel, inside, steel, steel, steel], 0, 0, 0),
    // the top (-x) and bottom (+x) walls
    box([WALL, H - CASE_FLOOR, D], steel, x0 + WALL / 2, CASE_FLOOR, 0),
    box([WALL, H - CASE_FLOOR, D], steel, -x0 - WALL / 2, CASE_FLOOR, 0),
    // the front wall, with a mesh panel outside
    box([W - 2 * WALL, H - CASE_FLOOR, WALL], steel, 0, CASE_FLOOR, z0 + WALL / 2),
    box([W - 6, H - 5, 0.1], mat("#ffffff", { map: honeycombTexture("#24262a"), rough: 0.6 }), 0, CASE_FLOOR + 2, z0 - 0.05),
    // the back wall with its holes, slot covers and the vent of the rear fan
    wallWithHoles([x0 + WALL, CASE_FLOOR, -x0 - WALL, H], [IO_HOLE, SLOTS_HOLE, PSU_HOLE], -z0 - WALL / 2, WALL),
    box([12, 12, 0.1], mat("#ffffff", { map: fanGrilleTexture(), rough: 0.6 }), -13.5, 7.5, -z0 + 0.06)
  )
  for (let i = 0; i < 3; i++) g.add(box([0.9, 13, 0.2], M.aluminium, 6.9 + i * 1.05, 1.9, -z0 - 0.1))
  // the edges of the open side, a little lighter, so the case reads as a box
  g.add(
    box([W, 0.15, 0.6], M.gunmetal, 0, H, z0 + 0.3),
    box([W, 0.15, 0.6], M.gunmetal, 0, H, -z0 - 0.3),
    box([0.6, 0.15, D], M.gunmetal, x0 + 0.3, H, 0),
    box([0.6, 0.15, D], M.gunmetal, -x0 - 0.3, H, 0)
  )
  // brass standoffs under the board's mounting holes
  for (const [hx, hz] of [[-13.8, -10.8], [13.8, -10.8], [-13.8, 10.8], [13.8, 10.8], [3.5, -10.8], [3.5, 10.8], [13.8, 0]] as const) {
    const [sx, , sz] = onBoard(hx, 0, hz)
    g.add(cylinder(0.32, BOARD_IN_CASE[1] - CASE_FLOOR, M.gold, sx, CASE_FLOOR, sz, 12))
  }
  // the cage for the disk, at the front
  g.add(box([0.3, 3.4, 15.6], M.aluminium, 8.6, CASE_FLOOR, -13.2), box([0.3, 3.4, 15.6], M.aluminium, 19.6, CASE_FLOOR, -13.2))
  // fans: one at the back blowing out, two at the front blowing in
  const rear = caseFan()
  rear.rotation.x = Math.PI / 2
  rear.position.set(-13.5, 13.5, -z0 - WALL - 2.5)
  const front1 = caseFan()
  front1.rotation.x = -Math.PI / 2
  front1.position.set(-13.5, 11, z0 + WALL + 2.5)
  const front2 = caseFan()
  front2.rotation.x = -Math.PI / 2
  front2.position.set(-0.5, 11, z0 + WALL + 2.5)
  g.add(rear, front1, front2)
  // front panel ports and the power button's surround, on the top wall near the front
  g.add(rounded([0.3, 5, 9], 0.1, M.blackPlastic, x0 - 0.15, 8, -16.5))
  g.add(box([0.1, 0.5, 1.3], M.blueUsb, x0 - 0.32, 9, -14.2), box([0.1, 0.5, 1.3], M.blueUsb, x0 - 0.32, 10.2, -14.2))
  return shadowed(mergeStatic(g))
}

/**
 * The power button: a round button with a light ring. Its face points along -x (the case's top);
 * the scene places it, makes it glow as a hint and lights the ring once the computer is on.
 */
export const powerButton = (): Group => {
  const ring = mat("#1fa7a0", { rough: 0.3, metal: 0.2 })
  ring.emissive.set("#1fa7a0")
  ring.emissiveIntensity = 0
  const r = cylinder(1.05, 0.25, ring, 0, 0, 0, 32)
  r.userData.light = true
  const button = cylinder(0.85, 0.4, mat("#c9ced3", { metal: 0.85, rough: 0.3 }), 0, 0, 0, 32)
  const g = group(r, button)
  // cylinders stand along y; lay the button on its side so its face points -x
  g.rotation.z = Math.PI / 2
  return shadowed(g)
}
