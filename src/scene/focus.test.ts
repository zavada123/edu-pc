import { describe, expect, test } from "vitest"
import { FRONT_VIEW, focusPoint, focusStops } from "./focus.ts"
import { scenarios } from "../scenarios/index.ts"
import { grade3DeskLayout, grade8CaseLayout, grade8DeskLayout, grade8FaultLayout, grade8LabLayout, layouts, standing } from "./layout.ts"

describe("focusPoint", () => {
  test("looks at the whole board and the parts round it when there is nothing to place", () => {
    const [at, distance, view] = focusPoint(grade8DeskLayout, [], undefined)
    expect(Math.hypot(at[0], at[2])).toBeLessThan(5)
    expect(distance).toBe(grade8DeskLayout.overview)
    expect(view).toEqual(FRONT_VIEW)
  })

  test("looks at the bench alone when no parts lie round it", () => {
    expect(focusPoint(grade8FaultLayout, [], undefined)).toEqual([[0, 0, 0], grade8FaultLayout.overview, FRONT_VIEW])
  })

  test("looks at the lever on a lever step", () => {
    const [at, distance] = focusPoint(grade8DeskLayout, [], "socketLever")
    expect(at).toEqual(grade8DeskLayout.lever?.pivot)
    expect(distance).toBe(20)
  })

  test("stands back far enough to see two RAM slots end to end", () => {
    const [at, distance] = focusPoint(grade8DeskLayout, ["dimmA2", "dimmB2"], undefined)
    const a2 = grade8DeskLayout.slots.dimmA2?.at ?? [0, 0, 0]
    const b2 = grade8DeskLayout.slots.dimmB2?.at ?? [0, 0, 0]
    expect(at[0]).toBeCloseTo((a2[0] + b2[0]) / 2)
    expect(at[2]).toBeCloseTo(a2[2])
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

  test("stands back for the whole case and the parts in front of it", () => {
    const [at, distance] = focusPoint(grade8CaseLayout, [], undefined)
    expect(distance).toBeGreaterThan(grade8CaseLayout.overview ?? 0)
    // the parts lie in front of the case: the look moves towards them
    expect(at[2]).toBeGreaterThan(0)
  })

  test("keeps the monitor's button in view when it is the likely mistake on the power step", () => {
    const [at, distance] = focusPoint(grade3DeskLayout, [], "power", ["monitorPower"])
    const [tower, monitor] = grade3DeskLayout.buttons ?? []
    expect(at[0]).toBeCloseTo(((tower?.at[0] ?? 0) + (monitor?.at[0] ?? 0)) / 2)
    expect(distance).toBeGreaterThan(60)
  })

  test("stands the case up: its top goes up, its open side towards the desk, its back away from the student", () => {
    const [x, y] = standing([-21.5, 21, 0])
    const [x0, y0, z0] = standing([21.5, 0, 0])
    const [, , zBack] = standing([0, 0, 22.5])
    expect(y).toBeGreaterThan(y0)
    expect(x).toBeLessThan(x0)
    expect(y0).toBe(0)
    expect(zBack).toBeLessThan(z0)
  })

  test("goes round to the back of the system unit for the cables", () => {
    const [, , view] = focusPoint(grade3DeskLayout, ["hdmi", "usb1"], undefined)
    expect(view[2]).toBeLessThan(0)
  })

  test("stands back far enough for the data path from the USB port to the monitor", () => {
    const [at, distance] = focusStops(grade8LabLayout, ["usb", "monitor"])
    expect(at[2]).toBeLessThan(0)
    expect(distance).toBeGreaterThan(100)
  })
})

describe("parts lying on the desk", () => {
  test.each(Object.entries(layouts))("%s: each one is a part of the scenario that a step puts in place", (id, layout) => {
    const scenario = scenarios[id]
    const placedByStep = new Set(scenario?.steps.flatMap((s) => (s.kind === "place" ? Object.keys(s.targets) : [])))
    for (const pose of layout.loose ?? []) expect(placedByStep.has(pose.part), pose.part).toBe(true)
  })
})
