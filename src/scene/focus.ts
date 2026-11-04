import type { SceneLayout, Vec3 } from "./layout.ts"

const BOARD_CENTRE: Vec3 = [0, 0, 0]

/**
 * Where the camera should look for the current step, and from how far: the free target slots
 * (far enough to see all of them), the lever, or the whole board.
 */
export const focusPoint = (layout: SceneLayout, slots: ReadonlyArray<string>, control: string | undefined): [Vec3, number] => {
  if (control && layout.lever?.control === control) return [layout.lever.pivot, 20]
  const poses = slots.map((s) => layout.slots[s]).filter((p) => p !== undefined)
  if (poses.length === 0) return [BOARD_CENTRE, 40]
  const xs = poses.flatMap((p) => [p.at[0] - p.area[0] / 2, p.at[0] + p.area[0] / 2])
  const zs = poses.flatMap((p) => [p.at[2] - p.area[2] / 2, p.at[2] + p.area[2] / 2])
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs))
  const centre: Vec3 = [(Math.max(...xs) + Math.min(...xs)) / 2, poses[0]?.at[1] ?? 0, (Math.max(...zs) + Math.min(...zs)) / 2]
  return [centre, Math.min(45, Math.max(20, 14 + span * 1.5))]
}
