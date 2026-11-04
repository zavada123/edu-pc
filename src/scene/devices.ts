import { CanvasTexture, type Group, type Material, Mesh, MeshStandardMaterial, PlaneGeometry, Vector3 } from "three"
import { M, box, boxes, cylinder, fanRotor, group, mat, rounded } from "./kit.ts"
import { GPU_HDMI_LOCAL, GPU_POWER_LOCAL, HDD_DATA_LOCAL, HDD_POWER_LOCAL } from "./layout.ts"
import { desktopTexture, fanGrilleTexture, honeycombTexture, pinGridTexture, signTexture, stickerTexture, tagTexture } from "./textures.ts"

/**
 * The parts that go into the case and the devices on the desk. Each model stands on its bottom centre;
 * a plug's origin is the middle of its tip, where it meets the socket.
 */

type Faces = [Material, Material, Material, Material, Material, Material]
/** Box faces in three.js order: +x, -x, +y, -y, +z, -z. Unset faces get `rest`. */
const faces = (rest: Material, set: Partial<Record<"px" | "nx" | "py" | "ny" | "pz" | "nz", Material>>): Faces => [
  set.px ?? rest,
  set.nx ?? rest,
  set.py ?? rest,
  set.ny ?? rest,
  set.pz ?? rest,
  set.nz ?? rest
]

const printed = (map: CanvasTexture, rough = 0.55): MeshStandardMaterial => mat("#ffffff", { map, rough })

/** A flat picture on a face. `normal` says which way it looks: "y" up, "z" towards +z, "x" towards +x. */
const decal = (w: number, h: number, material: Material, normal: "x" | "y" | "z", x: number, y: number, z: number): Mesh => {
  const mesh = new Mesh(new PlaneGeometry(w, h), material)
  if (normal === "y") mesh.rotation.x = -Math.PI / 2
  if (normal === "x") mesh.rotation.y = Math.PI / 2
  mesh.position.set(x, y, z)
  return mesh
}

/** Where a plug's cable leaves it, and which way: the scene draws the cable from there. */
const cableOut = (g: Group, at: Vector3, dir: Vector3): Group => {
  g.userData.cableOut = at
  g.userData.cableDir = dir
  return g
}

// ---------- power supply ----------

/** A power supply: 8.6 × 15 × 14 cm. Its back (+z) has the mains socket and switch; its fan faces +x. */
export const powerSupply = (): Group => {
  const body = mat("#202226", { rough: 0.45, metal: 0.35 })
  const back = printed(honeycombTexture(), 0.5)
  const fanSide = printed(fanGrilleTexture(), 0.5)
  const g = group(box([8.6, 15, 14], faces(body, { pz: back, px: fanSide }), 0, 0, 0))
  // the mains socket and the switch on the back
  g.add(box([2.6, 1.9, 0.2], M.blackPlastic, -1.6, 2.5, 7))
  g.add(box([1.8, 1.1, 0.05], M.chip, -1.6, 2.9, 7.2))
  g.add(rounded([1.1, 1.6, 0.4], 0.1, M.blackPlastic, -1.6, 5.2, 7))
  g.add(box([0.8, 0.6, 0.12], M.red, -1.6, 5.7, 7.35))
  // the sticker on its side that faces up, and the panel with cable sockets on its inner side (-x)
  g.add(decal(8, 5.4, printed(stickerTexture(["EDU POWER 650 Вт", "80 PLUS Bronze · 230 В"])), "y", 0, 15.01, -2.5))
  g.add(box([0.15, 6, 11], M.chip, -4.37, 1.2, -0.5))
  const sockets: Array<[number, number, number]> = []
  for (let i = 0; i < 6; i++) sockets.push([-4.46, 2 + (i % 2) * 2.4, -4.5 + Math.floor(i / 2) * 3.2])
  g.add(boxes([0.05, 1.2, 2.2], M.blackPlastic, sockets))
  return g
}

// ---------- graphics card ----------

/**
 * A graphics card standing on its edge: the board in the y–z plane, the cooler with two fans on +x,
 * the bracket with the ports at +z. Its origin is the bottom of the gold contacts.
 */
