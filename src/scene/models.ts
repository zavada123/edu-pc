import { Box3, BoxGeometry, CatmullRomCurve3, CylinderGeometry, Group, Mesh, TubeGeometry, Vector3 } from "three"
import type { PartKind } from "../core/parts.ts"
import { grade8Case } from "../scenarios/grade8-case.ts"
import { grade8Club } from "../scenarios/grade8-club.ts"
import { buildBoard, buildLever } from "./board.ts"
import { buildCase } from "./case.ts"
import { hasRealModel, PLACED_BY_FILE, realModel } from "./gltf.ts"
import {
  atxPlug,
  eightPinPlug,
  flashDrive,
  graphicsCard,
  hardDisk,
  hdmiPlug,
  headerPlug,
  keyboard,
  monitor,
  mouse,
  powerStrip,
  powerSupply,
  psuPlug,
  printer,
  sataDataPlug,
  sataPowerPlug,
  sidePanel,
  smartphone,
  speakers,
  usbPlug
} from "./devices.ts"
import { M, mat, shadowed } from "./kit.ts"
import { CASE_SIZE, GRADE8_BOARD, grade8CaseLayout, grade8DeskLayout, type SlotPose, TOWER_AT } from "./layout.ts"
import { buildPart } from "./parts.ts"

/** The board as the grade 8 students leave the desk: CPU, cooler and its cable, two RAM modules, the SSD. */
export const assembledBoard = (): Group => {
  const slots = grade8DeskLayout.slots
  const g = new Group()
  g.add(buildBoard(GRADE8_BOARD, grade8Club.slots, slots))
  const installed: Array<[PartKind, string]> = [
    ["cpu", "cpuSocket"],
    ["cooler", "coolerMount"],
    ["fanCable", "cpuFan"],
    ["ram", "dimmA2"],
    ["ram", "dimmB2"],
    ["m2ssd", "m2Slot"]
  ]
  for (const [kind, slot] of installed) {
    const pose = slots[slot]
    if (!pose) continue
    const part = buildModel(kind, true)
    part.position.set(...pose.at)
    g.add(part)
  }
  const lever = grade8DeskLayout.lever
  if (lever) {
    const l = buildLever(lever.length)
    l.position.set(...lever.pivot)
    g.add(l)
  }
  return g
}

/** Kinds with a model of their own; the rest get a plain box for now. */
export const MODELLED: ReadonlySet<PartKind> = new Set<PartKind>([
  "motherboard",
  "cpu",
  "thermalPaste",
  "cooler",
  "fanCable",
  "ram",
  "m2ssd",
  "case",
  "psu",
  "gpu",
  "hdd",
  "atxCable",
  "cpuPowerCable",
  "gpuPowerCable",
  "sataPowerCable",
  "sataDataCable",
  "sidePanel",
  "monitor",
  "keyboard",
  "mouse",
  "speakers",
  "printer",
  "flashDrive",
  "monitorCable",
  "keyboardCable",
  "mouseCable",
  "psuPlug",
  "frontPanelCable",
  "frontAudioCable",
  "frontUsbCable"
])

/**
 * The model of a part in the scene. `placed` is its look once installed. A device's cable
 * (monitorCable, keyboardCable, mouseCable) is its plug: that is what the student holds and plugs in.
 */
export const buildModel = (kind: PartKind, placed: boolean): Group => {
  // a device on the desk gets its realistic model in deviceModel; the board's own model goes in under the parts on it (see buildBoard)
  const real = kind === "motherboard" || kind in DEVICES ? null : realModel(kind)
  // the case's file is already where the code-built case stands
  if (real && kind === "case") return withIoShield(real)
  if (real && PLACED_BY_FILE.has(kind)) return real
  const code = codeModel(kind, placed)
  return real ? standIn(real, code) : code
}

/**
 * Puts a realistic model where the code-built one stands: the same footprint centre and the same
 * bottom, so every slot pose fits it as it is. It keeps the code-built model's data (a plug's cable end).
 */
