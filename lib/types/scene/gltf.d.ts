import { Group } from "three";
import type { PartKind } from "../core/parts.ts";
/**
 * How the parts look. `simple`: every part is the model built in code, with fewer pixels, for old
 * computers. `normal`: realistic models of real parts, small enough for phones. `high`: the same
 * models with more detail and sharper textures (the `hd/` folder), for good computers.
 */
export type ModelQuality = "simple" | "normal" | "high";
export declare const MODEL_QUALITIES: ReadonlyArray<ModelQuality>;
/**
 * Realistic models of real parts (GLB files, see `models/CREDITS.md`). Every file is prepared
 * beforehand: in centimetres, turned the way the code-built model of the same part is, so a slot pose
 * places either of them the same way. The board and the case keep their own origin (see `PLACED_BY_FILE`);
 * every other model is moved onto the footprint of its code-built model.
 */
export declare const MODEL_FILES: Readonly<Partial<Record<PartKind, string>>>;
/** Models whose file is already in scene coordinates: the board's origin is our board's, the case's the code-built case's. */
export declare const PLACED_BY_FILE: ReadonlySet<PartKind>;
/**
 * Loads the realistic models of these kinds from `baseUrl` (the folder with the GLB files) in this
 * quality, and makes them the ones the scene uses. `simple` loads nothing: every part is built in code.
 * A model that fails to load is left out: its part keeps the model built in code.
 */
export declare const preloadModels: (baseUrl: string, kinds: Iterable<PartKind>, quality?: ModelQuality) => Promise<void>;
/** A copy of the loaded realistic model of this kind, or null when there is none. */
export declare const realModel: (kind: PartKind) => Group | null;
/** The realistic model of this kind is loaded and in use. */
export declare const hasRealModel: (kind: PartKind) => boolean;
