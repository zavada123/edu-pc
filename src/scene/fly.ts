import type { Vec3 } from "./layout.ts"

/** Where the camera stands and the point it looks at. */
export interface CameraPose {
  readonly camera: Vec3
  readonly target: Vec3
}

/** How far the point the camera looks at may go: over the desk, from its top up to `top`, and how close the camera may come. */
export interface FlyLimits {
  readonly halfWidth: number
  readonly halfDepth: number
  readonly top: number
  readonly minDistance: number
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))
const length = (v: Vec3): number => Math.hypot(v[0], v[1], v[2])

/**
 * One step of W A S D flight. W and S fly along the way the camera looks, tilt included: looking down at the desk,
 * W dives towards it. A and D slide sideways, level. The camera and the point it looks at fly together; when that
 * point would leave the desk or sink into it, it stays at the edge and the camera alone comes closer,
 * but never nearer than `minDistance`.
 */
export const flyStep = (pose: CameraPose, ahead: number, aside: number, distance: number, limits: FlyLimits): CameraPose => {
  const { camera, target } = pose
  const look: Vec3 = [target[0] - camera[0], target[1] - camera[1], target[2] - camera[2]]
  const lookLength = length(look)
  const level = Math.hypot(look[0], look[2])
  if (lookLength === 0 || (ahead === 0 && aside === 0)) return pose
  const forward: Vec3 = [look[0] / lookLength, look[1] / lookLength, look[2] / lookLength]
  // right of the way the camera faces, kept level so A and D never climb or dive
  const right: Vec3 = level === 0 ? [1, 0, 0] : [-look[2] / level, 0, look[0] / level]
  const dir: Vec3 = [forward[0] * ahead + right[0] * aside, forward[1] * ahead, forward[2] * ahead + right[2] * aside]
  const dirLength = length(dir)
  if (dirLength === 0) return pose
  const scale = distance / dirLength
  const step: Vec3 = [dir[0] * scale, dir[1] * scale, dir[2] * scale]
  const nextCamera: Vec3 = [camera[0] + step[0], camera[1] + step[1], camera[2] + step[2]]
  const nextTarget: Vec3 = [
    clamp(target[0] + step[0], -limits.halfWidth, limits.halfWidth),
    clamp(target[1] + step[1], 0, limits.top),
    clamp(target[2] + step[2], -limits.halfDepth, limits.halfDepth),
  ]
  const gap = length([nextCamera[0] - nextTarget[0], nextCamera[1] - nextTarget[1], nextCamera[2] - nextTarget[2]])
  // too close to what it looks at: the camera stays where it was
  if (gap < limits.minDistance && gap < lookLength) return pose
  return { camera: nextCamera, target: nextTarget }
}
