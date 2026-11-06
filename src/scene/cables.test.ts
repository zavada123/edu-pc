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
  test("keeps the ends and cuts each corner back on both sides", () => {
    const pts = roundCorners([new Vector3(0, 0, 0), new Vector3(10, 0, 0), new Vector3(10, 0, 10)], 1)
    expect(pts.map((p) => p.toArray())).toEqual([
      [0, 0, 0],
      [9, 0, 0],
      [10, 0, 1],
      [10, 0, 10]
    ])
  })

  test("never cuts more than half of a short leg", () => {
    const pts = roundCorners([new Vector3(0, 0, 0), new Vector3(1, 0, 0), new Vector3(1, 0, 10)], 2)
    expect(pts[1]?.x).toBeCloseTo(0.5)
  })
})
