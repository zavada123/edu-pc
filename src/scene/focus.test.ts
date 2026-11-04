import { describe, expect, test } from "vitest"
import { FRONT_VIEW, focusPoint } from "./focus.ts"
import { grade8CaseLayout, grade8DeskLayout } from "./layout.ts"

describe("focusPoint", () => {
  test("looks at the whole board when there is nothing to place", () => {
    expect(focusPoint(grade8DeskLayout, [], undefined)).toEqual([[0, 0, 0], 40, FRONT_VIEW])
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

  test("looks at the ports on the back of the case from behind", () => {
    const [, , view] = focusPoint(grade8CaseLayout, ["usb1", "usb2"], undefined)
    expect(view[2]).toBeGreaterThan(view[1])
  })

  test("looks at the power button from the case's top side", () => {
    const [at, , view] = focusPoint(grade8CaseLayout, [], "power")
    expect(at).toEqual(grade8CaseLayout.buttons?.[0]?.at)
    expect(view[0]).toBeLessThan(0)
  })

  test("stands back for the whole case", () => {
    expect(focusPoint(grade8CaseLayout, [], undefined)[1]).toBe(grade8CaseLayout.overview)
  })
})
