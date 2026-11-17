import { CanvasTexture, type Group, type Material, Mesh, MeshStandardMaterial, PlaneGeometry, Vector3 } from "three"
import { M, box, boxes, cylinder, fanRotor, group, mat, rounded } from "./kit.ts"
import { type ConnectorKind, GPU_BRACKET_PORTS_Y, GPU_PORTS, HDD_PORTS, PLUGS, PSU_FACE_Z, PSU_HOLE, PSU_PORTS } from "./ports.ts"
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

/**
 * A power supply: 8.6 × 15 × 15.2 cm. Its back (+z) has the mains socket and switch; its fan faces +x; its
 * front (-z) faces the inside of the case and carries the panel of sockets (`psuPanel`).
 */
export const powerSupply = (): Group => {
  const body = mat("#202226", { rough: 0.45, metal: 0.35 })
  const back = printed(honeycombTexture(), 0.5)
  const fanSide = printed(fanGrilleTexture(), 0.5)
  const g = group(box([8.6, 15, 15.2], faces(body, { pz: back, px: fanSide }), 0, 0, 0))
  // the mains socket and the switch on the back
  g.add(box([2.6, 1.9, 0.2], M.blackPlastic, -1.6, 2.5, 7.6))
  g.add(box([1.8, 1.1, 0.05], M.chip, -1.6, 2.9, 7.8))
  g.add(rounded([1.1, 1.6, 0.4], 0.1, M.blackPlastic, -1.6, 5.2, 7.6))
  g.add(box([0.8, 0.6, 0.12], M.red, -1.6, 5.7, 7.95))
  // the sticker on its side that faces up
  g.add(decal(8, 5.4, printed(stickerTexture(["EDU POWER 650 Вт", "80 PLUS Bronze · 230 В"])), "y", 0, 15.01, -2.5))
  g.add(psuPanel())
  return g
}

/**
 * The panel of sockets on the power supply's front (-z): two HDD/SATA sockets and two PCI-E sockets, each a
 * red housing sunk into the panel with its pin holes, a clear printed name over each pair, and the round
 * grommet the built-in cables come out of. It goes on the realistic power supply too, over its blurred picture
 * of sockets, so the sockets are where the port map says. The names read the right way from inside the case.
 */
export const psuPanel = (): Group => {
  const face = PSU_FACE_Z
  const panelMat = mat("#16171a", { rough: 0.6, metal: 0.2 })
  const g = group(box([8.0, 13.6, 0.2], panelMat, 0, 1.0, face + 0.12))
  const red = mat("#b3261e", { rough: 0.5 })
  const hole = mat("#2a0b09", { rough: 0.8 })
  for (const port of Object.values(PSU_PORTS)) {
    const [x, y] = port.at
    const [l, w] = port.housing
    const cols = port.kind === "psu8" ? 4 : 3
    // the housing stands a little proud of the panel; its long side is up (y)
    const housing = box([w, l, 0.3], red, x, y - l / 2, face + 0.12)
    g.add(housing)
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < 2; r++)
        g.add(box([w * 0.32, (l / cols) * 0.62, 0.02], hole, x + (r - 0.5) * w * 0.46, y - l / 2 + (c + 0.19) * (l / cols), face - 0.035))
    // the latch catch beside it
    g.add(box([0.22, 0.5, 0.2], M.blackPlastic, x - w / 2 - 0.16, y - 0.25, face + 0.05))
  }
  // a name over each pair of sockets, printed as on a real supply
  const names: Array<[string, number]> = [
    ["HDD / SATA", PSU_PORTS.sata1.at[1] + PSU_PORTS.sata1.housing[0] / 2 + 0.55],
    ["PCI-E", PSU_PORTS.pcie1.at[1] + PSU_PORTS.pcie1.housing[0] / 2 + 0.55]
  ]
  for (const [text, y] of names) {
    const label = new Mesh(new PlaneGeometry(5.6, 0.9), new MeshStandardMaterial({ map: panelLabelTexture(text), transparent: true, roughness: 0.6 }))
    // the panel faces -z: the label faces that way too, upright, read from inside the case
    label.rotation.y = Math.PI
    label.position.set(0, y, face - 0.02)
    g.add(label)
  }
  // the grommet the built-in cables leave through
  const [hx, hy] = PSU_HOLE
  const ring = cylinder(1.05, 0.25, M.rubber, 0, 0, 0, 32)
  ring.rotation.x = Math.PI / 2
  ring.position.set(hx, hy, face - 0.02)
  const inner = cylinder(0.78, 0.27, M.chip, 0, 0, 0, 32)
  inner.rotation.x = Math.PI / 2
  inner.position.set(hx, hy, face - 0.03)
  g.add(ring, inner)
  return g
}

