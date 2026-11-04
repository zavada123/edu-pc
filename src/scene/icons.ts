import {
  Box3,
  DirectionalLight,
  FloatType,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  Scene,
  type Texture,
  Vector3,
  WebGLRenderTarget,
  type WebGLRenderer
} from "three"
import type { PartKind } from "../core/parts.ts"
import { buildPart, MODELLED } from "./parts.ts"

const VIEW = new Vector3(0.9, 1.1, 1.25).normalize()
const ICON_PX = 128

/**
 * Pictures of the parts for the tray, drawn from the same 3D models as the scene,
 * so a student recognises on the bench what they picked in the tray.
 * Uses the scene's own renderer (a second WebGL context slows weak computers down) but draws
 * off screen, so the visible canvas is never read back.
 * Returns a PNG data URL per modelled kind; other kinds are left out.
 */
export const renderIcons = (
  renderer: WebGLRenderer,
  environment: Texture | null,
  kinds: ReadonlyArray<PartKind>
): Partial<Record<PartKind, string>> => {
  const wanted = [...new Set(kinds)].filter((k) => MODELLED.has(k))
  const out: Partial<Record<PartKind, string>> = {}
  if (wanted.length === 0) return out
  const scene = new Scene()
  scene.environment = environment
  scene.add(new HemisphereLight("#ffffff", "#5a4a3a", 0.7))
  const sun = new DirectionalLight("#ffffff", 1.5)
  sun.position.set(-10, 20, 12)
  scene.add(sun)
  const camera = new PerspectiveCamera(30, 1, 0.1, 200)
  const target = new WebGLRenderTarget(ICON_PX, ICON_PX, { type: FloatType, samples: 4 })
  const pixels = new Float32Array(ICON_PX * ICON_PX * 4)
  const canvas = document.createElement("canvas")
  canvas.width = ICON_PX
  canvas.height = ICON_PX
  const g = canvas.getContext("2d")
  const shadows = renderer.shadowMap.enabled
  const previous = renderer.getRenderTarget()
  renderer.shadowMap.enabled = false
  try {
    for (const kind of wanted) {
      const model = buildPart(kind, false)
      scene.add(model)
      const bounds = new Box3().setFromObject(model)
      const centre = bounds.getCenter(new Vector3())
      const radius = bounds.getSize(new Vector3()).length() / 2
      // a bounding sphere leaves wide margins; pull in so the part fills the picture
      camera.position.copy(centre).addScaledVector(VIEW, (0.72 * radius) / Math.sin((camera.fov * Math.PI) / 360))
      camera.lookAt(centre)
      renderer.setRenderTarget(target)
      renderer.setClearColor(0x000000, 0)
      renderer.clear()
      renderer.render(scene, camera)
      renderer.readRenderTargetPixels(target, 0, 0, ICON_PX, ICON_PX, pixels)
      if (g) {
        g.putImageData(toImage(pixels), 0, 0)
        out[kind] = canvas.toDataURL("image/png")
      }
      scene.remove(model)
      model.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose()
      })
    }
  } finally {
    renderer.setRenderTarget(previous)
    renderer.setClearColor(0x000000, 1)
    renderer.shadowMap.enabled = shadows
    target.dispose()
  }
  return out
}

/** Off-screen pixels are linear light, bottom row first: tone-map like the scene, convert to sRGB and flip. */
const toImage = (pixels: Float32Array): ImageData => {
  const image = new ImageData(ICON_PX, ICON_PX)
  const exposure = 1
  for (let y = 0; y < ICON_PX; y++) {
    for (let x = 0; x < ICON_PX; x++) {
      const from = ((ICON_PX - 1 - y) * ICON_PX + x) * 4
      const to = (y * ICON_PX + x) * 4
      for (let c = 0; c < 3; c++) image.data[to + c] = Math.round(srgb(aces((pixels[from + c] ?? 0) * exposure)) * 255)
      image.data[to + 3] = Math.round(Math.min(1, pixels[from + 3] ?? 0) * 255)
    }
  }
  return image
}

/** A close fit of the filmic curve the scene's renderer uses. */
const aces = (v: number): number => Math.min(1, Math.max(0, (v * (2.51 * v + 0.03)) / (v * (2.43 * v + 0.59) + 0.14)))

const srgb = (v: number): number => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)
