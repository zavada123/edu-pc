import { type Texture, type WebGLRenderer } from "three";
import type { PartKind } from "../core/parts.ts";
import type { Group } from "three";
/**
 * Pictures of the parts for the tray, drawn from the same 3D models as the scene,
 * so a student recognises on the bench what they picked in the tray.
 * Uses the scene's own renderer (a second WebGL context slows weak computers down) but draws
 * off screen, so the visible canvas is never read back.
 * Returns a PNG data URL per kind that `model` gives a model for; other kinds are left out.
 */
export declare const renderIcons: (renderer: WebGLRenderer, environment: Texture | null, kinds: ReadonlyArray<PartKind>, model: (kind: PartKind) => Group | null) => Partial<Record<PartKind, string>>;
