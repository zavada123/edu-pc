import type { SceneLayout, Vec3 } from "./layout.ts"

const BENCH_CENTRE: Vec3 = [0, 0, 0]

/** Where the camera looks from, as a direction from the target, when a slot does not say. */
export const FRONT_VIEW: Vec3 = [0, 0.78, 0.62]

/** A box in bench coordinates: its lowest and highest corner. */
export type Bounds = readonly [Vec3, Vec3]

/**
 * A camera aim: the point to look at, how far from it at least, from which direction, and what must fit
 * in the picture. The scene stands back far enough for the whole box, whatever the shape of the screen.
 */
export type Aim = readonly [Vec3, number, Vec3, Bounds?]

/** The box round points, each grown by its own half size. */
const boundsOf = (items: ReadonlyArray<{ at: Vec3; half: Vec3 }>): Bounds => {
  const lo = (k: 0 | 1 | 2) => Math.min(...items.map((i) => i.at[k] - i.half[k]))
  const hi = (k: 0 | 1 | 2) => Math.max(...items.map((i) => i.at[k] + i.half[k]))
  return [
    [lo(0), lo(1), lo(2)],
    [hi(0), hi(1), hi(2)]
  ]
}
const centreOf = (b: Bounds): Vec3 => [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2, (b[0][2] + b[1][2]) / 2]

/**
 * Where the camera should look for the current step, and from how far: the free target slots
 * (far enough to see all of them), the lever or a button, or the whole bench.
 */
export const focusPoint = (
  layout: SceneLayout,
  slots: ReadonlyArray<string>,
  control: string | undefined,
  /** Buttons a student may press by mistake on this step: keep them in view too, so the choice is a real one. */
  also: ReadonlyArray<string> = []
): Aim => {
  if (control && layout.lever?.control === control) return [layout.lever.pivot, 20, FRONT_VIEW]
  const button = control ? layout.buttons?.find((b) => b.control === control) : undefined
  const others = (layout.buttons ?? []).filter((b) => also.includes(b.control))
  if (button && others.length > 0) {
    const all = [button, ...others]
    const xs = all.map((b) => b.at[0])
    const ys = all.map((b) => b.at[1])
    const zs = all.map((b) => b.at[2])
    const mid = (v: number[]): number => (Math.max(...v) + Math.min(...v)) / 2
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), Math.max(...zs) - Math.min(...zs))
    return [[mid(xs), mid(ys), mid(zs)], 30 + span * 1.4, FRONT_VIEW]
  }
  if (button) return [button.at, 30, [button.normal[0], button.normal[1] + 0.75, button.normal[2] + 0.35]]
  const poses = slots.map((s) => layout.slots[s]).filter((p) => p !== undefined)
  if (poses.length === 0) return wholeDesk(layout)
  const xs = poses.flatMap((p) => [p.at[0] - p.area[0] / 2, p.at[0] + p.area[0] / 2])
  const zs = poses.flatMap((p) => [p.at[2] - p.area[2] / 2, p.at[2] + p.area[2] / 2])
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs))
  const centre: Vec3 = [(Math.max(...xs) + Math.min(...xs)) / 2, poses[0]?.at[1] ?? 0, (Math.max(...zs) + Math.min(...zs)) / 2]
  const bounds = boundsOf(poses.map((p) => ({ at: p.at, half: [p.area[0] / 2, p.area[1] / 2, p.area[2] / 2] })))
  return [centre, Math.min(Math.max(45, layout.overview ?? 0), Math.max(20, 14 + span * 1.8)), poses[0]?.view ?? FRONT_VIEW, bounds]
}

/** A look at the whole bench and at everything standing round it: parts, boxes, baskets, the monitor. */
const wholeDesk = (layout: SceneLayout): Aim => {
  const overview = layout.overview ?? 40
  // each of them stands on the desk: its middle is half its height above where it stands
  const standing = (at: Vec3, half: Vec3) => ({ at: [at[0], at[1] + half[1], at[2]] as Vec3, half })
  const around = [
    ...(layout.loose ?? []).map((l) => standing(l.at, LOOSE_HALF)),
    ...(layout.boxes ?? []).map((b) => standing(b.at, BOX_HALF)),
    ...(layout.crates ?? []).map((c) => standing(c.at, CRATE_HALF)),
    ...(layout.props ?? []).map((p) => standing(p.at, PROP_HALF))
  ]
  if (around.length === 0) return [BENCH_CENTRE, overview, FRONT_VIEW]
  // the bench itself reaches about a quarter of the overview distance round its centre
  const reach = overview * BENCH_REACH
  const bounds = boundsOf([{ at: BENCH_CENTRE, half: [reach, reach / 2, reach] }, ...around])
  const centre = centreOf(bounds)
  return [[centre[0], 0, centre[2]], WHOLE_DESK_MIN, FRONT_VIEW, bounds]
}
const BENCH_REACH = 0.25
/** Rough half sizes of what stands on the desk, enough to keep each in the picture. */
const LOOSE_HALF: Vec3 = [12, 4, 12]
const BOX_HALF: Vec3 = [9, 7, 8]
const CRATE_HALF: Vec3 = [20, 6, 13]
const PROP_HALF: Vec3 = [8, 6, 8]
const WHOLE_DESK_MIN = 40

/** Looks at every marker of a data path at once: from the USB port at the back to the monitor in front. */
export const focusStops = (layout: SceneLayout, ids: ReadonlyArray<string>): Aim => {
  const points = ids.flatMap((id) => {
    const at = layout.stops?.[id]
    return at ? [at] : []
  })
  if (points.length === 0) return [BENCH_CENTRE, layout.overview ?? 40, FRONT_VIEW]
  const range = (k: 0 | 1 | 2) => {
    const v = points.map((p) => p[k])
    return [Math.min(...v), Math.max(...v)] as const
  }
  const [x, y, z] = [range(0), range(1), range(2)]
  const span = Math.max(x[1] - x[0], z[1] - z[0], y[1] - y[0])
  const bounds = boundsOf(points.map((at) => ({ at, half: [3, 3, 3] })))
  return [[(x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2], Math.max(45, 20 + span * 1.5), FRONT_VIEW, bounds]
}