export const graphicsCard = (): Group => {
  const length = 25.6
  const centreZ = 8.6 - length / 2
  const shroud = mat("#26282d", { rough: 0.4, metal: 0.3 })
  const g = group(
    box([0.17, 0.8, 8.5], M.gold, 0, 0, 0),
    box([0.16, 11, length], M.blackPcb, 0, 0.8, centreZ),
    box([0.12, 10.4, length - 0.8], M.darkMetal, -0.16, 1.1, centreZ - 0.2),
    rounded([3.4, 10.6, length - 0.6], 0.25, shroud, 1.9, 1, centreZ - 0.3),
    box([0.08, 0.5, length - 2], M.accent, 3.62, 9.6, centreZ - 0.3),
    decal(length - 3, 1.6, printed(tagTexture("EDU GRAPHICS", "#26282d", "#e9ecef")), "y", 1.9, 11.61, centreZ - 1.5)
  )
  // two fans on the cooler, facing +x
  for (const fz of [-10.4, 0.4]) {
    const ring = cylinder(4.5, 0.3, mat("#18191c", { rough: 0.4 }), 0, 0, 0, 40)
    const rotor = fanRotor(4.2, 11, mat("#30333a", { rough: 0.35, metal: 0.1 }), mat("#1b1d21", { rough: 0.4 }), 0.3)
    const fan = group(ring, rotor)
    fan.rotation.z = -Math.PI / 2
    fan.position.set(3.55, 6.3, fz)
    g.add(fan)
  }
  // the 8-pin power socket on the top edge
  const [px, py, pz] = GPU_POWER_LOCAL
  g.add(box([1.0, 0.8, 2.1], faces(M.blackPlastic, { py: printed(pinGridTexture(2, 4)) }), px, py - 0.8, pz))
  // the bracket and its ports, outside the case
  const [, hy, hz] = GPU_HDMI_LOCAL
  const bracketZ = hz - 0.25
  g.add(box([4.4, 12.2, 0.1], M.aluminium, 1.6, 0, bracketZ))
  // three video ports in a row along the bracket, each with its long side along the row
  for (const [i, py2] of [hy, hy + 2.1, hy + 4.2].entries()) {
    g.add(box([0.55, 1.5, 0.3], M.aluminium, GPU_HDMI_LOCAL[0], py2 - 0.75, bracketZ + 0.15))
    g.add(box([0.3, 1.2, 0.32], M.chip, GPU_HDMI_LOCAL[0], py2 - 0.6, bracketZ + 0.16))
    if (i === 0) g.add(box([0.3, 0.3, 0.05], M.accent, GPU_HDMI_LOCAL[0] + 0.7, py2 - 0.15, bracketZ + 0.08))
  }
  g.add(box([1.4, 6, 0.05], printed(honeycombTexture("#b9bfc5")), 3, 6, bracketZ + 0.06))
  return g
}

// ---------- hard disk ----------

/** A 3.5-inch hard disk lying flat: 10.2 × 2.6 × 14.7 cm, its connectors on the back end (+z). */
export const hardDisk = (): Group => {
  const lid = mat("#b9bfc5", { metal: 0.8, rough: 0.35 })
  const g = group(
    rounded([10.2, 2.6, 14.7], 0.2, M.aluminium),
    box([10, 0.3, 14.5], M.greenPcb, 0, -0.01, 0),
    rounded([9.6, 0.1, 14.1], 0.05, lid, 0, 2.6, 0),
    decal(8, 6.2, printed(stickerTexture(["EDU HDD 2 ТБ", "7200 об/хв · SATA"])), "y", 0, 2.71, -1.6)
  )
  const [dx, dy, dz] = HDD_DATA_LOCAL
  const [wx, wy, wz] = HDD_POWER_LOCAL
  g.add(box([1.4, 0.6, 0.25], M.blackPlastic, dx, dy - 0.3, dz - 0.12))
  g.add(box([2.6, 0.6, 0.25], M.blackPlastic, wx, wy - 0.3, wz - 0.12))
  for (const [x, z] of [[-4.6, -6], [4.6, -6], [-4.6, 5], [4.6, 5]] as const) g.add(cylinder(0.25, 0.05, M.darkMetal, x, 2.7, z, 12))
  return g
}

// ---------- cable plugs ----------

const sleeve = mat("#141518", { rough: 0.8 })

/** The 24-pin plug for the board: wide, with a latch, going into its socket from above. */
export const atxPlug = (): Group =>
  cableOut(
    group(
      rounded([5.4, 1.4, 1.3], 0.08, M.blackPlastic),
      box([1.2, 0.5, 0.5], M.blackPlastic, 0, 0.6, 0.85),
      boxes(
        [0.14, 0.6, 0.14],
        sleeve,
        Array.from({ length: 12 }, (_, i) => [-2.4 + i * 0.44, 1.4, 0] as [number, number, number])
      )
    ),
    new Vector3(0, 2, 0),
    new Vector3(0, 1, 0)
  )

