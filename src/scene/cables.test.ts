import { Vector3 } from "three"
import { describe, expect, test } from "vitest"
import { laneBetween, roundCorners } from "./models.ts"

describe("laneBetween", () => {
  test("runs level at the height of the higher end, along one axis and then the other", () => {
    const lane = laneBetween(new Vector3(0, 2, 0), new Vector3(10, 5, 4), new Vector3(1, 0, 0))
    expect(lane.map((p) => p.y)).toEqual([5, 5, 5])
    expect(lane[1]?.toArray()).toEqual([10, 5, 0])
  })

  test("does not turn back the way the cable came out of the plug", () => {
    const lane = laneBetween(new Vector3(0, 2, 0), new Vector3(-10, 2, 4), new Vector3(1, 0, 0))
    expect(lane[1]?.toArray()).toEqual([0, 2, 4])
  })
})

describe("roundCorners", () => {
  test("keeps the ends, cuts each corner back on both sides and rounds it", () => {
    const pts = roundCorners([new Vector3(0, 0, 0), new Vector3(10, 0, 0), new Vector3(10, 0, 10)], 1)
    expect(pts[0]?.toArray()).toEqual([0, 0, 0])
    expect(pts[1]?.toArray()).toEqual([9, 0, 0])
    expect(pts[pts.length - 2]?.toArray()).toEqual([10, 0, 1])
    expect(pts[pts.length - 1]?.toArray()).toEqual([10, 0, 10])
    // the bend in between stays inside the corner it cuts
    for (const p of pts.slice(2, -2)) {
      expect(p.x).toBeGreaterThan(9)
      expect(p.z).toBeLessThan(1)
    }
  })

  test("drops the middle points of a straight run", () => {
    const pts = roundCorners([new Vector3(0, 0, 0), new Vector3(5, 0, 0), new Vector3(10, 0, 0)], 1)
    expect(pts.map((p) => p.toArray())).toEqual([
      [0, 0, 0],
      [10, 0, 0]
    ])
  })

  test("never cuts more than half of a short leg", () => {
    const pts = roundCorners([new Vector3(0, 0, 0), new Vector3(1, 0, 0), new Vector3(1, 0, 10)], 2)
    expect(pts[1]?.x).toBeCloseTo(0.5)
  })
})
