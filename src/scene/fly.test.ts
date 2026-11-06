import { describe, expect, test } from "vitest"
import { type FlyLimits, flyStep } from "./fly.ts"

const LIMITS: FlyLimits = { halfWidth: 50, halfDepth: 50, top: 40, minDistance: 10 }

describe("flyStep", () => {
  test("W flies along the way the camera looks, tilt included", () => {
    const pose = { camera: [0, 30, 30] as const, target: [0, 10, 10] as const }
    const next = flyStep(pose, 1, 0, 2, LIMITS)
    const moved = next.camera.map((v, k) => v - (pose.camera[k] ?? 0))
    expect(moved[0]).toBeCloseTo(0)
    expect(moved[1]).toBeCloseTo(-Math.SQRT2)
    expect(moved[2]).toBeCloseTo(-Math.SQRT2)
  })

  test("S flies back the way the camera looks", () => {
    const pose = { camera: [0, 30, 30] as const, target: [0, 10, 10] as const }
    const next = flyStep(pose, -1, 0, 2, LIMITS)
    expect(next.camera[1]).toBeCloseTo(30 + Math.SQRT2)
    expect(next.camera[2]).toBeCloseTo(30 + Math.SQRT2)
  })

  test("A and D slide sideways and keep the height", () => {
    const pose = { camera: [0, 30, 30] as const, target: [0, 10, 10] as const }
    const next = flyStep(pose, 0, 1, 2, LIMITS)
    expect(next.camera[0]).toBeCloseTo(2)
    expect(next.camera[1]).toBeCloseTo(30)
    expect(next.target[1]).toBeCloseTo(10)
  })

  test("diving at the desk keeps the aim on it and brings the camera closer", () => {
    const pose = { camera: [0, 30, 0.1] as const, target: [0, 0, 0] as const }
    const next = flyStep(pose, 1, 0, 5, LIMITS)
    expect(next.target[1]).toBe(0)
    expect(next.camera[1]).toBeCloseTo(25, 1)
  })

  test("stops short of the minimum distance", () => {
    const pose = { camera: [0, 10.5, 0.1] as const, target: [0, 0, 0] as const }
    expect(flyStep(pose, 1, 0, 2, LIMITS)).toBe(pose)
  })

  test("keeps the aim over the desk", () => {
    const pose = { camera: [0, 20, 60] as const, target: [0, 0, 49] as const }
    const next = flyStep(pose, -1, 0, 10, LIMITS)
    expect(next.target[2]).toBe(50)
  })
})
