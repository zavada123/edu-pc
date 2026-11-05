import { Group, Mesh, type Object3D } from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js"
import type { PartKind } from "../core/parts.ts"

/**
 * Realistic models of real parts (GLB files, see `models/CREDITS.md`). Every file is prepared
 * beforehand: in centimetres, its origin at the bottom centre, turned the way the code-built model of
 * the same part is, so a slot pose places either of them the same way.
 */
export const MODEL_FILES: Readonly<Partial<Record<PartKind, string>>> = {
  motherboard: "motherboard.glb",
  cpu: "cpu.glb",
  ram: "ram.glb",
  m2ssd: "m2ssd.glb",
  cooler: "cooler.glb",
  gpu: "gpu.glb",
  psu: "psu.glb",
  hdd: "hdd.glb"
}

const cache = new Map<PartKind, Object3D>()

/**
 * Loads the realistic models of these kinds from `baseUrl` (a folder with the GLB files). A model that
 * fails to load is left out: its part keeps the model built in code.
 */
export const preloadModels = async (baseUrl: string, kinds: Iterable<PartKind>): Promise<void> => {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
  const wanted = [...new Set(kinds)].filter((k) => MODEL_FILES[k] && !cache.has(k))
  await Promise.all(
    wanted.map(async (kind) => {
      try {
        const gltf = await loader.loadAsync(base + MODEL_FILES[kind])
        gltf.scene.traverse((o) => {
          if (o instanceof Mesh) {
            o.castShadow = true
            o.receiveShadow = true
          }
        })
        cache.set(kind, gltf.scene)
      } catch {
        // no realistic model then: the code-built one stands in
      }
    })
  )
}

/** A copy of the loaded realistic model of this kind, or null when there is none. */
export const realModel = (kind: PartKind): Group | null => {
  const model = cache.get(kind)
  if (!model) return null
  const g = new Group()
  g.add(model.clone(true))
  g.userData.real = true
  return g
}
