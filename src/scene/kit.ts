import {
  type BufferGeometry,
  BoxGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  type Material,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  type Texture
} from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

/**
 * Building blocks for the procedural models: materials and shapes placed by their bottom,
 * the way parts sit on a board. Every model in the scene is made from these.
 */

export const mat = (color: string, opts: { metal?: number; rough?: number; map?: Texture } = {}): MeshStandardMaterial =>
  new MeshStandardMaterial({
    color,
    metalness: opts.metal ?? 0,
    roughness: opts.rough ?? 0.6,
    ...(opts.map ? { map: opts.map } : {})
  })

export const M = {
  blackPlastic: mat("#18191c", { rough: 0.5 }),
  satinBlack: mat("#24262a", { rough: 0.35, metal: 0.3 }),
  whitePlastic: mat("#ece8de", { rough: 0.5 }),
  socket: mat("#efe9da", { rough: 0.5 }),
  aluminium: mat("#c9ced3", { metal: 0.9, rough: 0.32 }),
  brushed: mat("#9aa1a8", { metal: 0.85, rough: 0.42 }),
  darkMetal: mat("#3e434a", { metal: 0.8, rough: 0.38 }),
  gunmetal: mat("#5b6169", { metal: 0.85, rough: 0.35 }),
  copper: mat("#c07a3c", { metal: 0.95, rough: 0.28 }),
  gold: mat("#d9b54a", { metal: 1, rough: 0.28 }),
  greenPcb: mat("#1d6b3f", { rough: 0.55 }),
  blackPcb: mat("#16191d", { rough: 0.55 }),
  chip: mat("#141518", { rough: 0.4, metal: 0.1 }),
  smdDark: mat("#2b2d31", { rough: 0.5 }),
  smdTan: mat("#a8895a", { rough: 0.6 }),
  paste: mat("#a3a9af", { rough: 0.22, metal: 0.25 }),
  rubber: mat("#2a2d33", { rough: 0.9 }),
  capTop: mat("#b9bfc5", { metal: 0.9, rough: 0.3 }),
  accent: mat("#1fa7a0", { rough: 0.35, metal: 0.4 }),
  blueUsb: mat("#2563eb", { rough: 0.45 }),
  red: mat("#c0392b", { rough: 0.5 }),
  yellow: mat("#d4a017", { rough: 0.5 })
}

export type Size = readonly [number, number, number]

/** A box with its bottom at `y`. Pass six materials for different faces: +x, -x, +y, -y, +z, -z. */
export const box = (size: Size, material: Material | Material[], x = 0, y = 0, z = 0): Mesh => {
  const mesh = new Mesh(new BoxGeometry(size[0], size[1], size[2]), material)
  mesh.position.set(x, y + size[1] / 2, z)
  return mesh
}

/** A box with rounded edges, for lids, housings and anything a hand would touch. */
export const rounded = (size: Size, radius: number, material: Material | Material[], x = 0, y = 0, z = 0): Mesh => {
  const r = Math.min(radius, size[0] / 2, size[1] / 2, size[2] / 2)
  const mesh = new Mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 2, r), material)
  mesh.position.set(x, y + size[1] / 2, z)
  return mesh
}

export const cylinder = (r: number, h: number, material: Material, x = 0, y = 0, z = 0, segments = 24): Mesh => {
  const mesh = new Mesh(new CylinderGeometry(r, r, h, segments), material)
  mesh.position.set(x, y + h / 2, z)
  return mesh
}

export const group = (...children: Object3D[]): Group => {
  const g = new Group()
  for (const c of children) g.add(c)
  return g
}

/**
 * Many copies of one small box in one draw call: SMD parts, pins, fins.
 * `at` holds bottom-centre positions; `size` may differ per copy via `scale`.
 */
export const boxes = (
  size: Size,
  material: Material,
  at: ReadonlyArray<readonly [number, number, number]>,
  scale?: (i: number) => Size
): InstancedMesh => {
  const mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), material, Math.max(1, at.length))
  const m = new Matrix4()
  at.forEach(([x, y, z], i) => {
    const s = scale?.(i) ?? size
    m.makeScale(s[0], s[1], s[2]).setPosition(x, y + s[1] / 2, z)
    mesh.setMatrixAt(i, m)
  })
  mesh.count = at.length
  return mesh
}

/** A tiny repeatable random generator, so a model looks the same on every load. */
export const seeded = (seed: number): (() => number) => {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

/** Every mesh in the group casts and receives shadows. */
export const shadowed = <T extends Object3D>(obj: T): T => {
  obj.traverse((o) => {
    o.castShadow = true
    o.receiveShadow = true
  })
  return obj
}

/**
 * Joins the meshes of a model that never moves into one mesh per material, so the board
 * draws in a few dozen calls instead of hundreds. Meshes with several materials, instanced
 * meshes and anything that moves (a fan rotor, marked `spin`) or is changed later (marked `keep`) stay as they are.
 */
export const mergeStatic = (root: Group): Group => {
  root.updateMatrixWorld(true)
  const inverse = new Matrix4().copy(root.matrixWorld).invert()
  const byMaterial = new Map<Material, BufferGeometry[]>()
  const merged: Mesh[] = []
  const moves = (o: Object3D): boolean => {
    for (let p: Object3D | null = o; p && p !== root; p = p.parent) if (p.userData.spin || p.userData.keep) return true
    return false
  }
  root.traverse((o) => {
    if (!(o instanceof Mesh) || o instanceof InstancedMesh || Array.isArray(o.material) || moves(o)) return
    const geometry = (o.geometry as BufferGeometry).index ? (o.geometry as BufferGeometry).toNonIndexed() : (o.geometry as BufferGeometry).clone()
    geometry.applyMatrix4(new Matrix4().multiplyMatrices(inverse, o.matrixWorld))
    for (const name of Object.keys(geometry.attributes)) if (!["position", "normal", "uv"].includes(name)) geometry.deleteAttribute(name)
    geometry.clearGroups()
    const list = byMaterial.get(o.material) ?? []
    list.push(geometry)
    byMaterial.set(o.material, list)
    merged.push(o)
  })
  for (const mesh of merged) {
    mesh.removeFromParent()
    mesh.geometry.dispose()
  }
  for (const [material, geometries] of byMaterial) {
    const geometry = mergeGeometries(geometries, false)
    for (const g of geometries) g.dispose()
    if (geometry) root.add(new Mesh(geometry, material))
  }
  return root
}

/**
 * The spinning part of a fan: curved blades round a hub, turning around its own y axis.
 * Marked `spin`, so the scene turns it once the computer is on.
 */
export const fanRotor = (radius: number, count: number, blade: Material, hub: Material, y = 0): Group => {
  const rotor = group()
  const length = radius * 0.66
  for (let i = 0; i < count; i++) {
    const b = rounded([length, 0.06, radius * 0.36], 0.03, blade, radius * 0.3 + length / 2, 0, 0)
    b.rotation.x = 0.5
    const holder = group(b)
    holder.rotation.y = (i / count) * Math.PI * 2
    rotor.add(holder)
  }
  rotor.add(cylinder(radius * 0.3, 0.6, hub, 0, -0.3))
  rotor.position.y = y
  rotor.userData.spin = true
  return rotor
}
