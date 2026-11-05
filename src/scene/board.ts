import { type Group, type Material } from "three"
import type { Slot } from "../core/scenario.ts"
import { realModel } from "./gltf.ts"
import { M, box, boxes, cylinder, group, mat, mergeStatic, rounded, seeded, shadowed } from "./kit.ts"
import {
  BOARD_CONNECTORS,
  BOARD_HOLES,
  BOARD_TOP,
  type BoardFace,
  DIMM_KEY,
  DIMM_LENGTH,
  REAR_FACE_X,
  REAR_PORTS
} from "./layout.ts"
import { BOARD_D, BOARD_W, boardTexture, groovesTexture, pinGridTexture, socketTexture } from "./textures.ts"

type Rect = readonly [number, number, number, number] // x0, z0, x1, z1

const top = (face: Material, side: Material): Material[] => [side, side, face, side, side, side]

// ---------- slots and sockets the student uses ----------

const socketModel = (x: number, z: number): Group => {
  const body = box([4, 0.42, 4], top(mat("#ffffff", { map: socketTexture(), rough: 0.5 }), M.socket), x, BOARD_TOP, z)
  const g = group(body)
  // retention frame around the socket, with a screw in each corner
  const y = BOARD_TOP
  g.add(rounded([8, 0.55, 0.55], 0.12, M.satinBlack, x, y, z - 3.6))
  g.add(rounded([8, 0.55, 0.55], 0.12, M.satinBlack, x, y, z + 3.6))
  g.add(rounded([0.55, 0.55, 6.7], 0.12, M.satinBlack, x - 3.75, y, z))
  g.add(rounded([0.55, 0.55, 6.7], 0.12, M.satinBlack, x + 3.75, y, z))
  for (const [dx, dz] of [[-3.75, -3.6], [3.75, -3.6], [-3.75, 3.6], [3.75, 3.6]] as const) {
    g.add(cylinder(0.26, 0.12, M.aluminium, x + dx, y + 0.55, z + dz, 16))
  }
  return g
}

const dimmSlot = (x: number, z: number): Group => {
  const y = BOARD_TOP
  return group(
    box([0.7, 0.9, DIMM_LENGTH], M.blackPlastic, x, y, z),
    // the opening and the gold contacts inside it
    box([0.24, 0.02, DIMM_LENGTH - 0.3], M.chip, x, y + 0.9, z),
    box([0.08, 0.025, DIMM_LENGTH - 0.6], M.gold, x, y + 0.9, z),
    // the key: a light mark where the module's notch must be
    box([0.3, 0.035, 0.3], M.whitePlastic, x, y + 0.9, z + DIMM_KEY),
    // latches at both ends
    rounded([0.78, 1.35, 0.55], 0.08, M.whitePlastic, x, y, z - DIMM_LENGTH / 2 - 0.27),
    rounded([0.78, 1.35, 0.55], 0.08, M.whitePlastic, x, y, z + DIMM_LENGTH / 2 + 0.27),
    box([0.5, 0.2, 0.3], M.whitePlastic, x, y + 1.2, z - DIMM_LENGTH / 2 - 0.05),
    box([0.5, 0.2, 0.3], M.whitePlastic, x, y + 1.2, z + DIMM_LENGTH / 2 + 0.05)
  )
}

const fanHeader = (x: number, z: number): Group => {
  const g = group(box([1.25, 0.22, 0.62], M.whitePlastic, x, BOARD_TOP, z), box([1.25, 0.6, 0.08], M.whitePlastic, x, BOARD_TOP, z - 0.3))
  g.add(boxes([0.07, 0.55, 0.07], M.gold, [0, 1, 2, 3].map((i) => [x - 0.38 + i * 0.25, BOARD_TOP, z + 0.05] as const)))
  return g
}

const m2Connector = (x: number, z: number, standoffX: number): Group =>
  group(
    rounded([0.8, 0.45, 2.4], 0.06, M.blackPlastic, x, BOARD_TOP, z),
    box([0.1, 0.03, 2.1], M.gold, x - 0.25, BOARD_TOP + 0.45, z),
    cylinder(0.3, 0.32, M.gold, standoffX, BOARD_TOP, z, 16),
    cylinder(0.12, 0.34, M.chip, standoffX, BOARD_TOP, z, 12)
  )