const standIn = (real: Group, code: Group): Group => {
  const want = new Box3().setFromObject(code)
  const have = new Box3().setFromObject(real)
  const a = want.getCenter(new Vector3())
  const b = have.getCenter(new Vector3())
  const model = real.children[0]
  model?.position.set(a.x - b.x, want.min.y - have.min.y, a.z - b.z)
  Object.assign(real.userData, code.userData)
  // the monitor keeps its picture: the code-built screen goes onto the real one's glass
  const screen = code.children.find((c) => c.userData.screen)
  if (screen && model) {
    screen.position.set(...REAL_SCREEN.at)
    screen.scale.set(REAL_SCREEN.size[0] / SCREEN_SIZE[0], REAL_SCREEN.size[1] / SCREEN_SIZE[1], 1)
    model.add(screen)
  }
  return real
}

/**
 * The I/O shield in the realistic case's back wall: the plate round the board's rear ports. It fills the
 * opening (x, y in case coordinates, measured on the case's file) round the ports, which come through it.
 */
const IO_SHIELD = { x: [-18.55, -2.2], y: [2.0, 6.5], z: 21.66 } as const

const withIoShield = (real: Group): Group => {
  const [x0, x1] = IO_SHIELD.x
  const [y0, y1] = IO_SHIELD.y
  const plate = new Mesh(new BoxGeometry(x1 - x0, y1 - y0, 0.08), mat("#8d939a", { metal: 0.85, rough: 0.4 }))
  plate.position.set((x0 + x1) / 2, (y0 + y1) / 2, IO_SHIELD.z)
  plate.receiveShadow = true
  real.add(plate)
  return real
}

/** The realistic case is loaded: it is smaller than the code-built one (see REAL_CASE). */
const realCaseActive = (): boolean => hasRealModel("case")

/**
 * The opening of the realistic case (Fractal Design Meshify C) in case coordinates: from its top (-x) to its
 * bottom, the height of its open side, from its front (-z) to its back. Its back is where the code-built case's is.
 */
const REAL_CASE = { x: [-21.2, 21.5], top: 19.7, z: [-15.4, 22.5] } as const

/** The side panel sized to the realistic case's open side: the slot pose stands at the code-built case's top. */
const fitToRealCase = (panel: Group): Group => {
  const [x0, x1] = REAL_CASE.x
  const [z0, z1] = REAL_CASE.z
  panel.scale.set((x1 - x0) / CASE_SIZE[0], 1, (z1 - z0) / CASE_SIZE[2])
  panel.position.set((x0 + x1) / 2, REAL_CASE.top - CASE_SIZE[1], (z0 + z1) / 2)
  const g = new Group()
  g.add(panel)
  return g
}

/** The code-built monitor's picture, width and height (see `monitor` in devices.ts). */
const SCREEN_SIZE = [50.4, 28.6] as const
/** Where the glass of the realistic monitor is in its file: its middle and its size. */
const REAL_SCREEN = { at: [0, 19.8, 0.42] as const, size: [50.6, 24.8] as const }

const codeModel = (kind: PartKind, placed: boolean): Group => {
  switch (kind) {
    case "motherboard":
      return assembledBoard()
    case "case":
      return buildCase()
    case "psu":
      return shadowed(powerSupply())
    case "gpu":
      return shadowed(graphicsCard())
    case "hdd":
      return shadowed(hardDisk())
    case "atxCable":
      return shadowed(atxPlug())
    case "cpuPowerCable":
      return shadowed(eightPinPlug("CPU"))
    case "gpuPowerCable":
      return shadowed(eightPinPlug("PCIe"))
    case "sataPowerCable":
      return shadowed(sataPowerPlug())
    case "sataDataCable":
      return shadowed(sataDataPlug())
    case "sidePanel":
      return realCaseActive() ? fitToRealCase(sidePanel()) : sidePanel()
    case "psuPlug":
      return shadowed(psuPlug())
    case "frontPanelCable":
      return shadowed(headerPlug("panel"))
    case "frontAudioCable":
      return shadowed(headerPlug("audio"))
    case "frontUsbCable":
      return shadowed(headerPlug("usb"))
    case "monitorCable":
      return shadowed(hdmiPlug())
    case "keyboardCable":
      return shadowed(usbPlug(mat("#5b6169", { rough: 0.5 })))
    case "mouseCable":
      return shadowed(usbPlug(M.blackPlastic))
    case "monitor":
    case "keyboard":
    case "mouse":
    case "speakers":
    case "printer":
    case "flashDrive":
      return deviceModel(kind)
    default:
      return buildPart(kind, placed)
  }
}

