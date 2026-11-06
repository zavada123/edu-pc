import type { Vec3 } from "./layout.ts";
/** Where the camera stands and the point it looks at. */
export interface CameraPose {
    readonly camera: Vec3;
    readonly target: Vec3;
}
/** How far the point the camera looks at may go: over the desk, from its top up to `top`, and how close the camera may come. */
export interface FlyLimits {
    readonly halfWidth: number;
    readonly halfDepth: number;
    readonly top: number;
    readonly minDistance: number;
}
/**
 * One step of W A S D flight. W and S fly along the way the camera looks, tilt included: looking down at the desk,
 * W dives towards it. A and D slide sideways, level. The camera and the point it looks at fly together; when that
 * point would leave the desk or sink into it, it stays at the edge and the camera alone comes closer,
 * but never nearer than `minDistance`.
 */
export declare const flyStep: (pose: CameraPose, ahead: number, aside: number, distance: number, limits: FlyLimits) => CameraPose;