// ---------- parts of the board the student does not install ----------

/** A heatsink of thin fins standing across its length, with a coloured cap at one end. */
const finnedHeatsink = (size: readonly [number, number, number], alongX: boolean, x: number, z: number): Group => {
  const [w, h, d] = size
  const base = 0.45
  const length = alongX ? w : d
  const count = Math.floor(length / 0.32)
  const fins = Array.from({ length: count }, (_, i) => {
    const t = -length / 2 + 0.16 + i * (length / count)
    return (alongX ? [x + t, BOARD_TOP + base, z] : [x, BOARD_TOP + base, z + t]) as [number, number, number]
  })
  const fin: readonly [number, number, number] = alongX ? [0.12, h - base, d] : [w, h - base, 0.12]
  const cap: readonly [number, number, number] = alongX ? [0.5, h + 0.05, d + 0.05] : [w + 0.05, h + 0.05, 0.5]
  const capAt = alongX ? [x + w / 2 - 0.25, z] : [x, z - d / 2 + 0.25]
  return group(
    box([w, base, d], M.gunmetal, x, BOARD_TOP, z),
    boxes(fin, M.gunmetal, fins),
    box(cap, M.accent, capAt[0] ?? x, BOARD_TOP, capAt[1] ?? z)
  )
}

const pcieSlot = (x: number, z: number, length: number, armoured: boolean): Group => {
  const g = group(
    box([length, 1.1, 0.85], armoured ? M.brushed : M.blackPlastic, x, BOARD_TOP, z),
    box([length - 0.3, 0.02, 0.3], M.chip, x, BOARD_TOP + 1.1, z),
    box([length - 0.6, 0.025, 0.08], M.gold, x, BOARD_TOP + 1.1, z)
  )
  if (armoured) g.add(rounded([0.7, 1.3, 0.95], 0.1, M.whitePlastic, x + length / 2 + 0.3, BOARD_TOP, z))
  return g
}

const rearPanel = (): Group => {
  const x = REAR_FACE_X + 1.65
  const z = -4.5
  const g = group(
    rounded([2.4, 3.6, 12], 0.25, M.satinBlack, x, BOARD_TOP, z),
    box([2.45, 0.25, 9], M.accent, x, BOARD_TOP + 3.2, z),
    box([0.2, 3.4, 11.6], M.aluminium, REAR_FACE_X + 0.4, BOARD_TOP, z)
  )
  // ports on the outside: USB (blue), HDMI, network, audio; each stands with its long side up
  const portX = REAR_FACE_X + 0.25
  const port = (key: keyof typeof REAR_PORTS, shell: readonly [number, number, number], inner: readonly [number, number, number], core: Material) => {
    const [pz, py] = REAR_PORTS[key]
    g.add(box(shell, M.aluminium, portX, BOARD_TOP + py - shell[1] / 2, pz), box(inner, core, portX, BOARD_TOP + py - inner[1] / 2, pz))
  }
  for (const key of ["usb1", "usb2", "usb3", "usb4"] as const) port(key, [0.5, 0.7, 1.3], [0.52, 0.2, 1.0], M.blueUsb)
  port("hdmi", [0.5, 1.5, 0.5], [0.52, 1.2, 0.28], M.chip)
  port("lan", [0.5, 1.2, 1.4], [0.52, 0.9, 1.0], M.chip)
  const audio: Array<[number, Material]> = [
    [0.4, M.yellow],
    [1.2, mat("#7bbf3a")],
    [2.0, mat("#e87ab0")]
  ]
  for (const [az, material] of audio) g.add(box([0.5, 0.5, 0.5], material, portX, BOARD_TOP + 0.4, az))
  return g
}