export type DeviceKind = "monitor" | "keyboard" | "mouse" | "speakers" | "printer" | "flashDrive" | "smartphone" | "powerStrip"

const DEVICES: Record<DeviceKind, () => Group> = { monitor, keyboard, mouse, speakers, printer, flashDrive, smartphone, powerStrip }

/** The device itself, for desk props, baskets and tray pictures. */
export const deviceModel = (kind: DeviceKind): Group => {
  const code = shadowed(DEVICES[kind]())
  // a smartphone or a power strip is no part of the computer: no realistic model for them
  const real = kind === "smartphone" || kind === "powerStrip" ? null : realModel(kind)
  return real ? standIn(real, code) : code
}

/** The device a cable belongs to: its tray picture shows the device, so the student knows whose cable it is. */
const CABLE_OF: Partial<Record<PartKind, DeviceKind>> = { monitorCable: "monitor", keyboardCable: "keyboard", mouseCable: "mouse" }

/** The picture in the tray: the device for a device's cable, otherwise the part as held. */
export const iconModel = (kind: PartKind): Group => {
  const device = CABLE_OF[kind]
  return device ? deviceModel(device) : buildModel(kind, false)
}

// ---------- placed parts and their cables ----------

/**
 * Cable thickness and colour by the kind of plug: a bundle of wires as thick as a real one, not a hose.
 * Inside the case the bundles run along straight lanes with neat bends, held by cable ties.
 */
const CABLES: Partial<Record<PartKind, { readonly r: number; readonly color: string }>> = {
  atxCable: { r: 0.34, color: "#141518" },
  cpuPowerCable: { r: 0.2, color: "#141518" },
  gpuPowerCable: { r: 0.2, color: "#141518" },
  sataPowerCable: { r: 0.14, color: "#141518" },
  sataDataCable: { r: 0.09, color: "#c0392b" },
  fanCable: { r: 0.08, color: "#141518" },
  frontPanelCable: { r: 0.11, color: "#2b2d31" },
  frontAudioCable: { r: 0.11, color: "#141518" },
  frontUsbCable: { r: 0.18, color: "#1d3f8f" },
  monitorCable: { r: 0.3, color: "#1b1d21" },
  keyboardCable: { r: 0.2, color: "#3e434a" },
  mouseCable: { r: 0.18, color: "#1b1d21" }
}

/** How far a cable must go down to count as running to the desk. */
const DROP = 12
/** How far a cable runs straight out of its plug before it may bend. */
const LEAD = 1.4
/** How round a bend in a cable inside the case is: the corner is cut this far back on each side. */
const BEND = 0.9
/** A cable tie goes on a straight run at least this long, and one more every this much. */
const TIE_EVERY = 5
const TIE_LENGTH = 0.28
const tieMaterial = mat("#0c0d0f", { rough: 0.55 })

/** Where a plug's cable leaves it, and a point a little further along, in the plug's parent's coordinates. */
export interface CableEnd {
  readonly start: Vector3
  readonly lead: Vector3
}

const cableEnd = (plug: Group): CableEnd | null => {
  const out = plug.userData.cableOut
  const dir = plug.userData.cableDir
  if (!(out instanceof Vector3) || !(dir instanceof Vector3)) return null
  plug.updateMatrix()
  const start = out.clone().applyMatrix4(plug.matrix)
  const lead = start.clone().add(dir.clone().transformDirection(plug.matrix).multiplyScalar(LEAD))
  return { start, lead }
}

/**
 * A neat lane between two points inside the case: level at the height of the higher one, along one axis
 * and then the other, the way a tidy builder lays a cable. The first leg never goes back the way `from` came.
 */
