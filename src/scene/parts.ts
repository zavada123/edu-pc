import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  type Material,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  SphereGeometry,
  type Texture,
  TubeGeometry,
  Vector3
} from "three"
import type { PartKind } from "../core/parts.ts"
import type { Slot } from "../core/scenario.ts"
import { BOARD_TOP, DIMM_KEY, DIMM_LENGTH, type SceneLayout } from "./layout.ts"
import { BOARD_D, BOARD_W, boardTexture, cpuLidTexture, ramTexture, ssdTexture } from "./textures.ts"

/** A physically based material. Every part is modelled in code from boxes and cylinders. */
const mat = (color: string, opts: { metal?: number; rough?: number; map?: Texture } = {}): MeshStandardMaterial =>
  new MeshStandardMaterial({
    color,
    metalness: opts.metal ?? 0,
    roughness: opts.rough ?? 0.6,
    ...(opts.map ? { map: opts.map } : {})
  })

const M = {
  blackPlastic: mat("#16181b", { rough: 0.45 }),
  whitePlastic: mat("#e9e4d8", { rough: 0.5 }),
  socket: mat("#e6dcc1", { rough: 0.55 }),
  aluminium: mat("#c7ccd1", { metal: 0.9, rough: 0.35 }),
  darkMetal: mat("#4a5058", { metal: 0.8, rough: 0.4 }),
  copper: mat("#b87333", { metal: 0.9, rough: 0.3 }),
  gold: mat("#d4af37", { metal: 1, rough: 0.3 }),
  greenPcb: mat("#1f5e3a", { rough: 0.6 }),
  paste: mat("#9aa0a6", { rough: 0.25, metal: 0.2 }),
  rubber: mat("#2b2f36", { rough: 0.9 }),
  cap: mat("#3b3f46", { metal: 0.6, rough: 0.35 })
}

type Size = readonly [number, number, number]

/** A box with its bottom at `y` (not its centre), the way parts sit on the board. */
const box = (size: Size, material: Material | Material[], x = 0, y = 0, z = 0): Mesh => {
  const mesh = new Mesh(new BoxGeometry(size[0], size[1], size[2]), material)
  mesh.position.set(x, y + size[1] / 2, z)
  return mesh
}

const cylinder = (r: number, h: number, material: Material, x = 0, y = 0, z = 0): Mesh => {
  const mesh = new Mesh(new CylinderGeometry(r, r, h, 24), material)
  mesh.position.set(x, y + h / 2, z)
  return mesh
}

const group = (...children: Object3D[]): Group => {
  const g = new Group()
  for (const c of children) g.add(c)
  return g
}

// ---------- parts the student holds and places ----------

const cpu = (): Group => {
  const lid = mat("#ffffff", { metal: 0.85, rough: 0.35, map: cpuLidTexture() })
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z. Only the top shows the printed lid.
  return group(box([4, 0.12, 4], M.greenPcb), box([3.4, 0.28, 3.4], [M.aluminium, M.aluminium, lid, M.aluminium, M.aluminium, M.aluminium], 0, 0.12))
}

const pasteTube = (): Group => {
  const tube = cylinder(0.35, 3, M.paste)
  tube.rotation.z = Math.PI / 2
  tube.position.y = 0.35
  const tip = cylinder(0.12, 0.6, M.blackPlastic)
  tip.rotation.z = Math.PI / 2
  tip.position.set(1.8, 0.35, 0)
  return group(tube, tip)
}

const pasteBlob = (): Group => {
  const blob = new Mesh(new SphereGeometry(0.45, 20, 12), M.paste)
  blob.scale.y = 0.35
  blob.position.y = 0.1
  return group(blob)
}

