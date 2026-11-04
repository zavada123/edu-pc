import { CatmullRomCurve3, CylinderGeometry, DoubleSide, type Group, Mesh, PlaneGeometry, SphereGeometry, TubeGeometry, Vector3 } from "three"
import type { PartKind } from "../core/parts.ts"
import { M, box, boxes, cylinder, fanRotor, group, mat, rounded, seeded, shadowed } from "./kit.ts"
import { DIMM_KEY, DIMM_LENGTH } from "./layout.ts"
import { chipTexture, cpuLidTexture, fingersTexture, hubTexture, stickerTexture } from "./textures.ts"

/** A flat picture lying face up at height `y`. A canvas's top edge points to -z. */
const decal = (w: number, d: number, map: ReturnType<typeof stickerTexture>, x = 0, y = 0, z = 0): Mesh => {
  const mesh = new Mesh(new PlaneGeometry(w, d), mat("#ffffff", { map, rough: 0.55 }))
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(x, y, z)
  return mesh
}

// ---------- processor ----------

/** Green substrate with tiny capacitors around a metal lid. The lid's triangle is in the front-left corner. */
const cpu = (): Group => {
  const rnd = seeded(5)
  const caps: Array<[number, number, number]> = []
  for (let i = 0; i < 26; i++) {
    const along = -1.6 + rnd() * 3.2
    const side = i % 4
    const [x, z] = side === 0 ? [along, -1.85] : side === 1 ? [along, 1.85] : side === 2 ? [-1.85, along] : [1.85, along]
    caps.push([x, 0.12, z])
  }
  return group(
    rounded([4, 0.12, 4], 0.04, M.greenPcb),
    boxes([0.14, 0.06, 0.08], M.smdTan, caps, (i) => (i % 4 < 2 ? [0.14, 0.06, 0.08] : [0.08, 0.06, 0.14])),
    // the substrate's own gold triangle, under the lid's
    box([0.3, 0.01, 0.3], M.gold, -1.8, 0.12, 1.8),
    rounded([3.4, 0.28, 3.4], 0.08, M.aluminium, 0, 0.12),
    decal(3.3, 3.3, cpuLidTexture(), 0, 0.405, 0)
  )
}

// ---------- thermal paste ----------

/** A syringe: white body, grey paste inside, a plunger and a nozzle. */
const pasteSyringe = (): Group => {
  const along = (mesh: Mesh): Mesh => {
    mesh.rotation.z = Math.PI / 2
    return mesh
  }
  const body = along(new Mesh(new CylinderGeometry(0.36, 0.36, 2.6, 24), mat("#f2f4f5", { rough: 0.3 })))
  const fill = along(new Mesh(new CylinderGeometry(0.3, 0.3, 1.8, 20), M.paste))
  fill.position.set(0.35, 0, 0)
  const ring = along(new Mesh(new CylinderGeometry(0.38, 0.38, 0.18, 24), M.accent))
  ring.position.set(-0.7, 0, 0)
  const nozzle = along(new Mesh(new CylinderGeometry(0.08, 0.28, 0.7, 20), mat("#f2f4f5", { rough: 0.3 })))
  nozzle.position.set(1.65, 0, 0)
  const rod = along(new Mesh(new CylinderGeometry(0.1, 0.1, 1.1, 12), mat("#d9dde1", { rough: 0.4 })))
  rod.position.set(-1.8, 0, 0)
  const thumb = along(new Mesh(new CylinderGeometry(0.42, 0.42, 0.1, 24), mat("#d9dde1", { rough: 0.4 })))
  thumb.position.set(-2.35, 0, 0)
  const g = group(body, fill, ring, nozzle, rod, thumb)
  g.position.y = 0.42
  return group(g)
}

/** A pea-sized blob, flattened a little, on the CPU's lid. */
const pasteBlob = (): Group => {
  const blob = new Mesh(new SphereGeometry(0.5, 24, 14), M.paste)
  blob.scale.set(1, 0.32, 0.9)
  blob.position.y = 0.06
  const tip = new Mesh(new SphereGeometry(0.16, 12, 8), M.paste)
  tip.position.set(0.08, 0.2, -0.05)
  return group(blob, tip)
}

// ---------- cooler ----------