/** A sharp white name on a dark panel: drawn big and shrunk, so it stays crisp close up. */
const panelLabelTexture = (text: string): CanvasTexture => {
  const canvas = document.createElement("canvas")
  canvas.width = 1024
  canvas.height = 160
  const c = canvas.getContext("2d")
  if (c) {
    c.clearRect(0, 0, 1024, 160)
    c.fillStyle = "#f2f2ee"
    c.font = "700 104px system-ui, sans-serif"
    c.textAlign = "center"
    c.textBaseline = "middle"
    c.fillText(text, 512, 84)
  }
  const t = new CanvasTexture(canvas)
  t.colorSpace = "srgb"
  t.anisotropy = 8
  return t
}

// ---------- graphics card ----------

/**
 * A graphics card standing on its edge: the board in the y–z plane, the cooler with two fans on +x,
 * the bracket with the ports at +z. Its origin is the bottom of the gold contacts.
 */
export const graphicsCard = (): Group => {
  const length = 25.6
  const centreZ = 9.0 - length / 2
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
  // the 8-pin power sockets on the top edge, where the port map has them
  for (const port of [GPU_PORTS.power1, GPU_PORTS.power2]) {
    const [px, py, pz] = port.at
    const [l, w, d] = port.housing
    g.add(box([w, d, l], faces(M.blackPlastic, { py: printed(pinGridTexture(2, 4)) }), px, py - d, pz))
  }
  // the bracket and its video ports, outside the case
  const [hx, , hz] = GPU_PORTS.hdmi.at
  const bracketZ = hz - 0.1
  g.add(box([4.4, 12.2, 0.1], M.aluminium, 1.6, 0, bracketZ))
  for (const py2 of GPU_BRACKET_PORTS_Y) {
    const [l, w] = GPU_PORTS.hdmi.housing
    g.add(box([w + 0.2, l + 0.2, 0.06], M.aluminium, hx, py2 - (l + 0.2) / 2, hz - 0.05))
    g.add(box([w, l, 0.08], M.chip, hx, py2 - l / 2, hz - 0.06))
  }
  g.add(box([1.4, 6, 0.05], printed(honeycombTexture("#b9bfc5")), 3, 6, bracketZ + 0.06))
  return g
}

// ---------- hard disk ----------

/** A 3.5-inch hard disk lying flat, label up: 10.2 × 2.1 × 14.7 cm, its connectors low on the back end (+z). */
export const hardDisk = (): Group => {
  const lid = mat("#b9bfc5", { metal: 0.8, rough: 0.35 })
  const g = group(
    rounded([10.2, 2.1, 14.7], 0.2, M.aluminium),
    box([10, 0.3, 14.5], M.greenPcb, 0, -0.01, 0),
    rounded([9.6, 0.1, 14.1], 0.05, lid, 0, 2.1, 0),
    decal(8, 6.2, printed(stickerTexture(["EDU HDD 2 ТБ", "7200 об/хв · SATA"])), "y", 0, 2.21, -1.6)
  )
  // the sockets, where the port map has them: a dark housing with the key's slot
  for (const port of Object.values(HDD_PORTS)) {
    const [x, y, z] = port.at
    const [l, w, d] = port.housing
    g.add(box([l, w, d], M.blackPlastic, x, y - w / 2, z - d / 2 + 0.01))
    g.add(box([l * 0.8, w * 0.3, 0.02], M.chip, x, y - w * 0.15, z + 0.01))
  }
  for (const [x, z] of [[-4.6, -6], [4.6, -6], [-4.6, 5], [4.6, 5]] as const) g.add(cylinder(0.25, 0.05, M.darkMetal, x, 2.2, z, 12))
  return g
}

// ---------- cable plugs ----------

/*
 * Every plug is built standing up, the way it goes into a socket in the board from above: the middle of the
 * face that meets the socket at the origin, the plug going in along -y, its long side along x and its latch or
 * key on +z. Its cable leaves the top (+y). A port's turn (see `portPose` in ports.ts) seats it in any socket.
 * Each plug's size comes from the port map (`PLUGS`), so it matches the socket it goes into.
 */

const sleeve = mat("#141518", { rough: 0.8 })

/** The wire ends on a plug's top: one short stub per wire, in rows, as a bundle leaves a real plug. */
const wireStubs = (cols: number, rows: number, pitch: number, h: number, colours: ReadonlyArray<Material> = [sleeve]): Mesh[] => {
  const out: Mesh[] = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const colour = colours[(r * cols + c) % colours.length] ?? sleeve
      out.push(box([pitch * 0.62, 0.22, pitch * 0.62], colour, (c - (cols - 1) / 2) * pitch, h, (r - (rows - 1) / 2) * pitch))
    }
  return out
}

const withCable = (g: Group, h: number): Group => cableOut(g, new Vector3(0, h, 0), new Vector3(0, 1, 0))

