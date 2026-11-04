import {
  ACESFilmicToneMapping,
  BoxGeometry,
  CatmullRomCurve3,
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
  PCFShadowMap,
  PerspectiveCamera,
  Plane,
  PMREMGenerator,
  Raycaster,
  Scene,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer
} from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import type { Hint } from "../core/progress.ts"
import type { Placed } from "../core/machine.ts"
import type { PartKind, Turn } from "../core/parts.ts"
import type { Scenario } from "../core/scenario.ts"
import { buildBoard, buildDesk, buildLever } from "./board.ts"
import { buildCase, powerButton } from "./case.ts"
import { FRONT_VIEW } from "./focus.ts"
import { renderIcons } from "./icons.ts"
import { mat } from "./kit.ts"
import { GRADE8_BOARD, type SceneLayout, type Vec3 } from "./layout.ts"
import { buildModel, deviceModel, iconModel, MODELLED } from "./models.ts"

export interface SceneEvents {
  /** The student clicked a slot while holding a part. */
  readonly onSlot: (slotId: string) => void
  /** The student clicked a control on the bench: the socket lever, the power button. */
  readonly onControl: (controlId: string) => void
  /** The student clicked a placed part or the bench (the board, the case). */
  readonly onInspect: (partId: string) => void
}

/** What the page outside the trainer may ask of the scene: tests and teacher tools. */
export interface SceneHandle {
  /** Where a slot, the lever or a control's button is on the screen, in page pixels; null when it is not in this layout. */
  screenPoint(target: ScreenTarget): { x: number; y: number } | null
}

export type ScreenTarget = { readonly slot: string } | { readonly lever: true } | { readonly control: string }

/** Everything the scene shows. The React component sends a new view after every action. */
export interface SceneView {
  readonly placed: Readonly<Record<string, Placed>>
  readonly controls: Readonly<Record<string, string>>
  readonly held: { readonly part: string; readonly turn: Turn } | null
  readonly hint: Hint | null
}

