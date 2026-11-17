import { Box3, Line3, Vector3 } from "three"
import { describe, expect, test } from "vitest"
import { grade8CaseLayout } from "./layout.ts"
import { cableCorners, plugBox, solvedCase } from "./models.ts"
import { PLUGS } from "./ports.ts"
import { GROMMETS, ROUTES, SIDE_WALL_Y, runRoute, trayTop } from "./routes.ts"

// the plugs' labels are drawn on a canvas: in tests a canvas that draws nothing
const context = new Proxy({}, { get: () => () => ({ width: 10, data: new Uint8ClampedArray(4) }) })
globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => context }) } as unknown as Document

const cables = solvedCase()
  .map((p) => ({ ...p, path: cableCorners(p) }))
  .filter((p): p is typeof p & { path: Vector3[] } => p.path !== null)
const inside = cables.filter((c) => c.pose.route)
const axesMoved = (a: Vector3, b: Vector3): number => ["x", "y", "z"].filter((k) => Math.abs(a[k as "x"] - b[k as "x"]) > 1e-6).length
const inGrommet = (p: Vector3): boolean => GROMMETS.some((g) => p.x >= g.x[0] && p.x <= g.x[1] && p.z >= g.z[0] && p.z <= g.z[1])
const behind = (p: Vector3): boolean => p.y < (trayTop(p.x, p.z) ?? -Infinity)

describe("runRoute", () => {
  test("moves along one axis a step and fills in the other end's coordinate", () => {
    const pts = runRoute(new Vector3(0, 0, 0), [["x", 2], ["y", "end"]], new Vector3(5, 7, 9))
    expect(pts.map((p) => p.toArray())).toEqual([[2, 0, 0], [2, 7, 0]])
  })
})

describe("cable routes in the case", () => {
  test("every slot with a route has its plug's orientation from the port map", () => {
    for (const [slot, pose] of Object.entries(grade8CaseLayout.slots)) {
      if (pose.route) expect(pose.orient, slot).toBeDefined()
    }
  })

  test("every route in the table is used by a slot", () => {
    for (const slot of Object.keys(ROUTES)) expect(grade8CaseLayout.slots[slot]?.route, slot).toBe(ROUTES[slot])
  })

  test("all the cables of the solved case are drawn along their routes", () => {
    expect(inside.map((c) => c.slot).sort()).toEqual(Object.keys(ROUTES).sort())
  })

  test("a cable runs along one axis at a time: no slanted runs", () => {
    for (const c of inside) {
      for (let i = 0; i + 1 < c.path.length; i++) {
        expect(axesMoved(c.path[i] as Vector3, c.path[i + 1] as Vector3), `${c.slot} leg ${i}`).toBeLessThanOrEqual(1)
      }
    }
  })

  test("a cable leaves its plug straight along the port's axis before it bends", () => {
    for (const c of inside) {
      const [start, lead] = c.path as [Vector3, Vector3]
      expect(start.distanceTo(lead), c.slot).toBeGreaterThan(0.5)
      expect(axesMoved(start, lead), c.slot).toBe(1)
    }
  })

  test("a cable passes the board tray only through a grommet, or past its end into the open bay", () => {
    for (const c of inside) {
      for (const [i, [a, b]] of legs(c.path).entries()) {
        // walk the leg and find where it goes from in front of the tray to behind it, or back
        const n = Math.max(2, Math.ceil(a.distanceTo(b) / 0.02))
        let prev = a
        for (let k = 1; k <= n; k++) {
          const p = a.clone().lerp(b, k / n)
          const open = trayTop(p.x, p.z) === null || trayTop(prev.x, prev.z) === null
          if (behind(p) !== behind(prev) && !open) expect(inGrommet(p), `${c.slot} leg ${i} at ${p.toArray().map((v) => v.toFixed(2))}`).toBe(true)
          prev = p
        }
      }
    }
  })

  test("behind the tray a cable stays inside the case, and under the tray", () => {
    for (const c of inside) {
      const r = radius(c)
      for (const [i, [a, b]] of legs(c.path).entries()) {
        for (const p of [a, b]) {
          expect(p.y - r, `${c.slot} leg ${i}`).toBeGreaterThanOrEqual(SIDE_WALL_Y + 0.02)
          const top = trayTop(p.x, p.z)
          // a leg lying behind the tray, not one going through a grommet
          if (top !== null && a.y < top && b.y < top && Math.abs(a.y - b.y) < 1e-6) expect(p.y + r, `${c.slot} leg ${i}`).toBeLessThanOrEqual(top - 0.14)
        }
      }
    }
  })

  test("no two cables lie in one another, behind the tray or in sight", () => {
    for (const [i, c] of inside.entries()) {
      for (const o of inside.slice(i + 1)) {
        const gap = radius(c) + radius(o)
        for (const [a, b] of legs(c.path)) {
          for (const [p, q] of legs(o.path)) {
            expect(segmentDistance(a, b, p, q), `${c.slot} and ${o.slot}`).toBeGreaterThanOrEqual(gap - 0.01)
          }
        }
      }
    }
  })

  test("no cable runs through another cable's plug", () => {
    const plugs = solvedCase().flatMap((p) => {
      const box = plugBox(p)
      return box ? [{ slot: p.slot, box }] : []
    })
    for (const c of inside) {
      for (const [i, [a, b]] of legs(c.path).entries()) {
        for (const plug of plugs) {
          // its own plugs: the one it leaves, and the one on its other end that its last leg goes into
          const last = c.path[c.path.length - 1] as Vector3
          if (plug.slot === c.slot || (i === c.path.length - 2 && plug.box.distanceToPoint(last) < 0.05)) continue
          expect(segmentToBox(a, b, plug.box), `${c.slot} leg ${i} and the plug in ${plug.slot}`).toBeGreaterThanOrEqual(radius(c) - 0.01)
        }
      }
    }
  })

  test("no cable runs through the graphics card, disk, power supply or cooler", () => {
    for (const c of inside) {
      for (const [i, [a, b]] of legs(c.path).entries()) {
        for (const [name, box] of Object.entries(DEVICES)) {
          // the last leg goes into the device the cable comes from: the power supply's hole
          if (i === c.path.length - 2 && box.distanceToPoint(b) < 0.01) continue
          expect(segmentToBox(a, b, box), `${c.slot} leg ${i} and the ${name}`).toBeGreaterThanOrEqual(radius(c) - 0.01)
        }
      }
    }
  })
})

