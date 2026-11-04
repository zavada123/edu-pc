import { Group } from "three"
import type { PartKind } from "../core/parts.ts"
import { grade8Club } from "../scenarios/grade8-club.ts"
import { buildBoard, buildLever } from "./board.ts"
import { buildCase } from "./case.ts"
import {
  atxPlug,
  eightPinPlug,
  graphicsCard,
  hardDisk,
  hdmiPlug,
  keyboard,
  monitor,
  mouse,
  powerSupply,
  sataDataPlug,
  sataPowerPlug,
  sidePanel,
  usbPlug
} from "./devices.ts"
import { M, mat, shadowed } from "./kit.ts"
import { GRADE8_BOARD, grade8DeskLayout } from "./layout.ts"
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
  "mouse"
])

/**
 * The model of a part in the scene. `placed` is its look once installed. A device on the desk
 * (monitor, keyboard, mouse) is handled by its plug: that is what the student holds and plugs in.
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
    case "monitor":
      return shadowed(hdmiPlug())
    case "keyboard":
      return shadowed(usbPlug(mat("#5b6169", { rough: 0.5 })))
    case "mouse":
      return shadowed(usbPlug(M.blackPlastic))
    default:
      return buildPart(kind, placed)
  }
}

/** The device itself, for desk props and tray pictures. */
export const deviceModel = (kind: "monitor" | "keyboard" | "mouse"): Group =>
  shadowed(kind === "monitor" ? monitor() : kind === "keyboard" ? keyboard() : mouse())

/** The picture in the tray: the device for a monitor, keyboard or mouse, otherwise the part as held. */
export const iconModel = (kind: PartKind): Group =>
  kind === "monitor" || kind === "keyboard" || kind === "mouse" ? deviceModel(kind) : buildModel(kind, false)