const fan = (y: number): Group => {
  const frame = M.satinBlack
  const g = group(
    rounded([7.4, 1, 0.4], 0.12, frame, 0, y, -3.5),
    rounded([7.4, 1, 0.4], 0.12, frame, 0, y, 3.5),
    rounded([0.4, 1, 7.4], 0.12, frame, -3.5, y, 0),
    rounded([0.4, 1, 7.4], 0.12, frame, 3.5, y, 0)
  )
  const shroud = new Mesh(new CylinderGeometry(3.4, 3.4, 1, 48, 1, true), mat("#202226", { rough: 0.45, metal: 0.2 }))
  shroud.material.side = DoubleSide
  shroud.position.y = y + 0.5
  g.add(shroud)
  for (const [cx, cz] of [[-3.3, -3.3], [3.3, -3.3], [-3.3, 3.3], [3.3, 3.3]] as const) {
    g.add(rounded([1.1, 1, 1.1], 0.15, frame, cx, y, cz))
    g.add(cylinder(0.22, 0.02, M.darkMetal, cx, y + 1, cz, 12))
  }
  // four struts from the motor to the corners, under the blades
  for (let i = 0; i < 4; i++) {
    const strut = box([4.4, 0.12, 0.22], frame, 2.2, y + 0.05, 0)
    const holder = group(strut)
    holder.rotation.y = Math.PI / 4 + (i * Math.PI) / 2
    g.add(holder)
  }
  // the blades and the motor turn together once the computer is on
  const rotor = fanRotor(3.2, 9, mat("#2a2d33", { rough: 0.4, metal: 0.1 }), mat("#1b1d21", { rough: 0.4 }), y + 0.6)
  g.add(rotor)
  const hub = new Mesh(new CylinderGeometry(0.98, 0.98, 0.01, 40), [M.blackPlastic, mat("#ffffff", { map: hubTexture() }), M.blackPlastic])
  hub.position.y = 0.36
  rotor.add(hub)
  return g
}

/** Copper base, heat pipes, a stack of thin aluminium fins and a 120 mm fan on top. About 4 cm tall. */
const cooler = (): Group => {
  const fins: Array<[number, number, number]> = []
  for (let z = -3.35; z <= 3.36; z += 0.19) fins.push([0, 0.55, z])
  const g = group(
    rounded([3.6, 0.35, 3.6], 0.06, M.copper),
    boxes([7, 2.3, 0.045], M.aluminium, fins),
    // mounting brackets with a spring screw at each corner of the socket frame
    rounded([8, 0.22, 0.7], 0.06, M.gunmetal, 0, 0.18, -3.6),
    rounded([8, 0.22, 0.7], 0.06, M.gunmetal, 0, 0.18, 3.6)
  )
  for (let i = 0; i < 4; i++) {
    const pipe = new Mesh(new CylinderGeometry(0.17, 0.17, 7.3, 16), M.copper)
    pipe.rotation.z = Math.PI / 2
    pipe.position.set(0, 0.5, -1.2 + i * 0.8)
    g.add(pipe)
  }
  for (const [cx, cz] of [[-3.75, -3.6], [3.75, -3.6], [-3.75, 3.6], [3.75, 3.6]] as const) {
    g.add(cylinder(0.2, 0.8, M.brushed, cx, -0.3, cz, 12))
    g.add(cylinder(0.32, 0.18, M.darkMetal, cx, 0.4, cz, 6))
  }
  g.add(fan(2.9))
  return g
}

// ---------- fan cable ----------

/** The plug on the end of the fan's cable: a black housing and three twisted wires going up. */
const fanPlug = (): Group => {
  const g = group(rounded([1.2, 0.6, 0.55], 0.06, M.blackPlastic), box([0.9, 0.02, 0.18], M.chip, 0, 0.6, -0.12))
  const colors = [M.blackPlastic, M.red, M.yellow]
  colors.forEach((wireMat, i) => {
    const dx = -0.3 + i * 0.3
    const wire = new CatmullRomCurve3([
      new Vector3(dx, 0.55, 0),
      new Vector3(dx * 0.6, 1.3, 0.4),
      new Vector3(dx * 0.3, 1.8, 1.4),
      new Vector3(dx * 0.2, 2, 2.6)
    ])
    g.add(new Mesh(new TubeGeometry(wire, 24, 0.09, 8), wireMat))
  })
  return g
}

// ---------- memory ----------

const goldFingers = (length: number, z: number): Mesh => {
  const t = fingersTexture(Math.max(1, Math.round(length * 5.5)))
  const face = mat("#ffffff", { map: t, metal: 0.85, rough: 0.3 })
  return box([0.15, 0.36, length], [face, face, M.gold, M.gold, M.greenPcb, M.greenPcb], 0, 0, z)
}

/**
 * A RAM module stands along z: a green board with memory chips on both sides, a sticker and gold contacts.
 * Its notch is off centre, so turned around it no longer fits the slot's key.
 */