/** The devices in the case, as boxes in case coordinates, measured on their models (see ports.ts). */
const DEVICES: Record<string, Box3> = {
  // the card's body starts 1.4 above its slot: below that only the slot's fingers
  gpu: new Box3(new Vector3(-3.31, 3.46, -4.04), new Vector3(4.41, 13.52, 22.06)),
  disk: new Box3(new Vector3(11.04, 1, -15.33), new Vector3(21.36, 2.9, -0.63)),
  psu: new Box3(new Vector3(11.85, 1, 6.65), new Vector3(20.36, 16, 22.4)),
  cooler: new Box3(new Vector3(-15.51, 2.08, 4.95), new Vector3(-6.41, 7.9, 13.03))
}

const radius = (c: (typeof inside)[number]): number => (c.pose.connector ? PLUGS[c.pose.connector].cable.r : 0.1)
const legs = (path: ReadonlyArray<Vector3>): Array<[Vector3, Vector3]> => path.slice(1).map((b, i) => [path[i] as Vector3, b])

/** The shortest distance between two segments, by sampling one finely against the other: legs are straight and short. */
const segmentDistance = (a: Vector3, b: Vector3, p: Vector3, q: Vector3): number => {
  const line = new Line3(p, q)
  const at = new Vector3()
  let best = Infinity
  const n = Math.max(2, Math.ceil(a.distanceTo(b) / 0.02))
  for (let k = 0; k <= n; k++) {
    const x = a.clone().lerp(b, k / n)
    line.closestPointToPoint(x, true, at)
    best = Math.min(best, x.distanceTo(at))
  }
  return best
}

const segmentToBox = (a: Vector3, b: Vector3, box: Box3): number => {
  let best = Infinity
  const n = Math.max(2, Math.ceil(a.distanceTo(b) / 0.02))
  for (let k = 0; k <= n; k++) best = Math.min(best, box.distanceToPoint(a.clone().lerp(b, k / n)))
  return best
}