/** An 8-pin power plug for the processor or the graphics card. They look alike; only the tag differs. */
export const eightPinPlug = (tag: "CPU" | "PCIe"): Group =>
  cableOut(
    group(
      rounded([1.0, 1.2, 2.1], 0.06, M.blackPlastic),
      box([0.4, 0.4, 0.6], M.blackPlastic, 0.6, 0.6, 0),
      decal(0.9, 0.34, printed(tagTexture(tag)), "x", 0.51, 0.75, 0)
    ),
    new Vector3(0, 1.8, 0),
    new Vector3(0, 1, 0)
  )

/** The flat L-shaped SATA power plug: it goes into the back of the disk, horizontally. */
export const sataPowerPlug = (): Group =>
  cableOut(group(rounded([2.4, 0.6, 1.1], 0.08, M.blackPlastic, 0, -0.3, 0.55)), new Vector3(0, 0, 1.3), new Vector3(0, 0, 1))

/** The small red SATA data plug: it goes into the board's SATA port from above. */
export const sataDataPlug = (): Group =>
  cableOut(group(rounded([1.0, 1.1, 0.5], 0.06, M.red), box([0.8, 0.12, 0.3], M.chip, 0, 0, 0)), new Vector3(0, 1.3, 0), new Vector3(0, 1, 0))

/** An HDMI plug, pointing -z into the socket. */
export const hdmiPlug = (): Group =>
  cableOut(
    group(box([1.4, 0.45, 0.8], M.aluminium, 0, -0.22, 0.4), rounded([2, 1, 2], 0.2, M.blackPlastic, 0, -0.5, 1.8)),
    new Vector3(0, 0, 2.9),
    new Vector3(0, 0, 1)
  )

/** A USB plug, pointing -z into the socket; grey for the keyboard, black for the mouse. */
export const usbPlug = (body: Material): Group =>
  cableOut(
    group(box([1.2, 0.45, 0.9], M.aluminium, 0, -0.22, 0.45), rounded([1.6, 0.8, 2.2], 0.2, body, 0, -0.4, 1.95)),
    new Vector3(0, 0, 3.1),
    new Vector3(0, 0, 1)
  )

// ---------- side panel ----------

/** The tempered glass side panel with its dark painted border and four thumbscrews. */
export const sidePanel = (): Group => {
  const glass = new MeshStandardMaterial({ color: "#3a4450", transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.2, depthWrite: false })
  const g = group(box([42.6, 0.35, 44.6], glass))
  const paint = M.satinBlack
  g.add(
    box([42.6, 0.36, 1.4], paint, 0, 0, -21.6),
    box([42.6, 0.36, 1.4], paint, 0, 0, 21.6),
    box([1.4, 0.36, 41.8], paint, -20.6, 0, 0),
    box([1.4, 0.36, 41.8], paint, 20.6, 0, 0)
  )
  for (const [x, z] of [[-19.6, -20.6], [19.6, -20.6], [-19.6, 20.6], [19.6, 20.6]] as const) {
    g.add(cylinder(0.7, 0.5, M.brushed, x, 0.36, z, 20))
  }
  return g
}

// ---------- devices on the desk ----------

/** A monitor facing +z. Its screen is dark until the computer is on; the scene finds it by `screen`. */
export const monitor = (): Group => {
  const screen = new MeshStandardMaterial({ color: "#07090c", roughness: 0.15, metalness: 0.1, emissive: "#ffffff", emissiveIntensity: 0 })
  screen.emissiveMap = desktopTexture()
  const face = decal(50.4, 28.6, screen, "z", 0, 27.3, 0.92)
  face.userData.screen = true
  return group(
    rounded([18, 0.8, 12], 0.3, M.satinBlack, 0, 0, 0),
    box([3.2, 14, 1.6], M.satinBlack, 0, 0.8, -1.2),
    rounded([52, 31, 1.6], 0.4, M.blackPlastic, 0, 12, 0),
    face
  )
}

