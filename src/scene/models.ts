import { Box3, CatmullRomCurve3, Group, Mesh, TubeGeometry, Vector3 } from "three"
import type { PartKind } from "../core/parts.ts"
import { grade8Case } from "../scenarios/grade8-case.ts"
import { grade8Club } from "../scenarios/grade8-club.ts"
import { buildBoard, buildLever } from "./board.ts"
import { buildCase } from "./case.ts"
import {
  atxPlug,
  eightPinPlug,
  flashDrive,
  graphicsCard,
  hardDisk,
  hdmiPlug,
  keyboard,
  monitor,
  mouse,
  powerSupply,
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
    const part = buildPart(kind, true)
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
  "mouseCable"
])

/**
 * The model of a part in the scene. `placed` is its look once installed. A device's cable
 * (monitorCable, keyboardCable, mouseCable) is its plug: that is what the student holds and plugs in.
 */
export const buildModel = (kind: PartKind, placed: boolean): Group => {
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
      return sidePanel()
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

export type DeviceKind = "monitor" | "keyboard" | "mouse" | "speakers" | "printer" | "flashDrive" | "smartphone"

const DEVICES: Record<DeviceKind, () => Group> = { monitor, keyboard, mouse, speakers, printer, flashDrive, smartphone }

/** The device itself, for desk props, baskets and tray pictures. */
export const deviceModel = (kind: DeviceKind): Group => shadowed(DEVICES[kind]())

/** The device a cable belongs to: its tray picture shows the device, so the student knows whose cable it is. */
const CABLE_OF: Partial<Record<PartKind, DeviceKind>> = { monitorCable: "monitor", keyboardCable: "keyboard", mouseCable: "mouse" }

/** The picture in the tray: the device for a device's cable, otherwise the part as held. */
export const iconModel = (kind: PartKind): Group => {
  const device = CABLE_OF[kind]
  return device ? deviceModel(device) : buildModel(kind, false)
}

// ---------- placed parts and their cables ----------

/** Cable thickness and colour by the kind of plug. */
const CABLES: Partial<Record<PartKind, { readonly r: number; readonly color: string }>> = {
  atxCable: { r: 0.55, color: "#141518" },
  cpuPowerCable: { r: 0.32, color: "#141518" },
  gpuPowerCable: { r: 0.32, color: "#141518" },
  sataPowerCable: { r: 0.22, color: "#141518" },
  sataDataCable: { r: 0.14, color: "#c0392b" },
  monitorCable: { r: 0.3, color: "#1b1d21" },
  keyboardCable: { r: 0.2, color: "#3e434a" },
  mouseCable: { r: 0.18, color: "#1b1d21" }
}

/** How far a cable must go down to count as running to the desk. */
const DROP = 12

/** A cable from a placed plug to where it comes from, sagging a little on the way. */
const cableTube = (plug: Group, kind: PartKind, to: Vector3): Mesh | null => {
  const look = CABLES[kind]
  const out = plug.userData.cableOut
  const dir = plug.userData.cableDir
  if (!look || !(out instanceof Vector3) || !(dir instanceof Vector3)) return null
  plug.updateMatrix()
  const start = out.clone().applyMatrix4(plug.matrix)
  const lead = start.clone().add(dir.clone().transformDirection(plug.matrix).multiplyScalar(2.5))
  // a cable down to a device on the desk hangs behind the system unit and runs along the desk;
  // inside the case it arcs over the parts
  const toDesk = start.y - to.y > DROP
  const mid = toDesk
    ? new Vector3(lead.x, to.y + look.r, lead.z + 3)
    : new Vector3((lead.x + to.x) / 2, Math.max(start.y, to.y) + 2, (lead.z + to.z) / 2)
  const points = toDesk ? [start, lead, mid, new Vector3((mid.x + to.x) / 2, to.y + look.r, (mid.z + to.z) / 2), to] : [start, lead, mid, to]
  const tube = new Mesh(new TubeGeometry(new CatmullRomCurve3(points), 64, look.r, 10), mat(look.color, { rough: 0.7 }))
  tube.castShadow = true
  return tube
}

/** Shrinks a model (never grows it) so its footprint fits an area, as a monitor in a sorting basket. */
const fitInto = (model: Group, area: SlotPose["area"]): void => {
  const size = new Box3().setFromObject(model).getSize(new Vector3())
  const k = Math.min(1, (area[0] - 1) / Math.max(size.x, 0.01), (area[2] - 1) / Math.max(size.z, 0.01))
  model.scale.setScalar(k)
}

/** A part as it stands in its slot: moved there, turned, rolled, scaled, with its cable when it has one. */
export const placedModel = (kind: PartKind, pose: SlotPose, turn: number): Group => {
  const model = buildModel(kind, true)
  model.position.set(...pose.at)
  model.rotation.set(0, (-turn * Math.PI) / 2, pose.roll ?? 0, "YXZ")
  if (pose.fit) fitInto(model, pose.area)
  const g = new Group()
  g.add(model)
  const from = pose.cablesFrom?.[kind] ?? pose.cableFrom
  if (from) {
    const cable = cableTube(model, kind, new Vector3(...from))
    if (cable) g.add(cable)
  }
  return g
}

/**
 * The finished computer from the grade 8 case scenario, without the graphics card, standing upright
 * with its glass side to the right: the system unit of the grade 3–4 desk. The monitor goes into the board's HDMI.
 */
export const systemUnit = (): Group => {
  const inside = new Group()
  inside.add(buildCase())
  const skip = new Set(["gpu", "pcie", "monitor", "keyboard", "mouse"])
  for (const [slot, part] of Object.entries(SOLVED_CASE)) {
    const kind = grade8Case.parts.find((p) => p.id === part)?.kind
    const pose = grade8CaseLayout.slots[slot]
    if (!kind || !pose || skip.has(part)) continue
    const turn = grade8Case.slots.find((s) => s.id === slot)?.turn ?? 0
    inside.add(placedModel(kind, pose, turn))
  }
  // stand it up: the case's top (-x) goes up, its open side (+y) to the right
  inside.rotation.z = -Math.PI / 2
  inside.position.set(TOWER_AT[0], CASE_SIZE[0] / 2, TOWER_AT[2])
  const g = new Group()
  g.add(inside)
  return g
}

/** Where every part of the grade 8 case scenario ends up: the first allowed slot of each target. */
const SOLVED_CASE: Readonly<Record<string, string>> = Object.fromEntries(
  grade8Case.steps.flatMap((step) => (step.kind === "place" ? Object.entries(step.targets).map(([part, slots]) => [slots[0] ?? "", part]) : []))
)