const cooler = (): Group => {
  const g = group(box([3.6, 0.3, 3.6], M.copper))
  for (let i = 0; i < 16; i++) g.add(box([7.2, 2.6, 0.08], M.aluminium, 0, 0.3, -3.5 + i * 0.466))
  const fanFrame = cylinder(3.5, 0.9, M.blackPlastic, 0, 2.9)
  g.add(fanFrame)
  for (let i = 0; i < 7; i++) {
    const blade = box([2.8, 0.05, 1], M.rubber, 0, 3.82)
    blade.rotation.y = (i / 7) * Math.PI * 2
    blade.translateX(1.6)
    blade.rotation.x = 0.35
    g.add(blade)
  }
  g.add(cylinder(1.1, 0.1, mat("#c9a227", { rough: 0.4 }), 0, 3.85))
  return g
}

const fanPlug = (): Group => {
  const wire = new CatmullRomCurve3([new Vector3(0, 0.6, 0), new Vector3(0, 1.4, 0.8), new Vector3(0, 1.8, 2.2)])
  return group(box([1.2, 0.6, 0.55], M.blackPlastic), new Mesh(new TubeGeometry(wire, 16, 0.12, 8), M.rubber))
}

/** A RAM module stands along z. Its notch is off centre, so turned around it no longer fits the slot's key. */
const ram = (): Group => {
  const side = mat("#ffffff", { map: ramTexture() })
  const faces = [side, side, M.greenPcb, M.greenPcb, M.greenPcb, M.greenPcb]
  const upper = box([0.14, 2.75, DIMM_LENGTH], faces, 0, 0.35)
  const gap = 0.35
  const frontLen = DIMM_LENGTH / 2 - DIMM_KEY - gap / 2
  const backLen = DIMM_LENGTH / 2 + DIMM_KEY - gap / 2
  const front = box([0.14, 0.35, frontLen], M.gold, 0, 0, DIMM_LENGTH / 2 - frontLen / 2)
  const back = box([0.14, 0.35, backLen], M.gold, 0, 0, -DIMM_LENGTH / 2 + backLen / 2)
  return group(upper, front, back)
}

const m2ssd = (): Group => {
  const top = mat("#ffffff", { map: ssdTexture() })
  return group(box([8, 0.1, 2.2], [M.blackPlastic, M.blackPlastic, top, M.blackPlastic, M.blackPlastic, M.blackPlastic]))
}

/** A plain labelled box for parts later stages model properly (PSU, GPU, case, peripherals). */
const placeholder = (): Group => group(box([4, 2, 4], M.darkMetal))

/** The 3D model of a part. `placed` is the look once installed (thermal paste: the tube becomes a blob). */
export const buildPart = (kind: PartKind, placed: boolean): Group => {
  switch (kind) {
    case "cpu":
      return cpu()
    case "thermalPaste":
      return placed ? pasteBlob() : pasteTube()
    case "cooler":
      return cooler()
    case "fanCable":
      return fanPlug()
    case "ram":
      return ram()
    case "m2ssd":
      return m2ssd()
    default:
      return placeholder()
  }
}

// ---------- the board ----------

const socketModel = (x: number, z: number): Group => {
  const g = group(box([4, 0.42, 4], M.socket, x, BOARD_TOP, z), box([3.3, 0.02, 3.3], mat("#c9bc9b"), x, BOARD_TOP + 0.42, z))
  // retention frame for the cooler around the socket
  const frame = 0.5
  g.add(box([8, 0.5, frame], M.blackPlastic, x, BOARD_TOP, z - 3.6))
  g.add(box([8, 0.5, frame], M.blackPlastic, x, BOARD_TOP, z + 3.6))
  g.add(box([frame, 0.5, 6.7], M.blackPlastic, x - 3.75, BOARD_TOP, z))
  g.add(box([frame, 0.5, 6.7], M.blackPlastic, x + 3.75, BOARD_TOP, z))
  return g
}

const dimmSlot = (x: number, z: number): Group =>
  group(
    box([0.7, 0.9, DIMM_LENGTH], M.blackPlastic, x, BOARD_TOP, z),
    // the key: a small light mark where the module's notch must be
    box([0.72, 0.03, 0.3], M.whitePlastic, x, BOARD_TOP + 0.9, z + DIMM_KEY),
    box([0.75, 1.3, 0.5], M.whitePlastic, x, BOARD_TOP, z - DIMM_LENGTH / 2 - 0.25),
    box([0.75, 1.3, 0.5], M.whitePlastic, x, BOARD_TOP, z + DIMM_LENGTH / 2 + 0.25)
  )