const ram = (): Group => {
  const g = group(rounded([0.14, 2.75, DIMM_LENGTH], 0.03, M.greenPcb, 0, 0.35))
  const chip = mat("#ffffff", { map: chipTexture("D5 16G"), rough: 0.4 })
  const chipFaces = (side: 1 | -1) => (side === 1 ? [chip, M.chip, M.chip, M.chip, M.chip, M.chip] : [M.chip, chip, M.chip, M.chip, M.chip, M.chip])
  for (const side of [1, -1] as const) {
    for (let i = 0; i < 8; i++) {
      const z = -5.4 + i * 1.45 + (i >= 4 ? 0.35 : 0)
      g.add(box([0.09, 0.95, 1.15], chipFaces(side), side * 0.11, 0.95, z))
    }
    // a row of tiny resistors above the contacts
    const smd: Array<[number, number, number]> = []
    for (let i = 0; i < 30; i++) smd.push([side * 0.09, 0.55, -6.2 + i * 0.43])
    g.add(boxes([0.04, 0.08, 0.16], M.smdDark, smd))
  }
  const sticker = new Mesh(
    new PlaneGeometry(5, 0.7),
    mat("#ffffff", { map: stickerTexture(["EDU DDR5 16 ГБ", "4800 МГц · 1,1 В"]), rough: 0.6 })
  )
  sticker.rotation.y = Math.PI / 2
  sticker.position.set(0.161, 2.5, 1.2)
  g.add(sticker)
  // the contacts, split by the notch at z = +DIMM_KEY
  const gap = 0.35
  const frontLen = DIMM_LENGTH / 2 - DIMM_KEY - gap / 2
  const backLen = DIMM_LENGTH / 2 + DIMM_KEY - gap / 2
  g.add(goldFingers(frontLen, DIMM_LENGTH / 2 - frontLen / 2), goldFingers(backLen, -DIMM_LENGTH / 2 + backLen / 2))
  return g
}

// ---------- M.2 SSD ----------

/** A black stick along x: contacts at the -x end, a controller, memory chips under a sticker, a screw notch at +x. */
const m2ssd = (): Group => {
  // the stripes run along x on the texture; turn them so the contacts line up across the stick
  const stripes = fingersTexture(14)
  stripes.center.set(0.5, 0.5)
  stripes.rotation = Math.PI / 2
  const fingerTop = mat("#ffffff", { map: stripes, metal: 0.85, rough: 0.3 })
  const fingers = (len: number, z: number) => box([0.45, 0.105, len], [M.gold, M.gold, fingerTop, M.gold, M.gold, M.gold], -3.78, 0, z)
  const g = group(
    rounded([7.55, 0.1, 2.2], 0.03, M.blackPcb, 0.22, 0, 0),
    fingers(1.4, 0.35),
    fingers(0.5, -0.8),
    // the controller with its marking, a small DRAM chip and the sticker over the memory chips
    box([1.5, 0.12, 1.5], [M.chip, M.chip, mat("#ffffff", { map: chipTexture("EDU C1") }), M.chip, M.chip, M.chip], -2.3, 0.1, 0),
    box([0.9, 0.1, 0.8], M.chip, -1, 0.1, 0.45),
    box([2, 0.14, 1.7], M.chip, 0.6, 0.1, 0),
    box([2, 0.14, 1.7], M.chip, 2.75, 0.1, 0),
    decal(4.5, 1.9, stickerTexture(["EDU SSD 1 ТБ", "NVMe · PCIe 4.0"], "#1f2328", "#e9ecef"), 1.65, 0.255, 0)
  )
  // a few capacitors near the controller
  const caps: Array<[number, number, number]> = []
  for (let i = 0; i < 8; i++) caps.push([-3.2 + (i % 2) * 0.25, 0.1, -0.8 + Math.floor(i / 2) * 0.4])
  g.add(boxes([0.14, 0.07, 0.08], M.smdTan, caps))
  // the half-round screw notch at the far end, with its gold ring
  g.add(cylinder(0.32, 0.105, M.gold, 4.0, 0, 0, 20), cylinder(0.18, 0.11, M.chip, 4.0, 0, 0, 16))
  return g
}

/** A plain box for parts later stages model properly (PSU, GPU, case, peripherals). */
const placeholder = (): Group => group(rounded([4, 2, 4], 0.2, M.darkMetal))

const model = (kind: PartKind, placed: boolean): Group => {
  switch (kind) {
    case "cpu":
      return cpu()
    case "thermalPaste":
      return placed ? pasteBlob() : pasteSyringe()
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

/** The 3D model of a part. `placed` is the look once installed (thermal paste: the syringe becomes a blob). */
export const buildPart = (kind: PartKind, placed: boolean): Group => shadowed(model(kind, placed))
