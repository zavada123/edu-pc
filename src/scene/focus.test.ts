import { describe, expect, test } from "vitest"
import { focusPoint } from "./focus.ts"
import { grade8DeskLayout } from "./layout.ts"

describe("focusPoint", () => {
  test("looks at the whole board when there is nothing to place", () => {
    expect(focusPoint(grade8DeskLayout, [], undefined)).toEqual([[0, 0, 0], 40])
  })

  test("looks at the lever on a lever step", () => {
    const [at, distance] = focusPoint(grade8DeskLayout, [], "socketLever")
    expect(at).toEqual(grade8DeskLayout.lever?.pivot)
    expect(distance).toBe(20)
  })

  test("stands back far enough to see two RAM slots end to end", () => {
    const [at, distance] = focusPoint(grade8DeskLayout, ["dimmA2", "dimmB2"], undefined)
    expect(at[0]).toBeCloseTo((6.1 + 7.9) / 2)
    expect(at[2]).toBeCloseTo(-3.5)
    expect(distance).toBeGreaterThan(30)
  })

  test("comes close for one small header", () => {
    expect(focusPoint(grade8DeskLayout, ["cpuFan"], undefined)[1]).toBe(20)
  })
})
