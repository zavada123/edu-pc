import { describe, expect, test } from "vitest"
import { type Bounds, FRONT_VIEW, focusPoint, focusStops } from "./focus.ts"
import { scenarios } from "../scenarios/index.ts"
import { grade3DeskLayout, grade8CaseLayout, grade8DeskLayout, grade8LabLayout, layouts, standing, type Vec3 } from "./layout.ts"

const inside = (bounds: Bounds | undefined, p: Vec3): boolean =>
  bounds !== undefined && [0, 1, 2].every((k) => (bounds[0][k] ?? 0) <= (p[k] ?? 0) && (p[k] ?? 0) <= (bounds[1][k] ?? 0))

describe("focusPoint", () => {
  test("keeps the whole board and the parts round it in the picture when there is nothing to place", () => {
    const [at, , view, bounds] = focusPoint(grade8DeskLayout, [], undefined)
    expect(Math.hypot(at[0], at[2])).toBeLessThan(10)
    expect(view).toEqual(FRONT_VIEW)
    for (const l of grade8DeskLayout.loose ?? []) expect(inside(bounds, l.at), l.part).toBe(true)
  })

  test("looks at the bench alone when nothing stands round it", () => {
    const bare = { ...grade8DeskLayout, loose: [] }
    expect(focusPoint(bare, [], undefined)).toEqual([[0, 0, 0], bare.overview, FRONT_VIEW])
  })

  test("keeps every box and basket of the grade 3–4 desk in the picture", () => {
    const [, , , bounds] = focusPoint(grade3DeskLayout, [], undefined)
    for (const b of grade3DeskLayout.boxes ?? []) expect(inside(bounds, b.at), b.part).toBe(true)
    for (const c of grade3DeskLayout.crates ?? []) expect(inside(bounds, c.at)).toBe(true)
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

  test("keeps the case and the parts in front of it in the picture", () => {
    const [, , , bounds] = focusPoint(grade8CaseLayout, [], undefined)
    for (const l of grade8CaseLayout.loose ?? []) expect(inside(bounds, l.at), l.part).toBe(true)
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

describe("the grade 3–4 desk", () => {
  // what stands on the desk, as footprints: x from, x to, z from, z to
  const boxes = (grade3DeskLayout.boxes ?? []).map((b) => [b.at[0] - 9, b.at[0] + 9, b.at[2] - 7.5, b.at[2] + 7.5] as const)
  const crates = (grade3DeskLayout.crates ?? []).map((c) => [c.at[0] - 20, c.at[0] + 20, c.at[2] - 13, c.at[2] + 13] as const)
  const apart = (a: readonly number[], b: readonly number[]) =>
    (a[1] ?? 0) <= (b[0] ?? 0) || (b[1] ?? 0) <= (a[0] ?? 0) || (a[3] ?? 0) <= (b[2] ?? 0) || (b[3] ?? 0) <= (a[2] ?? 0)

  test("nothing on it overlaps anything else", () => {
    const all = [...boxes, ...crates]
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(apart(all[i] ?? [], all[j] ?? []), `${i} ${j}`).toBe(true)
  })

  test("everything stands on the desk", () => {
    const [w, d] = grade3DeskLayout.desk ?? [0, 0]
    for (const f of [...boxes, ...crates]) {
      expect(f[0]).toBeGreaterThanOrEqual(-w / 2)
      expect(f[1]).toBeLessThanOrEqual(w / 2)
      expect(f[2]).toBeGreaterThanOrEqual(-d / 2)
      expect(f[3]).toBeLessThanOrEqual(d / 2)
    }
  })
})
