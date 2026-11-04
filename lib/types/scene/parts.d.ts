import { type Group } from "three";
import type { PartKind } from "../core/parts.ts";
/** The 3D model of a part. `placed` is the look once installed (thermal paste: the syringe becomes a blob). */
export declare const buildPart: (kind: PartKind, placed: boolean) => Group;
