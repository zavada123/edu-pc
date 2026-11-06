import { Group, Mesh, type Object3D, TextureLoader } from "three"
import { GLTFLoader, type GLTFParser } from "three/examples/jsm/loaders/GLTFLoader.js"
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js"
import type { PartKind } from "../core/parts.ts"

/**
 * How the parts look. `simple`: every part is the model built in code, with fewer pixels, for old
 * computers. `normal`: realistic models of real parts, small enough for phones. `high`: the same
 * models with more detail and sharper textures (the `hd/` folder), for good computers.
 */
export type ModelQuality = "simple" | "normal" | "high"

export const MODEL_QUALITIES: ReadonlyArray<ModelQuality> = ["simple", "normal", "high"]

/**
 * Realistic models of real parts (GLB files, see `models/CREDITS.md`). Every file is prepared
 * beforehand: in centimetres, turned the way the code-built model of the same part is, so a slot pose
 * places either of them the same way. The board and the case keep their own origin (see `PLACED_BY_FILE`);
 * every other model is moved onto the footprint of its code-built model.
 */
export const MODEL_FILES: Readonly<Partial<Record<PartKind, string>>> = {
  motherboard: "motherboard.glb",
  cpu: "cpu.glb",
  ram: "ram.glb",
  m2ssd: "m2ssd.glb",
  cooler: "cooler.glb",
  gpu: "gpu.glb",
  psu: "psu.glb",
  hdd: "hdd.glb",
  case: "case.glb",
  monitor: "monitor.glb",
  keyboard: "keyboard.glb",
  mouse: "mouse.glb",
  speakers: "speakers.glb",
  printer: "printer.glb",
  flashDrive: "flashdrive.glb"
}

/** Models whose file is already in scene coordinates: the board's origin is our board's, the case's the code-built case's. */
export const PLACED_BY_FILE: ReadonlySet<PartKind> = new Set<PartKind>(["motherboard", "case"])

/** The folder of the files for a quality, inside the models folder. */
const folderOf = (base: string, quality: ModelQuality): string => {
  const root = base.endsWith("/") ? base : `${base}/`
  return quality === "high" ? `${root}hd/` : root
}

/** Loaded models by file URL, so switching quality back and forth loads each file once. */
const cache = new Map<string, Object3D>()
/** The models the scene uses now: those of the quality loaded last. */
let active = new Map<PartKind, Object3D>()

/**
 * three.js reads textures packed in a GLB with fetch() of a blob: URL, which a page's
 * Content-Security-Policy often blocks (connect-src), and then every textured part renders white.
 * An <img> reads the same blob: URL under img-src, which pages allow far more often.
 */
const imageTextures = (parser: GLTFParser) => {
  ;(parser as unknown as { textureLoader: TextureLoader }).textureLoader = new TextureLoader(parser.options.manager)
  return { name: "edu-pc-image-textures" }
}

/**
 * Loads the realistic models of these kinds from `baseUrl` (the folder with the GLB files) in this
 * quality, and makes them the ones the scene uses. `simple` loads nothing: every part is built in code.
 * A model that fails to load is left out: its part keeps the model built in code.
 */
export const preloadModels = async (baseUrl: string, kinds: Iterable<PartKind>, quality: ModelQuality = "normal"): Promise<void> => {
  const next = new Map<PartKind, Object3D>()
  if (quality !== "simple") {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(imageTextures)
    const folder = folderOf(baseUrl, quality)
    const wanted = [...new Set(kinds)].filter((k) => MODEL_FILES[k])
    await Promise.all(
      wanted.map(async (kind) => {
        const url = folder + MODEL_FILES[kind]
        try {
          const cached = cache.get(url)
          if (cached) {
            next.set(kind, cached)
            return
          }
          const gltf = await loader.loadAsync(url)
          gltf.scene.traverse((o) => {
            if (o instanceof Mesh) {
              o.castShadow = true
              o.receiveShadow = true
            }
          })
          cache.set(url, gltf.scene)
          next.set(kind, gltf.scene)
        } catch {
          // no realistic model then: the code-built one stands in
        }
      })
    )
  }
  active = next
}

/** A copy of the loaded realistic model of this kind, or null when there is none. */
export const realModel = (kind: PartKind): Group | null => {
  const model = active.get(kind)
  if (!model) return null
  const g = new Group()
  g.add(model.clone(true))
  g.userData.real = true
  return g
}

/** The realistic model of this kind is loaded and in use. */
export const hasRealModel = (kind: PartKind): boolean => active.has(kind)
