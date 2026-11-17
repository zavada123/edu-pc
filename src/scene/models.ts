import { Box3, CatmullRomCurve3, CylinderGeometry, ExtrudeGeometry, Group, Mesh, Path, Quaternion, Shape, ShapeGeometry, TubeGeometry, Vector3 } from "three"
import type { PartKind } from "../core/parts.ts"
import { grade8Case } from "../scenarios/grade8-case.ts"
import { grade8Club } from "../scenarios/grade8-club.ts"
import { buildBoard, buildLever } from "./board.ts"
import { buildCase, caseFan, trayGrommets } from "./case.ts"
import { hasRealModel, PLACED_BY_FILE, realModel } from "./gltf.ts"
import {
  flashDrive,
  graphicsCard,
  hardDisk,
  keyboard,
  monitor,
  mouse,
  plugModel,
  powerStrip,
  powerSupply,
  printer,
  psuPanel,
  sidePanel,
  smartphone,
  speakers
} from "./devices.ts"
import { M, mat, shadowed } from "./kit.ts"
import { BOARD_IN_CASE, CASE_SIZE, IO_REACH, GRADE8_BOARD, grade8CaseLayout, grade8DeskLayout, type SlotPose, TOWER_AT } from "./layout.ts"
import { buildPart } from "./parts.ts"
import { type ConnectorKind, PLUGS } from "./ports.ts"
import { REAR_FAN, type RouteStep, runRoute, TRAY_Y } from "./routes.ts"

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
    g.add(placedModel(kind, pose, 0))
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
  if (!real) return code
  const model = standIn(real, code)
  // the realistic supply's sockets are only a blurred picture: our panel of real sockets goes over it
  if (kind === "psu") model.add(psuPanel())
  return model
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
 * opening (x, y in case coordinates, measured on the case's file) against the inside of the wall (z 21.96), round the ports, which come through it.
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

/** The shield plate with a cut-out for each block of rear ports, in the case's back wall. */
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
  const mesh = new Mesh(new ExtrudeGeometry(plate, { depth: IO_SHIELD.thick, bevelEnabled: false }), mat("#8d939a", { metal: 0.85, rough: 0.4 }))
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

const withIoShield = (real: Group): Group => {
  real.add(ioShieldPlate(), trayGrommets(TRAY_Y, true), rearFan())
  return real
}

/** The rear case fan inside the back wall, behind its honeycomb: the case fan's cable comes from it. */
const rearFan = (): Group => {
  const fan = caseFan(REAR_FAN.size)
  fan.rotation.x = Math.PI / 2
  fan.position.set(...REAR_FAN.at)
  return fan
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

/** The connector each cable's plug is, wherever it goes: a slot from the port map may say a closer one (a 6-pin socket). */
export const PLUG_OF: Partial<Record<PartKind, ConnectorKind>> = {
  atxCable: "atx24",
  cpuPowerCable: "eps8",
  gpuPowerCable: "pcie8",
  sataPowerCable: "sataPower",
  sataDataCable: "sataData",
  psuPlug: "psu8",
  frontPanelCable: "fPanel",
  frontAudioCable: "hdAudio",
  frontUsbCable: "usb3Header",
  monitorCable: "hdmi",
  keyboardCable: "usbA",
  mouseCable: "usbA"
}

/** A cable's plug as the connector it goes into, in the colour of its device's cable. */
const plugFor = (connector: ConnectorKind, kind: PartKind): Group =>
  shadowed(plugModel(connector, kind === "keyboardCable" ? mat("#5b6169", { rough: 0.5 }) : M.blackPlastic))

const codeModel = (kind: PartKind, placed: boolean): Group => {
  const plug = PLUG_OF[kind]
  if (plug) return plugFor(plug, kind)
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
    case "sidePanel":
      return realCaseActive() ? fitToRealCase(sidePanel()) : sidePanel()
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

/** Cable thickness and colour by the kind of plug, when its plug is not one from the port map. */
const CABLES: Partial<Record<PartKind, { readonly r: number; readonly color: string }>> = {
  fanCable: PLUGS.fan4.cable
}

const cableLook = (kind: PartKind, connector: ConnectorKind | undefined): { readonly r: number; readonly color: string } | undefined => {
  const plug = connector ?? PLUG_OF[kind]
  return plug ? PLUGS[plug].cable : CABLES[kind]
}

/** How far a cable must go down to count as running to the desk. */
const DROP = 12
/** How far a cable runs straight out of a plug that is not from the port map before it may bend. */
const LEAD = 1.4
/** A cable tie goes on a straight run inside the case at least this long, and one more every this much. */
const TIE_EVERY = 5
const TIE_LENGTH = 0.28
const tieMaterial = mat("#0c0d0f", { rough: 0.55 })

/** Where a plug's cable leaves it, and the end of its straight lead, in the plug's parent's coordinates. */
export interface CableEnd {
  readonly start: Vector3
  readonly lead: Vector3
}

const cableEnd = (plug: Group, lead = LEAD): CableEnd | null => {
  const out = plug.userData.cableOut
  const dir = plug.userData.cableDir
  if (!(out instanceof Vector3) || !(dir instanceof Vector3)) return null
  plug.updateMatrix()
  const start = out.clone().applyMatrix4(plug.matrix)
  const end = start.clone().add(dir.clone().transformDirection(plug.matrix).multiplyScalar(lead))
  return { start, lead: end }
}

/**
 * A neat lane between two points inside the case: level at the height of the higher one, along one axis
 * and then the other. Only for a cable whose ends have no route of their own (a plug hanging loose).
 * The first leg never goes back the way `from` came.
 */
export const laneBetween = (from: Vector3, to: Vector3, came: Vector3): Vector3[] => {
  const h = Math.max(from.y, to.y)
  const dx = to.x - from.x
  const dz = to.z - from.z
  const ax = Math.abs(came.x)
  const az = Math.abs(came.z)
  const xFirst =
    ax >= Math.abs(came.y) && ax >= az ? dx * came.x >= 0 : az >= Math.abs(came.y) ? dz * came.z < 0 : true
  const corner = xFirst ? new Vector3(to.x, h, from.z) : new Vector3(from.x, h, to.z)
  return [new Vector3(from.x, h, from.z), corner, new Vector3(to.x, h, to.z)]
}

/** Drops points that sit on the one before them, and middles of straight runs: a curve through them kinks. */
const distinct = (points: ReadonlyArray<Vector3>): Vector3[] => {
  const out = points.filter((p, i) => i === 0 || p.distanceTo(points[i - 1] ?? p) > 0.01)
  return out.filter((p, i) => {
    const a = out[i - 1]
    const b = out[i + 1]
    if (!a || !b) return true
    const u = p.clone().sub(a).normalize()
    const v = b.clone().sub(p).normalize()
    return u.dot(v) < 0.9999
  })
}

/** A polyline with every corner cut round: a curve through it runs straight and bends only at the corners. */
export const roundCorners = (points: ReadonlyArray<Vector3>, bend: number): Vector3[] => {
  const pts = distinct(points)
  if (pts.length < 3) return pts
  const out: Vector3[] = [pts[0] ?? new Vector3()]
  for (let i = 1; i + 1 < pts.length; i++) {
    const [a, p, b] = [pts[i - 1], pts[i], pts[i + 1]] as [Vector3, Vector3, Vector3]
    const cutIn = Math.min(bend, a.distanceTo(p) / 2)
    const cutOut = Math.min(bend, p.distanceTo(b) / 2)
    // a quarter circle's worth of points, so the bend is round and not a kink
    const from = p.clone().lerp(a, cutIn / a.distanceTo(p))
    const to = p.clone().lerp(b, cutOut / p.distanceTo(b))
    out.push(from)
    for (const t of [0.25, 0.5, 0.75]) {
      // a quadratic Bézier through the corner: from → p → to
      const q = from.clone().multiplyScalar((1 - t) * (1 - t)).addScaledVector(p, 2 * t * (1 - t)).addScaledVector(to, t * t)
      out.push(q)
    }
    out.push(to)
  }
  out.push(pts[pts.length - 1] ?? new Vector3())
  return out.filter((p, i) => i === 0 || p.distanceTo(out[i - 1] ?? p) > 0.005)
}

/** Cable ties round a bundle in sight (above the tray): one in the middle of every long straight run, more along a very long one. */
const cableTies = (points: ReadonlyArray<Vector3>, r: number): Mesh[] => {
  const ties: Mesh[] = []
  for (let i = 0; i + 1 < points.length; i++) {
    const [a, b] = [points[i], points[i + 1]] as [Vector3, Vector3]
    const length = a.distanceTo(b)
    if (length < TIE_EVERY || Math.min(a.y, b.y) < TRAY_Y + r) continue
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
 * The corners a cable passes, from where it leaves the plug to its other end: straight out of the plug, then
 * its route (see routes.ts), then straight into the plug on its other end, or to the point it comes from.
 * Without a route (a plug hanging loose) it takes a plain lane there.
 */
export const cablePath = (end: CableEnd, route: ReadonlyArray<RouteStep> | undefined, target: Vector3, other: CableEnd | null): Vector3[] => {
  const goal = other?.lead ?? target
  const tail = other ? [other.lead, other.start] : [target]
  const steps = route ? runRoute(end.lead, route, goal) : []
  const reached = steps.length > 0 && (steps[steps.length - 1]?.distanceTo(goal) ?? 1) < 1e-6
  const middle = reached ? steps.slice(0, -1) : laneBetween(end.lead, goal, end.lead.clone().sub(end.start))
  return distinct([end.start, end.lead, ...middle, ...tail])
}

/**
 * A cable from a placed plug to where it comes from: along its route with round bends and cable ties, ending
 * in the plug on its other end when `other` is given. A cable to a device on the desk hangs down.
 */
const cableTube = (plug: Group, look: { r: number; color: string }, lead: number, to: Vector3, route: ReadonlyArray<RouteStep> | undefined, other: CableEnd | null): Group | null => {
  const end = cableEnd(plug, lead)
  if (!end) return null
  const { start } = end
  const g = new Group()
  let points: Vector3[]
  if (!route && start.y - to.y > DROP && !other) {
    // a cable down to a device on the desk hangs behind the system unit and runs along the desk;
    // it hangs down on the side the plug faces: behind the system unit, whichever way that is
    const away = new Vector3(end.lead.x - start.x, 0, end.lead.z - start.z)
    if (away.lengthSq() > 0.01) away.setLength(3)
    const mid = new Vector3(end.lead.x + away.x, to.y + look.r, end.lead.z + away.z)
    points = [start, end.lead, mid, new Vector3((mid.x + to.x) / 2, to.y + look.r, (mid.z + to.z) / 2), to]
  } else {
    const path = cablePath(end, route, to, other)
    for (const tie of cableTies(path, look.r)) g.add(tie)
    // a thick bundle bends wider than a thin wire
    points = roundCorners(path, Math.max(0.5, look.r * 3))
  }
  const curve = new CatmullRomCurve3(points, false, "centripetal")
  const segments = Math.min(600, Math.max(64, Math.round(curve.getLength() * 6)))
  const tube = new Mesh(new TubeGeometry(curve, segments, look.r, 10), mat(look.color, { rough: 0.7 }))
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

/** The model of a part placed in a slot: a plug in a port from the port map is the plug of that port's kind. */
const placedPart = (kind: PartKind, pose: SlotPose): Group => {
  if (pose.connector && (PLUG_OF[kind] || kind === "fanCable")) return plugFor(pose.connector, kind)
  return buildModel(kind, true)
}

const posed = (kind: PartKind, pose: SlotPose, turn: number): Group => {
  const model = placedPart(kind, pose)
  model.position.set(...pose.at)
  if (pose.orient) model.quaternion.copy(new Quaternion(...pose.orient))
  else model.rotation.set(pose.pitch ?? 0, (-turn * Math.PI) / 2 + (pose.yaw ?? 0), pose.roll ?? 0, "YXZ")
  if (pose.fit) fitInto(model, pose.area)
  return model
}

/** How far the cable of this part leaves its plug straight, in this slot. */
const leadOf = (kind: PartKind, pose: SlotPose): number => {
  const plug = pose.connector ?? PLUG_OF[kind]
  return plug ? PLUGS[plug].lead : LEAD
}

/** Where the cable leaves a plug standing in a slot: for drawing a cable that ends in it. */
export const plugEnd = (kind: PartKind, pose: SlotPose, turn: number): CableEnd | null => cableEnd(posed(kind, pose, turn), leadOf(kind, pose))

/**
 * A part as it stands in its slot: moved there, turned, scaled, with its cable when it has one.
 * `cable`: "own" draws the cable to where the pose says it comes from; a cable end draws it to the plug on
 * the cable's other end; "none" draws no cable (the other end's cable is drawn with that end).
 */
export const placedModel = (kind: PartKind, pose: SlotPose, turn: number, cable: CableEnd | "own" | "none" = "own"): Group => {
  const model = posed(kind, pose, turn)
  const g = new Group()
  g.add(model)
  const from = pose.cablesFrom?.[kind] ?? pose.cableFrom
  const look = cableLook(kind, pose.connector)
  if (cable !== "none" && look && (from || cable !== "own")) {
    const other = cable === "own" ? null : cable
    const tube = cableTube(model, look, leadOf(kind, pose), new Vector3(...(from ?? [0, 0, 0])), pose.route, other)
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
  for (const p of solvedCase()) if (!skip.has(p.part)) inside.add(placedModel(p.kind, p.pose, p.turn, p.cable))
  // stand it up: the case's top (-x) goes up, its open side (+y) to the right; then turn it half round, front to the student
  inside.rotation.z = -Math.PI / 2
  inside.position.set(0, CASE_SIZE[0] / 2, 0)
  const g = new Group()
  g.add(inside)
  g.position.set(TOWER_AT[0], 0, TOWER_AT[2])
  g.rotation.y = Math.PI
  return g
}

/** A part of the solved grade 8 case: where it stands, and how its cable is drawn (see `placedModel`). */
export interface SolvedPart {
  readonly slot: string
  readonly part: string
  readonly kind: PartKind
  readonly pose: SlotPose
  readonly turn: number
  readonly cable: CableEnd | "own" | "none"
}

/**
 * Every part of the grade 8 case scenario in its place, as the scene draws it once all are in: a cable with
 * two plugs is drawn once, from its first end to the plug on its second.
 */
export const solvedCase = (): SolvedPart[] => {
  const turnOf = (slot: string): number => grade8Case.slots.find((s) => s.id === slot)?.turn ?? 0
  const slotOf = (part: string): string | undefined => Object.entries(SOLVED_CASE).find(([, p]) => p === part)?.[0]
  const out: SolvedPart[] = []
  for (const [slot, part] of Object.entries(SOLVED_CASE)) {
    const info = grade8Case.parts.find((p) => p.id === part)
    const pose = grade8CaseLayout.slots[slot]
    if (!info || !pose) continue
    const turn = turnOf(slot)
    const second = grade8Case.parts.find((p) => p.end === part)
    const secondSlot = second ? slotOf(second.id) : undefined
    const secondPose = secondSlot ? grade8CaseLayout.slots[secondSlot] : undefined
    let cable: SolvedPart["cable"] = "own"
    if (info.end !== undefined) cable = "none"
    else if (second && secondSlot && secondPose) cable = plugEnd(second.kind, secondPose, turnOf(secondSlot)) ?? "own"
    out.push({ slot, part, kind: info.kind, pose, turn, cable })
  }
  return out
}

/** The corners of a placed part's cable, as `placedModel` draws it before rounding them: for checking routes. */
export const cableCorners = (p: SolvedPart): Vector3[] | null => {
  if (p.cable === "none") return null
  const from = p.pose.cablesFrom?.[p.kind] ?? p.pose.cableFrom
  if (!from && p.cable === "own") return null
  const end = cableEnd(posed(p.kind, p.pose, p.turn), leadOf(p.kind, p.pose))
  if (!end) return null
  return cablePath(end, p.pose.route, new Vector3(...(from ?? [0, 0, 0])), p.cable === "own" ? null : p.cable)
}

/** The box a placed part's plug takes, in its parent's coordinates: other cables keep off it. */
export const plugBox = (p: SolvedPart): Box3 | null => {
  if (!p.pose.connector) return null
  const model = posed(p.kind, p.pose, p.turn)
  model.updateMatrixWorld(true)
  return new Box3().setFromObject(model.children[0] ?? model)
}

/** Where every part of the grade 8 case scenario ends up: the first allowed slot of each target. */
const SOLVED_CASE: Readonly<Record<string, string>> = Object.fromEntries(
  grade8Case.steps.flatMap((step) => (step.kind === "place" ? Object.entries(step.targets).map(([part, slots]) => [slots[0] ?? "", part]) : []))
)