export const laneBetween = (from: Vector3, to: Vector3, came: Vector3): Vector3[] => {
  const h = Math.max(from.y, to.y)
  const dx = to.x - from.x
  const dz = to.z - from.z
  // the cable keeps going the way it came out of the plug; it turns to the other axis only if it would go back
  const ax = Math.abs(came.x)
  const az = Math.abs(came.z)
  const xFirst =
    ax >= Math.abs(came.y) && ax >= az ? dx * came.x >= 0 : az >= Math.abs(came.y) ? dz * came.z < 0 : true
  const corner = xFirst ? new Vector3(to.x, h, from.z) : new Vector3(from.x, h, to.z)
  return [new Vector3(from.x, h, from.z), corner, new Vector3(to.x, h, to.z)]
}

/** Drops points that sit on the one before them: a curve through two equal points kinks. */
const distinct = (points: ReadonlyArray<Vector3>): Vector3[] =>
  points.filter((p, i) => i === 0 || p.distanceTo(points[i - 1] ?? p) > 0.05)

/** A polyline with every corner cut round: a curve through it runs straight and bends only at the corners. */
export const roundCorners = (points: ReadonlyArray<Vector3>, bend: number): Vector3[] => {
  const pts = distinct(points)
  if (pts.length < 3) return pts
  const out: Vector3[] = [pts[0] ?? new Vector3()]
  for (let i = 1; i + 1 < pts.length; i++) {
    const [a, p, b] = [pts[i - 1], pts[i], pts[i + 1]] as [Vector3, Vector3, Vector3]
    const cutIn = Math.min(bend, a.distanceTo(p) / 2)
    const cutOut = Math.min(bend, p.distanceTo(b) / 2)
    out.push(p.clone().lerp(a, cutIn / a.distanceTo(p)), p.clone().lerp(b, cutOut / p.distanceTo(b)))
  }
  out.push(pts[pts.length - 1] ?? new Vector3())
  return distinct(out)
}

/** Cable ties round a bundle: one in the middle of every long straight run, and more along a very long one. */
const cableTies = (points: ReadonlyArray<Vector3>, r: number): Mesh[] => {
  const ties: Mesh[] = []
  for (let i = 0; i + 1 < points.length; i++) {
    const [a, b] = [points[i], points[i + 1]] as [Vector3, Vector3]
    const length = a.distanceTo(b)
    if (length < TIE_EVERY) continue
    const count = Math.floor(length / TIE_EVERY)
    const dir = b.clone().sub(a).normalize()
    for (let k = 1; k <= count; k++) {
      const tie = new Mesh(new CylinderGeometry(r * 1.3, r * 1.3, TIE_LENGTH, 12), tieMaterial)
      tie.position.copy(a).lerp(b, k / (count + 1))
      tie.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir)
      ties.push(tie)
    }
  }
  return ties
}

/**
 * A cable from a placed plug to where it comes from. Inside the case it runs along neat lanes with round
 * bends and cable ties: through `via` (the grommets of the board tray) when the pose gives them, otherwise
 * level over the parts; with `other` it ends in the plug on its other end. A cable to a device on the desk hangs down.
 */
const cableTube = (plug: Group, kind: PartKind, to: Vector3, via: ReadonlyArray<Vector3>, other: CableEnd | null): Group | null => {
  const look = CABLES[kind]
  const end = cableEnd(plug)
  if (!look || !end) return null
  const { start, lead } = end
  const tail = other ? [other.lead, other.start] : [to]
  const target = tail[0] ?? to
  const g = new Group()
  let points: Vector3[]
  if (via.length === 0 && start.y - to.y > DROP && !other) {
    // a cable down to a device on the desk hangs behind the system unit and runs along the desk;
    // it hangs down on the side the plug faces: behind the system unit, whichever way that is
    const away = new Vector3(lead.x - start.x, 0, lead.z - start.z)
    if (away.lengthSq() > 0.01) away.setLength(3)
    const mid = new Vector3(lead.x + away.x, to.y + look.r, lead.z + away.z)
    points = [start, lead, mid, new Vector3((mid.x + to.x) / 2, to.y + look.r, (mid.z + to.z) / 2), to]
  } else {
    const came = lead.clone().sub(start)
    const route = via.length > 0 ? [lead, ...via] : laneBetween(lead, target, came)
    const path = roundCorners([start, ...route, ...tail], BEND)
    for (const tie of cableTies(distinct([start, ...route, ...tail]), look.r)) g.add(tie)
    points = path
  }
  const tube = new Mesh(new TubeGeometry(new CatmullRomCurve3(points, false, "centripetal"), 160, look.r, 10), mat(look.color, { rough: 0.7 }))
  tube.castShadow = true
  g.add(tube)
  return g
}