/** Board areas taken by the parts above, x0, z0, x1, z1: the tiny parts keep off them. */
const OCCUPIED: ReadonlyArray<Rect> = [
  [-3.4, -10.7, 4.8, -2.7], // socket and frame
  [-7, -10.7, -4.6, -1.7], // left VRM
  [-5.4, -12.7, 3.9, -10.6], // top VRM
  [-12.3, -11, -9.4, 2], // rear panel
  [5.6, -14, 9.6, 0.4], // DIMM slots
  [-8.3, 2.2, 2.3, 3.6], // PCIe x16
  [-9.6, 4.3, -3.6, 5.7], // PCIe x1
  [1.8, 4.3, 6.2, 8.7], // chipset
  [-5.4, -0.5, 3.6, 2.3], // M.2
  [10.7, -7.9, 12.3, -2.3], // 24-pin
  [10.6, 6.6, 12.2, 8.4], // SATA
  [-7.6, -15.4, -5.4, -14.2], // 8-pin
  [-7, -2.4, -5.4, -1], // SYS_FAN
  [4.2, -14, 6.2, -12.8], // CPU_FAN
  [8.8, 9, 11.2, 11.2], // CMOS battery
  [-4.3, -6.3, -3.5, 1.2], // chokes
  [5, -6, 6.2, -0.8] // capacitors
]

const free = (x: number, z: number): boolean =>
  Math.abs(x) < BOARD_W / 2 - 0.6 &&
  Math.abs(z) < BOARD_D / 2 - 0.6 &&
  !OCCUPIED.some(([x0, z0, x1, z1]) => x > x0 - 0.2 && x < x1 + 0.2 && z > z0 - 0.2 && z < z1 + 0.2)

/** Tiny parts in short neat rows, the way a pick-and-place machine sets them, not scattered at random. */
const smdParts = (): Group => {
  const rnd = seeded(23)
  const rows = (count: number, pitch: number): Array<[number, number, number]> => {
    const out: Array<[number, number, number]> = []
    let tries = 0
    while (out.length < count && tries++ < count * 40) {
      const x0 = (rnd() - 0.5) * (BOARD_W - 1)
      const z0 = (rnd() - 0.5) * (BOARD_D - 1)
      const alongX = rnd() < 0.5
      const n = 3 + Math.floor(rnd() * 6)
      for (let i = 0; i < n && out.length < count; i++) {
        const x = alongX ? x0 + i * pitch : x0
        const z = alongX ? z0 : z0 + i * pitch
        if (Math.abs(x) < BOARD_W / 2 - 0.3 && Math.abs(z) < BOARD_D / 2 - 0.3 && free(x, z)) out.push([x, BOARD_TOP, z])
      }
    }
    return out
  }
  const resistors = rows(360, 0.24)
  const caps = rows(140, 0.3)
  const chips = rows(10, 1.4)
  return group(
    boxes([0.16, 0.05, 0.08], M.smdDark, resistors),
    boxes([0.2, 0.1, 0.11], M.smdTan, caps),
    boxes([0.7, 0.12, 0.7], M.chip, chips, (i) => (i % 2 ? [0.7, 0.12, 0.7] : [1.0, 0.12, 0.55]))
  )
}

const at = ([x, z]: readonly [number, number]): [number, number, number] => [x, BOARD_TOP, z]

/** Two SATA ports stacked at the board's edge, for disks. */
const sataPorts = (): Group => {
  const [x, z] = BOARD_CONNECTORS.sata
  return group(
    rounded([1.3, 0.85, 1.6], 0.06, M.blackPlastic, x, BOARD_TOP, z),
    box([0.9, 0.02, 0.35], M.chip, x, BOARD_TOP + 0.85, z - 0.35),
    box([0.9, 0.02, 0.35], M.chip, x, BOARD_TOP + 0.85, z + 0.35)
  )
}

