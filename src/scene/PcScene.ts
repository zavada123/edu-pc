import {
  ACESFilmicToneMapping,
  BoxGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  PerspectiveCamera,
  Plane,
  PMREMGenerator,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer
} from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import type { Hint } from "../core/progress.ts"
import type { Placed } from "../core/machine.ts"
import type { Turn } from "../core/parts.ts"
import type { Scenario } from "../core/scenario.ts"
import type { SceneLayout, Vec3 } from "./layout.ts"
import { buildBoard, buildDesk, buildLever, buildPart } from "./parts.ts"

export interface SceneEvents {
  /** The student clicked a slot while holding a part. */
  readonly onSlot: (slotId: string) => void
  /** The student clicked the socket lever. */
  readonly onLever: () => void
  /** The student clicked a placed part or the board. */
  readonly onInspect: (partId: string) => void
}

/** What the page outside the trainer may ask of the scene: tests and teacher tools. */
export interface SceneHandle {
  /** Where a slot or the lever is on the screen, in page pixels; null when it is not in this layout. */
  screenPoint(target: { readonly slot: string } | { readonly lever: true }): { x: number; y: number } | null
}

/** Everything the scene shows. The React component sends a new view after every action. */
export interface SceneView {
  readonly placed: Readonly<Record<string, Placed>>
  readonly controls: Readonly<Record<string, string>>
  readonly held: { readonly part: string; readonly turn: Turn } | null
  readonly hint: Hint | null
}

const CLICK_PX = 7
const HOLD_HEIGHT = 5
const QUARTER = Math.PI / 2
const LEVER_UP = 1.35
const HINT_COLOR = new Color("#ffc94d")
const ACCEPT_COLOR = new Color("#ffffff")

interface SlotArea {
  readonly id: string
  readonly mesh: Mesh
  readonly edges: LineSegments
  readonly accepts: ReadonlyArray<string>
}

/** The 3D bench: a desk, the board, placed parts, the part in hand. Knows nothing about steps or rules. */
export class PcScene implements SceneHandle {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(38, 1, 0.5, 400)
  private readonly controls: OrbitControls
  private readonly bench = new Group()
  private readonly board: Group
  private readonly lever: Group | null = null
  private readonly areas: SlotArea[] = []
  private readonly placedMeshes = new Map<string, { slot: string; mesh: Group }>()
  private heldMesh: { part: string; mesh: Group } | null = null
  private readonly ray = new Raycaster()
  private readonly pointer = new Vector2()
  private readonly holdPlane = new Plane(new Vector3(0, 1, 0), -HOLD_HEIGHT)
  private readonly holdAt = new Vector3(0, HOLD_HEIGHT, 8)
  private down: { x: number; y: number } | null = null
  private view: SceneView = { placed: {}, controls: {}, held: null, hint: null }
  private leverAngle = 0
  private readonly focusTarget = new Vector3()
  private focusFrom = new Vector3()
  private focusing = 0
  private readonly resize: ResizeObserver

