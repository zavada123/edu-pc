import { Box3, Vector3 } from "three"
import { describe, expect, test } from "vitest"
import { plugModel } from "./devices.ts"
import { CASE_FRAMES } from "./layout.ts"
import { BOARD_PORTS, type DeviceFrame, GPU_PORTS, HDD_PORTS, IDENTITY, PLUGS, PSU_PORTS, type Port, portPose } from "./ports.ts"

// the plugs' labels are drawn on a canvas: in tests a canvas that draws nothing
const context = new Proxy({}, { get: () => () => ({ width: 10, data: new Uint8ClampedArray(4) }) })
globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => context }) } as unknown as Document

/** Every port, with the frame of its device in the case, and on its own (as on the desk). */
const ALL: Array<[string, Port, DeviceFrame]> = [
  ...Object.entries(BOARD_PORTS).flatMap(([id, p]): Array<[string, Port, DeviceFrame]> => [
    [`board ${id}`, p, IDENTITY],
    [`board in case ${id}`, p, CASE_FRAMES.board]
  ]),
  ...Object.entries(GPU_PORTS).map(([id, p]): [string, Port, DeviceFrame] => [`gpu ${id}`, p, CASE_FRAMES.gpu]),
  ...Object.entries(HDD_PORTS).map(([id, p]): [string, Port, DeviceFrame] => [`disk ${id}`, p, CASE_FRAMES.hdd]),
  ...Object.entries(PSU_PORTS).map(([id, p]): [string, Port, DeviceFrame] => [`psu ${id}`, p, CASE_FRAMES.psu])
]

const unit = (v: Vector3): Vector3 => new Vector3(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z))
const along = (box: Box3, dir: Vector3): number => box.getSize(new Vector3()).dot(unit(dir))

/** A plug of the port's kind, seated the way the scene seats it. */
const seated = (port: Port, frame: DeviceFrame): Box3 => {
  const pose = portPose(port, frame)
  const plug = plugModel(port.kind)
  plug.position.copy(pose.at)
  plug.quaternion.copy(pose.orient)
  plug.updateMatrixWorld(true)
  // the plug's own body (a USB or HDMI plug's grip, behind its metal tongue)
  const body = plug.children[port.kind === "usbA" || port.kind === "hdmi" ? 1 : 0]
  return new Box3().setFromObject(body ?? plug)
}

describe("the port map", () => {
  test("every port's directions are whole axes, at right angles", () => {
    for (const [name, port, frame] of ALL) {
      const pose = portPose(port, frame)
      for (const v of [pose.insert, pose.along]) expect(Math.max(...unit(v).toArray()), name).toBeCloseTo(1, 6)
      expect(pose.insert.dot(pose.along), name).toBeCloseTo(0, 6)
    }
  })

  test("a plug's long side runs along its socket's long side (the F_PANEL plug lay across it)", () => {
    for (const [name, port, frame] of ALL) {
      const pose = portPose(port, frame)
      const box = seated(port, frame)
      const across = new Vector3().crossVectors(pose.along, pose.insert)
      expect(along(box, pose.along), name).toBeGreaterThanOrEqual(along(box, across) - 1e-6)
      expect(along(box, pose.along), name).toBeCloseTo(PLUGS[port.kind].size[0], 1)
    }
  })

  test("a plug sits in the middle of its socket, on its face, going the way the socket takes it", () => {
    for (const [name, port, frame] of ALL) {
      const pose = portPose(port, frame)
      const box = seated(port, frame)
      const centre = box.getCenter(new Vector3())
      const off = centre.clone().sub(pose.at)
      // centred on the socket along both sides of the face
      expect(Math.abs(off.dot(pose.along)), name).toBeLessThan(0.05)
      expect(Math.abs(off.dot(new Vector3().crossVectors(pose.along, pose.insert))), name).toBeLessThan(0.15)
      // the body stands out of the face, against the way it went in, all its height
      expect(off.dot(pose.insert), name).toBeCloseTo(-PLUGS[port.kind].size[2] / 2, 1)
    }
  })

  test("the plug covers its socket: as long as the housing, at least", () => {
    for (const [name, port] of ALL) expect(PLUGS[port.kind].size[0], name).toBeGreaterThanOrEqual(port.housing[0] - 0.3)
  })
})