/** A power plug of `cols` × 2 square pins with a latch on +z: ATX, CPU, PCIe, the power supply's own. */
const powerPlug = (kind: ConnectorKind, cols: number, tag?: "CPU" | "PCIe"): Group => {
  const [l, w, h] = PLUGS[kind].size
  const g = group(rounded([l, h, w], 0.06, M.blackPlastic))
  // the latch: a bar standing on the +z side with its hook at the bottom
  g.add(box([Math.min(0.42, l * 0.3), h * 0.72, 0.16], M.blackPlastic, 0, h * 0.18, w / 2 + 0.08))
  g.add(box([Math.min(0.42, l * 0.3), 0.16, 0.12], M.blackPlastic, 0, 0.05, w / 2 + 0.2))
  g.add(...wireStubs(cols, 2, Math.min(l / cols, w / 2), h))
  if (tag) {
    // the tag on the side away from the latch
    const label = decal(Math.min(l - 0.2, 1.2), 0.38, printed(tagTexture(tag)), "z", 0, h * 0.55, -w / 2 - 0.01)
    label.rotation.y = Math.PI
    g.add(label)
  }
  return withCable(g, h + 0.22)
}

/** A thin header plug of `cols` × `rows` holes for pins, with coloured wires going in on top. */
const headerPlug = (kind: ConnectorKind, cols: number, rows: number, body: Material, wires: ReadonlyArray<Material>): Group => {
  const [l, w, h] = PLUGS[kind].size
  const g = group(rounded([l, h, w], 0.05, body))
  g.add(box([l * 0.92, 0.02, w * 0.6], M.chip, 0, h, 0))
  g.add(...wireStubs(cols, rows, Math.min(l / cols, w / rows), h, wires))
  return withCable(g, h + 0.22)
}

/** A SATA plug: a flat L-shaped body going in sideways into a disk or a board's side port. */
const sataPlug = (kind: "sataData" | "sataPower", body: Material): Group => {
  const [l, w, h] = PLUGS[kind].size
  const g = group(rounded([l, h, w], 0.06, body))
  // the L: a lip along one long side and down one end, as on the socket's key
  g.add(box([l * 0.92, h * 0.5, 0.08], body, 0, 0, -w / 2 - 0.04), box([0.12, h * 0.5, w * 0.6], body, -l / 2 + 0.06, 0, 0))
  // a grip on top where the cable goes in
  g.add(box([l * 0.75, 0.12, w * 0.7], M.chip, 0, h, 0))
  return withCable(g, h + 0.12)
}

/** A plug with a metal tongue going into its socket and a moulded grip: USB, HDMI. */
const shellPlug = (kind: "usbA" | "hdmi", tongue: readonly [number, number, number], grip: Material): Group => {
  const [l, w, h] = PLUGS[kind].size
  const g = group(
    // the tongue goes into the socket: below the face
    box([tongue[0], tongue[2], tongue[1]], M.aluminium, 0, -tongue[2], 0),
    rounded([l, h, w], 0.18, grip),
    // the strain relief where the cable leaves
    cylinder(PLUGS[kind].cable.r * 1.5, 0.5, grip, 0, h, 0, 16)
  )
  return withCable(g, h + 0.5)
}

/** A plug of the given connector kind, standing up as described above. */
export const plugModel = (kind: ConnectorKind, grip: Material = M.blackPlastic): Group => {
  switch (kind) {
    case "atx24":
      return powerPlug(kind, 12)
    case "eps8":
      return powerPlug(kind, 4, "CPU")
    case "pcie8":
      return powerPlug(kind, 4, "PCIe")
    case "psu8":
      return powerPlug(kind, 4)
    case "psu6":
      return powerPlug(kind, 3)
    case "fan4":
      return headerPlug(kind, 4, 1, M.blackPlastic, [M.blackPlastic, M.yellow, M.accent, M.blueUsb])
    case "fPanel":
      return headerPlug(kind, 10, 2, M.blackPlastic, [M.red, M.blackPlastic, M.accent, M.blackPlastic, M.yellow, M.whitePlastic])
    case "hdAudio":
      return headerPlug(kind, 5, 2, M.blackPlastic, [M.red, M.whitePlastic, M.accent, M.blackPlastic, M.yellow])
    case "usb3Header":
      return headerPlug(kind, 10, 2, M.blueUsb, [M.blueUsb])
    case "sataData":
      return sataPlug(kind, M.red)
    case "sataPower":
      return sataPlug(kind, M.blackPlastic)
    case "usbA":
      return shellPlug(kind, [1.2, 0.45, 1.1], grip)
    case "hdmi":
      return shellPlug(kind, [1.0, 0.36, 0.9], grip)
  }
}

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

/** A power strip on the desk with its switch; the computer gets power only when it is on. */
export const powerStrip = (): Group =>
  group(
    rounded([30, 3.6, 5.5], 0.6, mat("#eceff1", { rough: 0.5 }), 0, 0, 0),
    boxes([3.2, 0.1, 3.2], mat("#cfd4d8", { rough: 0.6 }), [-8, -2.5, 3, 8.5].map((x) => [x, 3.6, 0] as [number, number, number]))
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