const fanHeader = (x: number, z: number): Group => {
  const g = group(box([1.25, 0.25, 0.6], M.whitePlastic, x, BOARD_TOP, z))
  for (let i = 0; i < 4; i++) g.add(box([0.07, 0.55, 0.07], M.gold, x - 0.38 + i * 0.25, BOARD_TOP, z))
  return g
}

const m2Connector = (x: number, z: number): Group =>
  group(box([0.8, 0.45, 2.4], M.blackPlastic, x, BOARD_TOP, z), cylinder(0.25, 0.35, M.gold, x + 8.2, BOARD_TOP, z))

/** Parts of the board the student does not install: heatsinks, PCIe slots, the rear panel, the power connector. */
const decorations = (socket: readonly [number, number]): Group => {
  const [sx, sz] = socket
  const g = group(
    box([2.2, 2, 8.5], M.darkMetal, sx - 6.5, BOARD_TOP, sz + 0.5),
    box([8.5, 2, 1.8], M.darkMetal, sx - 1.5, BOARD_TOP, sz - 5),
    box([2.4, 3.6, 12], M.aluminium, -13.8, BOARD_TOP, -5.5),
    box([9, 1.1, 0.85], M.blackPlastic, -6.5, BOARD_TOP, 8.8),
    box([5, 1.1, 0.85], M.blackPlastic, -8.5, BOARD_TOP, 11),
    box([4, 0.9, 4], M.aluminium, 4, BOARD_TOP, 6.5),
    box([1.2, 1.6, 5.4], M.whitePlastic, 14.2, BOARD_TOP, -3)
  )
  for (let i = 0; i < 6; i++) g.add(cylinder(0.32, 0.9, M.cap, sx - 4.6 + i * 1.6, BOARD_TOP, sz - 6.6))
  for (let i = 0; i < 4; i++) g.add(cylinder(0.32, 0.9, M.cap, sx + 4.6, BOARD_TOP, sz - 2.4 + i * 1.6))
  return g
}

/** The motherboard with its sockets and slots, built from the scenario's slots and their places in the layout. */
export const buildBoard = (layout: SceneLayout, slots: ReadonlyArray<Slot>): Group => {
  const top = mat("#ffffff", { map: boardTexture(layout), rough: 0.55 })
  const edge = mat("#17201d")
  const g = group(box([BOARD_W, BOARD_TOP, BOARD_D], [edge, edge, top, edge, edge, edge]), decorations(layout.socket))
  for (const slot of slots) {
    const pose = layout.slots[slot.id]
    if (!pose) continue
    const [x, , z] = pose.at
    if (slot.accepts.includes("cpu")) g.add(socketModel(x, z))
    else if (slot.accepts.includes("ram")) g.add(dimmSlot(x, z))
    else if (slot.accepts.includes("fanCable")) g.add(fanHeader(x, z))
    else if (slot.accepts.includes("m2ssd")) g.add(m2Connector(x - 4.2, z))
  }
  return g
}

/** The socket lever: a metal bar lying along the socket's right side, pivoting at its front end. */
export const buildLever = (length: number): Group => {
  // its own material: the scene makes it glow when the lever is the next thing to click
  const metal = mat("#d0d5da", { metal: 0.9, rough: 0.3 })
  const bar = cylinder(0.16, length, metal)
  bar.rotation.x = Math.PI / 2
  bar.position.set(0, 0, -length / 2)
  const grip = box([0.7, 0.3, 0.5], metal, -0.2, -0.15, -length)
  const pivot = cylinder(0.3, 0.5, M.darkMetal, 0, -0.25, 0)
  return group(bar, grip, pivot)
}

/** The desk and the antistatic mat under the board. */
export const buildDesk = (): Group =>
  group(box([160, 2, 110], mat("#7a5a3c", { rough: 0.75 }), 0, -2, 0), box([52, 0.04, 38], mat("#2f4a6b", { rough: 0.95 }), 0, 0, 0))
