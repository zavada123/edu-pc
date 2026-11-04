import type { SceneLayout, Vec3 } from "./layout.ts"

const BENCH_CENTRE: Vec3 = [0, 0, 0]

/** Where the camera looks from, as a direction from the target, when a slot does not say. */
export const FRONT_VIEW: Vec3 = [0, 0.78, 0.62]

/** A camera aim: the point to look at, how far from it, and from which direction. */
export type Aim = readonly [Vec3, number, Vec3]

/**
 * Where the camera should look for the current step, and from how far: the free target slots
 * (far enough to see all of them), the lever or a button, or the whole bench.
 */
export const focusPoint = (layout: SceneLayout, slots: ReadonlyArray<string>, control: string | undefined): Aim => {
  if (control && layout.lever?.control === control) return [layout.lever.pivot, 20, FRONT_VIEW]
  const button = control ? layout.buttons?.find((b) => b.control === control) : undefined
  if (button) return [button.at, 30, [button.normal[0], button.normal[1] + 0.75, button.normal[2] + 0.35]]
  const poses = slots.map((s) => layout.slots[s]).filter((p) => p !== undefined)
  if (poses.length === 0) return [BENCH_CENTRE, layout.overview ?? 40, FRONT_VIEW]
  const xs = poses.flatMap((p) => [p.at[0] - p.area[0] / 2, p.at[0] + p.area[0] / 2])
  const zs = poses.flatMap((p) => [p.at[2] - p.area[2] / 2, p.at[2] + p.area[2] / 2])
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs))
  const centre: Vec3 = [(Math.max(...xs) + Math.min(...xs)) / 2, poses[0]?.at[1] ?? 0, (Math.max(...zs) + Math.min(...zs)) / 2]
  return [centre, Math.min(Math.max(45, layout.overview ?? 0), Math.max(20, 14 + span * 1.8)), poses[0]?.view ?? FRONT_VIEW]
}