const CLICK_PX = 7
const HOLD_HEIGHT = 5
const SPIN_PER_FRAME = 0.45
/** Cable thickness and colour by the kind of plug. */
const CABLES: Partial<Record<string, { readonly r: number; readonly color: string }>> = {
  atxCable: { r: 0.55, color: "#141518" },
  cpuPowerCable: { r: 0.32, color: "#141518" },
  gpuPowerCable: { r: 0.32, color: "#141518" },
  sataPowerCable: { r: 0.22, color: "#141518" },
  sataDataCable: { r: 0.14, color: "#c0392b" },
  monitor: { r: 0.3, color: "#1b1d21" },
  keyboard: { r: 0.2, color: "#3e434a" },
  mouse: { r: 0.18, color: "#1b1d21" }
}
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
  private readonly benchModel: Group
  private readonly lever: Group | null = null
  private readonly buttons: Array<{ readonly control: string; readonly mesh: Group }> = []
  private readonly screens: MeshStandardMaterial[] = []
  private spinners: Object3D[] | null = null
  private readonly areas: SlotArea[] = []
  private readonly placedMeshes = new Map<string, { slot: string; mesh: Group }>()
  private heldMesh: { part: string; mesh: Group } | null = null
  private readonly ray = new Raycaster()
  private readonly pointer = new Vector2()
  private readonly holdHeight: number
  private readonly holdPlane: Plane
  private readonly holdAt: Vector3
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
    this.holdHeight = layout.holdHeight ?? HOLD_HEIGHT
    this.holdPlane = new Plane(new Vector3(0, 1, 0), -this.holdHeight)
    this.holdAt = new Vector3(0, this.holdHeight, 8)
    this.renderer = new WebGLRenderer({ antialias: !light, powerPreference: light ? "low-power" : "default" })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, light ? 1 : 2))
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = ACESFilmicToneMapping
    // soft shadows ground the parts on the board; old computers skip them
    this.renderer.shadowMap.enabled = !light
    this.renderer.shadowMap.type = PCFShadowMap
    this.renderer.domElement.className = "edu-pc-canvas"
    host.appendChild(this.renderer.domElement)

    const pmrem = new PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    this.scene.background = new Color("#262a30")
    this.scene.add(new HemisphereLight("#ffffff", "#5a4a3a", 0.6))
    const sun = new DirectionalLight("#ffffff", 1.6)
    sun.position.set(-20, 40, 25)
    if (!light) {
      sun.castShadow = true
      sun.shadow.mapSize.set(2048, 2048)
      const reach = layout.bench === "case" ? 34 : 22
      Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 10, far: 120 })
      sun.shadow.bias = -0.0005
      sun.shadow.normalBias = 0.03
    }
    this.scene.add(sun)

    this.scene.add(buildDesk())
    this.bench.position.y = 0.05
    this.scene.add(this.bench)
    this.benchModel = layout.bench === "case" ? buildCase() : buildBoard(GRADE8_BOARD, scenario.slots, layout.slots)
    this.benchModel.userData.part = layout.benchPart
    this.bench.add(this.benchModel)
    if (layout.lever) {
      const lever = buildLever(layout.lever.length)
      lever.position.set(...layout.lever.pivot)
      lever.userData.lever = true
      this.bench.add(lever)
      this.lever = lever
    }
    for (const pose of layout.buttons ?? []) {
      const button = powerButton()
      button.position.set(...pose.at)
      button.userData.control = pose.control
      this.bench.add(button)
      this.buttons.push({ control: pose.control, mesh: button })
    }
    for (const prop of layout.props ?? []) {
      const device = deviceModel(prop.kind)
      device.position.set(...prop.at)
      device.rotation.y = prop.yaw ?? 0
      device.traverse((o) => {
        if (o instanceof Mesh && o.userData.screen && o.material instanceof MeshStandardMaterial) this.screens.push(o.material)
      })
      this.scene.add(device)
    }
    for (const slot of scenario.slots) this.addArea(slot.id, slot.accepts)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.maxPolarAngle = Math.PI * 0.46
    this.controls.minDistance = 10
    this.controls.maxDistance = 140
    const far = (layout.overview ?? 40) / 40
    this.camera.position.set(0, 34 * far, 30 * far)
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

  /** Glides the camera to look at a point from a comfortable distance and direction; farther on a narrow screen. */
  focus(at: Vec3, distance = 26, view: Vec3 = FRONT_VIEW): void {
    this.focusTarget.set(at[0], at[1], at[2])
    const narrow = this.host.clientWidth < 700 ? 1.45 : 1
    const offset = new Vector3(...view).normalize().multiplyScalar(distance * narrow)
    this.focusFrom = this.focusTarget.clone().add(offset)
    this.focusing = 1
  }

  screenPoint(target: ScreenTarget): { x: number; y: number } | null {
    let p: Vector3
    if ("slot" in target) {
      const at = this.layout.slots[target.slot]?.at
      if (!at) return null
      p = this.bench.localToWorld(new Vector3(at[0], at[1] + 0.3, at[2]))
    } else if ("control" in target) {
      const at = this.layout.buttons?.find((b) => b.control === target.control)?.at
      if (!at) return null
      p = this.bench.localToWorld(new Vector3(at[0] - 0.3, at[1], at[2]))
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

  /** Tray pictures of the given kinds, drawn from the scene's own models. */
  icons(kinds: ReadonlyArray<PartKind>): Partial<Record<PartKind, string>> {
    return renderIcons(this.renderer, this.scene.environment, kinds, (kind) => {
      // on the desk the board is bare: the student is about to fill it
      if (kind === "motherboard" && this.layout.bench === "board") return buildBoard(GRADE8_BOARD, this.scenario.slots, this.layout.slots)
      return MODELLED.has(kind) ? iconModel(kind) : null
    })
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
      const model = buildModel(part.kind, true)
      model.position.set(...pose.at)
      // a slot that takes any turn shows the part the way it really goes in
      const fixed = this.scenario.slots.find((s) => s.id === slotId)?.turn
      model.rotation.y = fixed === undefined ? 0 : -placed.turn * QUARTER
      const mesh = new Group()
      mesh.add(model)
      if (pose.cableFrom) {
        const cable = this.cable(model, part.kind, new Vector3(...pose.cableFrom))
        if (cable) mesh.add(cable)
      }
      mesh.userData.part = part.id
      this.bench.add(mesh)
      this.placedMeshes.set(part.id, { slot: slotId, mesh })
    }
    this.spinners = null
  }

  /** A cable from a placed plug to where it comes from, sagging a little on the way. */
  private cable(plug: Group, kind: string, to: Vector3): Mesh | null {
    const look = CABLES[kind]
    const out = plug.userData.cableOut
    const dir = plug.userData.cableDir
    if (!look || !(out instanceof Vector3) || !(dir instanceof Vector3)) return null
    plug.updateMatrix()
    const start = out.clone().applyMatrix4(plug.matrix)
    const lead = start.clone().add(dir.clone().transformDirection(plug.matrix).multiplyScalar(2.5))
    const top = Math.max(start.y, to.y) + 2
    const mid = new Vector3((lead.x + to.x) / 2, top, (lead.z + to.z) / 2)
    const curve = new CatmullRomCurve3([start, lead, mid, to])
    const tube = new Mesh(new TubeGeometry(curve, 48, look.r, 10), mat(look.color, { rough: 0.7 }))
    tube.castShadow = true
    return tube
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
        const mesh = buildModel(part.kind, false)
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
    this.animateButtons(pulse)
    this.animatePower()
    if (this.heldMesh && held) {
      const m = this.heldMesh.mesh
      m.position.lerp(this.holdAt, 0.35)
      m.position.y = this.holdHeight + Math.sin(time / 400) * 0.15
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

  private poweredOn(): boolean {
    const power = this.layout.power
    return power !== undefined && this.view.controls[power.control] === power.on
  }

  /** A button glows when pressing it is the next thing to do; its light ring shines once the computer is on. */
  private animateButtons(pulse: number): void {
    const on = this.poweredOn()
    for (const { control, mesh } of this.buttons) {
      const next = this.view.hint?.control?.id === control && !this.view.held
      mesh.traverse((obj) => {
        if (!(obj instanceof Mesh) || !(obj.material instanceof MeshStandardMaterial)) return
        if (obj.userData.light) obj.material.emissiveIntensity = on ? 1.4 : next ? 0.3 + 0.6 * pulse : 0
        else {
          obj.material.emissive.copy(HINT_COLOR)
          obj.material.emissiveIntensity = next ? 0.2 + 0.5 * pulse : 0
        }
      })
    }
  }

  /** With the power on, fans spin and the monitor shows its picture. */
  private animatePower(): void {
    const on = this.poweredOn()
    for (const screen of this.screens) screen.emissiveIntensity += ((on ? 1 : 0) - screen.emissiveIntensity) * 0.06
    if (!on) return
    if (!this.spinners) {
      const found: Object3D[] = []
      this.bench.traverse((o) => {
        if (o.userData.spin) found.push(o)
      })
      this.spinners = found
    }
    for (const rotor of this.spinners) rotor.rotation.y += SPIN_PER_FRAME
  }

  private setPointer(e: PointerEvent): void {
    const r = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    this.ray.setFromCamera(this.pointer, this.camera)
  }

  private readonly onDown = (e: PointerEvent): void => {
    this.down = { x: e.clientX, y: e.clientY }
  }

  private readonly onMove = (e: PointerEvent): void => {
    // turning the view by hand stops the automatic camera glide; a plain tap does not
    if (this.down && Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > CLICK_PX) this.focusing = 0
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
    const targets: Object3D[] = [...this.buttons.map((b) => b.mesh), ...[...this.placedMeshes.values()].map((p) => p.mesh), this.benchModel]
    if (this.lever) targets.unshift(this.lever)
    const hit = this.ray.intersectObjects(targets, true)[0]
    for (let obj: Object3D | null = hit?.object ?? null; obj; obj = obj.parent) {
      if (obj.userData.lever && this.layout.lever) return this.events.onControl(this.layout.lever.control)
      if (typeof obj.userData.control === "string") return this.events.onControl(obj.userData.control)
      if (typeof obj.userData.part === "string") return this.events.onInspect(obj.userData.part)
    }
  }
}
