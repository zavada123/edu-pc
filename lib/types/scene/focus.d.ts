import type { SceneLayout, Vec3 } from "./layout.ts";
/** Where the camera looks from, as a direction from the target, when a slot does not say. */
export declare const FRONT_VIEW: Vec3;
/** A camera aim: the point to look at, how far from it, and from which direction. */
export type Aim = readonly [Vec3, number, Vec3];
/**
 * Where the camera should look for the current step, and from how far: the free target slots
 * (far enough to see all of them), the lever or a button, or the whole bench.
 */
export declare const focusPoint: (layout: SceneLayout, slots: ReadonlyArray<string>, control: string | undefined, 
/** Buttons a student may press by mistake on this step: keep them in view too, so the choice is a real one. */
also?: ReadonlyArray<string>) => Aim;
/** Looks at every marker of a data path at once: from the USB port at the back to the monitor in front. */
export declare const focusStops: (layout: SceneLayout, ids: ReadonlyArray<string>) => Aim;