  constructor(
    private readonly host: HTMLElement,
    private readonly scenario: Scenario,
    private readonly layout: SceneLayout,
    private readonly events: SceneEvents,
    light = false
  ) {
    this.renderer = new WebGLRenderer({ antialias: !light, powerPreference: light ? "low-power" : "default" })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, light ? 1 : 2))
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.domElement.className = "edu-pc-canvas"
    host.appendChild(this.renderer.domElement)

    const pmrem = new PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    this.scene.background = new Color("#262a30")
    this.scene.add(new HemisphereLight("#ffffff", "#5a4a3a", 0.6))
    const sun = new DirectionalLight("#ffffff", 1.6)
    sun.position.set(-20, 40, 25)
    this.scene.add(sun)

    this.scene.add(buildDesk())
    this.bench.position.y = 0.05
    this.scene.add(this.bench)
    this.board = buildBoard(layout, scenario.slots)
    this.board.userData.part = layout.boardPart
    this.bench.add(this.board)
    if (layout.lever) {
      const lever = buildLever(layout.lever.length)
      lever.position.set(...layout.lever.pivot)
      lever.userData.lever = true
      this.bench.add(lever)
      this.lever = lever
    }
    for (const slot of scenario.slots) this.addArea(slot.id, slot.accepts)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.maxPolarAngle = Math.PI * 0.46
    this.controls.minDistance = 10
    this.controls.maxDistance = 90
    this.camera.position.set(0, 34, 30)
    this.controls.target.set(0, 0, 0)

    const el = this.renderer.domElement
    el.addEventListener("pointerdown", this.onDown)
    el.addEventListener("pointermove", this.onMove)
    el.addEventListener("pointerup", this.onUp)
    this.resize = new ResizeObserver(() => this.fit())
    this.resize.observe(host)
    this.fit()
    this.renderer.setAnimationLoop(this.frame)
  }

  /** Shows a new view: placed parts, the lever, the part in hand and the highlighted slots. */
  update(view: SceneView): void {
    this.view = view
    this.syncPlaced()
    this.syncHeld()
  }

  /** Glides the camera to look at a point from a comfortable distance; farther on a narrow screen. */
  focus(at: Vec3, distance = 26): void {
    this.focusTarget.set(at[0], at[1], at[2])
    const narrow = this.host.clientWidth < 700 ? 1.45 : 1
    const offset = new Vector3(0, 0.78, 0.62).normalize().multiplyScalar(distance * narrow)
    this.focusFrom = this.focusTarget.clone().add(offset)
    this.focusing = 1
  }

  screenPoint(target: { readonly slot: string } | { readonly lever: true }): { x: number; y: number } | null {
    let p: Vector3
    if ("slot" in target) {
      const at = this.layout.slots[target.slot]?.at
      if (!at) return null
      p = this.bench.localToWorld(new Vector3(at[0], at[1] + 0.3, at[2]))
    } else {
      if (!this.lever || !this.layout.lever) return null
      // the middle of the bar, wherever the lever is turned now
      this.lever.updateMatrixWorld(true)
      p = this.lever.localToWorld(new Vector3(0, 0, -this.layout.lever.length / 2))
    }
    p.project(this.camera)
    const r = this.renderer.domElement.getBoundingClientRect()
    return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height }
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null)
    this.resize.disconnect()
    const el = this.renderer.domElement
    el.removeEventListener("pointerdown", this.onDown)
    el.removeEventListener("pointermove", this.onMove)
    el.removeEventListener("pointerup", this.onUp)
    this.controls.dispose()
    this.scene.traverse((obj) => {
      if (obj instanceof Mesh || obj instanceof LineSegments) {
        obj.geometry.dispose()
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
        for (const m of materials) {
          if ("map" in m && m.map && typeof m.map === "object" && "dispose" in m.map) (m.map as { dispose(): void }).dispose()
          m.dispose()
        }
      }
    })
    this.scene.environment?.dispose()
    this.renderer.dispose()
    el.remove()
  }

  private addArea(id: string, accepts: ReadonlyArray<string>): void {
    const pose = this.layout.slots[id]
    if (!pose) return
    const geometry = new BoxGeometry(...pose.area)
    const mesh = new Mesh(geometry, new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }))
    mesh.position.set(pose.at[0], pose.at[1] + pose.area[1] / 2 - 0.3, pose.at[2])
    mesh.userData.slot = id
    const edges = new LineSegments(new EdgesGeometry(geometry), new LineBasicMaterial({ transparent: true, opacity: 0 }))
    edges.position.copy(mesh.position)
    this.bench.add(mesh, edges)
    this.areas.push({ id, mesh, edges, accepts })
  }

  private kindOf(partId: string): string | undefined {
    return this.scenario.parts.find((p) => p.id === partId)?.kind
  }

  private syncPlaced(): void {
    const want = this.view.placed
    for (const [partId, entry] of this.placedMeshes) {
      if (want[entry.slot]?.part !== partId) {
        this.bench.remove(entry.mesh)
        this.placedMeshes.delete(partId)
      }
    }
    for (const [slotId, placed] of Object.entries(want)) {
      if (this.placedMeshes.get(placed.part)?.slot === slotId) continue
      const pose = this.layout.slots[slotId]
      const part = this.scenario.parts.find((p) => p.id === placed.part)
      if (!pose || !part) continue
      const mesh = buildPart(part.kind, true)
      mesh.position.set(...pose.at)
      mesh.rotation.y = -placed.turn * QUARTER
      mesh.userData.part = part.id
      this.bench.add(mesh)
      this.placedMeshes.set(part.id, { slot: slotId, mesh })
    }
  }

  private syncHeld(): void {
    const held = this.view.held
    if (this.heldMesh && this.heldMesh.part !== held?.part) {
      this.scene.remove(this.heldMesh.mesh)
      this.heldMesh = null
    }
    if (held && !this.heldMesh) {
      const part = this.scenario.parts.find((p) => p.id === held.part)
      if (part) {
        const mesh = buildPart(part.kind, false)
        this.scene.add(mesh)
        this.heldMesh = { part: held.part, mesh }
      }
    }
  }

  private fit(): void {
    const w = Math.max(1, this.host.clientWidth)
    const h = Math.max(1, this.host.clientHeight)
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private readonly frame = (time: number): void => {
    const pulse = 0.5 + 0.5 * Math.sin(time / 260)
    const held = this.view.held
    const heldKind = held ? this.kindOf(held.part) : undefined
    const hintSlots = new Set(this.view.hint?.slots ?? [])
    for (const area of this.areas) {
      const accepts = heldKind !== undefined && area.accepts.includes(heldKind)
      const hinted = hintSlots.has(area.id) && (held === null || accepts)
      const fill = area.mesh.material as MeshBasicMaterial
      const line = area.edges.material as LineBasicMaterial
      fill.color.copy(hinted ? HINT_COLOR : ACCEPT_COLOR)
      line.color.copy(fill.color)
      fill.opacity = hinted ? 0.12 + 0.18 * pulse : accepts ? 0.06 : 0
      line.opacity = hinted ? 0.5 + 0.5 * pulse : accepts ? 0.35 : 0
    }
    if (this.lever && this.layout.lever) {
      const up = this.view.controls[this.layout.lever.control] === this.layout.lever.upValue
      this.leverAngle += ((up ? LEVER_UP : 0) - this.leverAngle) * 0.15
      this.lever.rotation.x = this.leverAngle
      const next = this.view.hint?.control?.id === this.layout.lever.control && !held
      this.lever.traverse((obj) => {
        if (obj instanceof Mesh && obj.material instanceof MeshStandardMaterial) {
          obj.material.emissive.copy(HINT_COLOR)
          obj.material.emissiveIntensity = next ? 0.25 + 0.5 * pulse : 0
        }
      })
    }
    if (this.heldMesh && held) {
      const m = this.heldMesh.mesh
      m.position.lerp(this.holdAt, 0.35)
      m.position.y = HOLD_HEIGHT + Math.sin(time / 400) * 0.15
      m.rotation.y += (-held.turn * QUARTER - m.rotation.y) * 0.25
    }
    if (this.focusing > 0) {
      this.controls.target.lerp(this.focusTarget, 0.08)
      this.camera.position.lerp(this.focusFrom, 0.08)
      this.focusing = this.camera.position.distanceTo(this.focusFrom) > 0.05 ? 1 : 0
    }
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  private setPointer(e: PointerEvent): void {
    const r = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    this.ray.setFromCamera(this.pointer, this.camera)
  }

  private readonly onDown = (e: PointerEvent): void => {
    this.down = { x: e.clientX, y: e.clientY }
    // a manual orbit stops the automatic camera glide
    this.focusing = 0
  }

  private readonly onMove = (e: PointerEvent): void => {
    if (!this.view.held) return
    this.setPointer(e)
    this.ray.ray.intersectPlane(this.holdPlane, this.holdAt)
  }

  private readonly onUp = (e: PointerEvent): void => {
    const down = this.down
    this.down = null
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_PX) return
    this.setPointer(e)
    if (this.view.held) {
      // Areas overlap: the socket, the paste and the cooler share one spot, and seen at an angle a tall
      // RAM slot's box covers its neighbour. Prefer areas that take the held part, then the one whose
      // centre is closest to the ray, so a tap lands on the slot the student aimed at.
      const hits = this.ray.intersectObjects(this.areas.map((a) => a.mesh), false)
      const heldKind = this.kindOf(this.view.held.part)
      const fits = (id: unknown) => this.areas.some((a) => a.id === id && heldKind !== undefined && a.accepts.includes(heldKind))
      const candidates = hits.some((h) => fits(h.object.userData.slot)) ? hits.filter((h) => fits(h.object.userData.slot)) : hits
      const centre = new Vector3()
      const off = (h: (typeof hits)[number]) => this.ray.ray.distanceToPoint(h.object.getWorldPosition(centre))
      const hit = candidates.reduce<(typeof hits)[number] | undefined>((best, h) => (!best || off(h) < off(best) ? h : best), undefined)
      const slot = hit?.object.userData.slot
      if (typeof slot === "string") {
        this.holdAt.copy(hit?.point ?? this.holdAt)
        this.events.onSlot(slot)
      }
      return
    }
    const targets: Object3D[] = [...[...this.placedMeshes.values()].map((p) => p.mesh), this.board]
    if (this.lever) targets.unshift(this.lever)
    const hit = this.ray.intersectObjects(targets, true)[0]
    for (let obj: Object3D | null = hit?.object ?? null; obj; obj = obj.parent) {
      if (obj.userData.lever) return this.events.onLever()
      if (typeof obj.userData.part === "string") return this.events.onInspect(obj.userData.part)
    }
  }
}
