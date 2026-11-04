import { Group, InstancedMesh, type Material, Mesh, MeshStandardMaterial, type Object3D, type Texture } from "three";
/**
 * Building blocks for the procedural models: materials and shapes placed by their bottom,
 * the way parts sit on a board. Every model in the scene is made from these.
 */
export declare const mat: (color: string, opts?: {
    metal?: number;
    rough?: number;
    map?: Texture;
}) => MeshStandardMaterial;
export declare const M: {
    blackPlastic: MeshStandardMaterial;
    satinBlack: MeshStandardMaterial;
    whitePlastic: MeshStandardMaterial;
    socket: MeshStandardMaterial;
    aluminium: MeshStandardMaterial;
    brushed: MeshStandardMaterial;
    darkMetal: MeshStandardMaterial;
    gunmetal: MeshStandardMaterial;
    copper: MeshStandardMaterial;
    gold: MeshStandardMaterial;
    greenPcb: MeshStandardMaterial;
    blackPcb: MeshStandardMaterial;
    chip: MeshStandardMaterial;
    smdDark: MeshStandardMaterial;
    smdTan: MeshStandardMaterial;
    paste: MeshStandardMaterial;
    rubber: MeshStandardMaterial;
    capTop: MeshStandardMaterial;
    accent: MeshStandardMaterial;
    blueUsb: MeshStandardMaterial;
    red: MeshStandardMaterial;
    yellow: MeshStandardMaterial;
};
export type Size = readonly [number, number, number];
/** A box with its bottom at `y`. Pass six materials for different faces: +x, -x, +y, -y, +z, -z. */
export declare const box: (size: Size, material: Material | Material[], x?: number, y?: number, z?: number) => Mesh;
/** A box with rounded edges, for lids, housings and anything a hand would touch. */
export declare const rounded: (size: Size, radius: number, material: Material | Material[], x?: number, y?: number, z?: number) => Mesh;
export declare const cylinder: (r: number, h: number, material: Material, x?: number, y?: number, z?: number, segments?: number) => Mesh;
export declare const group: (...children: Object3D[]) => Group;
/**
 * Many copies of one small box in one draw call: SMD parts, pins, fins.
 * `at` holds bottom-centre positions; `size` may differ per copy via `scale`.
 */
export declare const boxes: (size: Size, material: Material, at: ReadonlyArray<readonly [number, number, number]>, scale?: (i: number) => Size) => InstancedMesh;
/** A tiny repeatable random generator, so a model looks the same on every load. */
export declare const seeded: (seed: number) => (() => number);
/** Every mesh in the group casts and receives shadows. */
export declare const shadowed: <T extends Object3D>(obj: T) => T;
/**
 * Joins the meshes of a model that never moves into one mesh per material, so the board
 * draws in a few dozen calls instead of hundreds. Meshes with several materials, instanced
 * meshes and anything that moves (a fan rotor, marked `spin`) or is changed later (marked `keep`) stay as they are.
 */
export declare const mergeStatic: (root: Group) => Group;
/**
 * The spinning part of a fan: curved blades round a hub, turning around its own y axis.
 * Marked `spin`, so the scene turns it once the computer is on.
 */
export declare const fanRotor: (radius: number, count: number, blade: Material, hub: Material, y?: number) => Group;
