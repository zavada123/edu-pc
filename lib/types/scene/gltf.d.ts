import { Group } from "three";
import type { PartKind } from "../core/parts.ts";
/**
 * Realistic models of real parts (GLB files, see `models/CREDITS.md`). Every file is prepared
 * beforehand: in centimetres, its origin at the bottom centre, turned the way the code-built model of
 * the same part is, so a slot pose places either of them the same way.
 */
export declare const MODEL_FILES: Readonly<Partial<Record<PartKind, string>>>;
/**
 * Loads the realistic models of these kinds from `baseUrl` (a folder with the GLB files). A model that
 * fails to load is left out: its part keeps the model built in code.
 */
export declare const preloadModels: (baseUrl: string, kinds: Iterable<PartKind>) => Promise<void>;
/** A copy of the loaded realistic model of this kind, or null when there is none. */
export declare const realModel: (kind: PartKind) => Group | null;