/** A keyboard: a dark base with rows of keys. */
export const keyboard = (): Group => {
  const keys: Array<[number, number, number]> = []
  const rows = [14, 14, 13, 12, 9]
  rows.forEach((n, r) => {
    for (let c = 0; c < n; c++) keys.push([-19.5 + c * 3 + r * 0.6, 1.1, -5.4 + r * 2.7])
  })
  const g = group(
    rounded([44, 1.2, 14.6], 0.4, M.satinBlack),
    boxes([2.5, 0.8, 2.3], mat("#2b2e34", { rough: 0.55 }), keys, (i) => (i === keys.length - 5 ? [14, 0.8, 2.3] : [2.5, 0.8, 2.3]))
  )
  return g
}

/** A mouse: a rounded body with two buttons and a wheel. */
export const mouse = (): Group =>
  group(
    rounded([6, 3, 10.5], 1.4, M.satinBlack),
    box([0.08, 0.2, 4], M.chip, 0, 2.9, -2.5),
    rounded([0.6, 0.6, 1.3], 0.25, M.gunmetal, 0, 2.7, -2.8)
  )

/** A round speaker driver facing +z, its face at depth z. */
const driver = (r: number, material: Material, x: number, y: number, z: number): Mesh => {
  const d = cylinder(r, 0.3, material, 0, 0, 0, 32)
  d.rotation.x = Math.PI / 2
  d.position.set(x, y, z)
  return d
}

/** A pair of desk speakers facing +z, with a woofer and a tweeter each. */
export const speakers = (): Group => {
  const cone = mat("#2b2e34", { rough: 0.8 })
  const one = (x: number): Group =>
    group(rounded([9, 16, 10], 0.6, M.satinBlack, x, 0, 0), driver(3.2, cone, x, 5.5, 5.05), driver(1.2, M.gunmetal, x, 12, 5.05))
  return group(one(-11), one(11))
}

/** An inkjet printer: a light body, a paper tray at the back and a sheet coming out at the front. */
export const printer = (): Group => {
  const body = mat("#e3e6e9", { rough: 0.45 })
  const paper = mat("#fbfbf8", { rough: 0.9 })
  const g = group(
    rounded([40, 15, 28], 1.2, body),
    box([36, 0.8, 4], M.satinBlack, 0, 9, 14),
    box([30, 0.2, 16], paper, 0, 6, 20),
    box([26, 0.15, 22], paper, 0, 15, -12),
    box([28, 8, 1], body, 0, 15, -16),
    box([8, 0.4, 4], M.satinBlack, 13, 15, 8)
  )
  const slope = g.children[4]
  if (slope) slope.rotation.x = -0.35
  g.add(cylinder(0.5, 0.2, M.accent, 15, 15.3, 8, 16))
  return g
}

/** A USB flash drive: a small blue body with a metal tip. */
export const flashDrive = (): Group =>
  group(rounded([2, 0.9, 4.6], 0.3, M.blueUsb, 0, 0, 0), box([1.2, 0.45, 1.3], M.aluminium, 0, 0.2, -2.9))

/** A smartphone lying on its back, screen up: the photos come from it. */
export const smartphone = (): Group =>
  group(
    rounded([7.2, 0.8, 15], 0.6, M.satinBlack, 0, 0, 0),
    box([6.6, 0.05, 13.8], mat("#1b3550", { rough: 0.15, metal: 0.1 }), 0, 0.8, 0)
  )

/** An open crate for sorting devices, with a coloured sign on its front. */
export const crate = (label: ReadonlyArray<string>, colour: string): Group => {
  const wood = mat(colour, { rough: 0.7 })
  const [w, h, d] = [40, 12, 26]
  const g = group(
    box([w, 1, d], wood, 0, 0, 0),
    box([w, h, 1], wood, 0, 0, -d / 2 + 0.5),
    box([w, h, 1], wood, 0, 0, d / 2 - 0.5),
    box([1, h, d], wood, -w / 2 + 0.5, 0, 0),
    box([1, h, d], wood, w / 2 - 0.5, 0, 0)
  )
  const sign = new Mesh(new PlaneGeometry(36, 9), printed(signTexture(label, "#fffdf6", "#1f2328")))
  sign.position.set(0, h / 2 + 0.3, d / 2 + 0.05)
  g.add(sign)
  return g
}

/** A closed cardboard box with the device's name on it. */
export const cardboardBox = (name: string): Group => {
  const card = mat("#c49a6c", { rough: 0.85 })
  const side = printed(signTexture([name.toUpperCase()], "#c49a6c", "#3d2b1a"), 0.85)
  return group(
    box([18, 13, 15], faces(card, { pz: side }), 0, 0, 0),
    box([18.05, 0.05, 4], mat("#d9c29b", { rough: 0.6 }), 0, 13, 0)
  )
}