/** Shrinks a model (never grows it) so its footprint fits an area, as a monitor in a sorting basket. */
const fitInto = (model: Group, area: SlotPose["area"]): void => {
  const size = new Box3().setFromObject(model).getSize(new Vector3())
  const k = Math.min(1, (area[0] - 1) / Math.max(size.x, 0.01), (area[2] - 1) / Math.max(size.z, 0.01))
  model.scale.setScalar(k)
}

const posed = (kind: PartKind, pose: SlotPose, turn: number): Group => {
  const model = buildModel(kind, true)
  model.position.set(...pose.at)
  model.rotation.set(pose.pitch ?? 0, (-turn * Math.PI) / 2 + (pose.yaw ?? 0), pose.roll ?? 0, "YXZ")
  if (pose.fit) fitInto(model, pose.area)
  return model
}

/** Where the cable leaves a plug standing in a slot: for drawing a cable that ends in it. */
export const plugEnd = (kind: PartKind, pose: SlotPose, turn: number): CableEnd | null => cableEnd(posed(kind, pose, turn))

/**
 * A part as it stands in its slot: moved there, turned, rolled, scaled, with its cable when it has one.
 * `cable`: "own" draws the cable to where the pose says it comes from; a cable end draws it to the plug on
 * the cable's other end; "none" draws no cable (the other end's cable is drawn with that end).
 */
export const placedModel = (kind: PartKind, pose: SlotPose, turn: number, cable: CableEnd | "own" | "none" = "own"): Group => {
  const model = posed(kind, pose, turn)
  const g = new Group()
  g.add(model)
  const from = pose.cablesFrom?.[kind] ?? pose.cableFrom
  if (cable !== "none" && (from || cable !== "own")) {
    const other = cable === "own" ? null : cable
    const via = (pose.via ?? []).map((v) => new Vector3(...v))
    const tube = cableTube(model, kind, new Vector3(...(from ?? [0, 0, 0])), via, other)
    if (tube) g.add(tube)
  }
  return g
}

/**
 * The finished computer from the grade 8 case scenario, without the graphics card, standing upright
 * with its front to the student (see `standing`): the system unit of the grade 3–4 desk. The monitor goes into the board's HDMI.
 */
export const systemUnit = (): Group => {
  const inside = new Group()
  inside.add(buildModel("case", true))
  const skip = new Set(["gpu", "pcie", "pcieEnd", "monitor", "keyboard", "mouse"])
  for (const [slot, part] of Object.entries(SOLVED_CASE)) {
    const kind = grade8Case.parts.find((p) => p.id === part)?.kind
    const pose = grade8CaseLayout.slots[slot]
    if (!kind || !pose || skip.has(part)) continue
    const turn = grade8Case.slots.find((s) => s.id === slot)?.turn ?? 0
    inside.add(placedModel(kind, pose, turn))
  }
  // stand it up: the case's top (-x) goes up, its open side (+y) to the right; then turn it half round, front to the student
  inside.rotation.z = -Math.PI / 2
  inside.position.set(0, CASE_SIZE[0] / 2, 0)
  const g = new Group()
  g.add(inside)
  g.position.set(TOWER_AT[0], 0, TOWER_AT[2])
  g.rotation.y = Math.PI
  return g
}

/** Where every part of the grade 8 case scenario ends up: the first allowed slot of each target. */
const SOLVED_CASE: Readonly<Record<string, string>> = Object.fromEntries(
  grade8Case.steps.flatMap((step) => (step.kind === "place" ? Object.entries(step.targets).map(([part, slots]) => [slots[0] ?? "", part]) : []))
)