const decorations = (socket: readonly [number, number]): Group => {
  const [sx, sz] = socket
  const g = group(
    finnedHeatsink([2.2, 2.3, 8.5], false, sx - 6.5, sz + 0.5),
    finnedHeatsink([8.5, 2.3, 1.8], true, sx - 1.5, sz - 5),
    rearPanel(),
    pcieSlot(BOARD_CONNECTORS.pcieX16[0], BOARD_CONNECTORS.pcieX16[1], 9, true),
    pcieSlot(BOARD_CONNECTORS.pcieX1[0], BOARD_CONNECTORS.pcieX1[1], 5, false),
    rounded([4, 0.9, 4], 0.15, M.gunmetal, 4, BOARD_TOP, 6.5),
    box([3.2, 0.02, 3.2], mat("#ffffff", { map: groovesTexture(), metal: 0.6, rough: 0.4 }), 4, BOARD_TOP + 0.9, 6.5),
    box([1, 0.03, 1], M.accent, 5, BOARD_TOP + 0.92, 7.5),
    box([1.2, 1.6, 5.4], top(mat("#ffffff", { map: pinGridTexture(2, 12) }), M.whitePlastic), ...at(BOARD_CONNECTORS.atx24)),
    box([1.9, 1.2, 1], top(mat("#ffffff", { map: pinGridTexture(4, 2) }), M.blackPlastic), ...at(BOARD_CONNECTORS.eps8)),
    sataPorts(),
    cylinder(1.05, 0.25, M.blackPlastic, 10, BOARD_TOP, 10.1, 32),
    cylinder(0.95, 0.3, M.capTop, 10, BOARD_TOP + 0.1, 10.1, 32),
    smdParts()
  )
  // chokes: grey cubes beside the left heatsink
  g.add(boxes([0.75, 0.75, 0.75], M.darkMetal, [0, 1, 2, 3, 4, 5].map((i) => [sx - 4.5, BOARD_TOP, sz - 3 + i * 1.2] as const)))
  // capacitors right of the socket: dark cans with silver tops
  for (let i = 0; i < 4; i++) {
    g.add(cylinder(0.32, 0.85, M.chip, sx + 4.8, BOARD_TOP, sz - 2.4 + i * 1.5, 20))
    g.add(cylinder(0.31, 0.04, M.capTop, sx + 4.8, BOARD_TOP + 0.85, sz - 2.4 + i * 1.5, 20))
  }
  // mounting holes with gold rings
  for (const [hx, hz] of BOARD_HOLES) {
    g.add(cylinder(0.48, 0.02, M.gold, hx, BOARD_TOP, hz, 20))
    g.add(cylinder(0.2, 0.025, M.chip, hx, BOARD_TOP, hz, 16))
  }
  return g
}

type Poses = Readonly<Record<string, { readonly at: readonly [number, number, number] }>>

/**
 * The motherboard with its sockets and slots: the real board's model once it is loaded, otherwise one
 * built from the scenario's slots and where they are on the board.
 */
export const buildBoard = (face: BoardFace, slots: ReadonlyArray<Slot>, poses: Poses): Group => {
  const real = realModel("motherboard")
  if (real) return real
  const edge = mat("#1c2024")
  const pcb = box([BOARD_W, BOARD_TOP, BOARD_D], top(mat("#ffffff", { map: boardTexture(face), rough: 0.5 }), edge))
  const g = group(pcb, decorations(face.socket))
  for (const slot of slots) {
    const pose = poses[slot.id]
    if (!pose) continue
    const [x, , z] = pose.at
    if (slot.accepts.includes("cpu")) g.add(socketModel(x, z))
    else if (slot.accepts.includes("ram")) g.add(dimmSlot(x, z))
    else if (slot.accepts.includes("fanCable")) g.add(fanHeader(x, z))
    // the connector at the right end, as on the real board; the screw at the left
    else if (slot.accepts.includes("m2ssd")) g.add(m2Connector(x + 4.2, z, x - 4.0))
  }
  return shadowed(mergeStatic(g))
}

/** The socket lever: a metal bar along the socket's right side, pivoting at its front end. */
export const buildLever = (length: number): Group => {
  // its own material: the scene makes it glow when the lever is the next thing to click
  const metal = mat("#d0d5da", { metal: 0.9, rough: 0.3 })
  const bar = cylinder(0.14, length, metal)
  bar.rotation.x = Math.PI / 2
  bar.position.set(0, 0, -length / 2)
  const grip = rounded([0.75, 0.32, 0.55], 0.1, metal, -0.22, -0.16, -length)
  const pivot = cylinder(0.28, 0.45, mat("#24262a", { metal: 0.3, rough: 0.35 }), 0, -0.22, 0)
  return shadowed(group(bar, grip, pivot))
}

/** The desk and the antistatic mat under the board. */
/** The desk top's size, width and depth, when the layout does not ask for a bigger one. */
export const DESK_SIZE: readonly [number, number] = [160, 110]

export const buildDesk = (size: readonly [number, number] = DESK_SIZE): Group => {
  const desk = group(box([size[0], 2, size[1]], mat("#6e5236", { rough: 0.7 }), 0, -2, 0), box([52, 0.05, 38], mat("#2c4766", { rough: 0.95 }), 0, 0, 0))
  desk.traverse((o) => {
    o.receiveShadow = true
  })
  return desk
}
