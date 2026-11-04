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
  PCFShadowMap,
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
import type { PartKind, Turn } from "../core/parts.ts"
import type { Scenario } from "../core/scenario.ts"
import { buildBoard, buildDesk, buildLever } from "./board.ts"
import { buildCase, powerButton } from "./case.ts"
import { FRONT_VIEW } from "./focus.ts"
import { renderIcons } from "./icons.ts"
import { cardboardBox, crate } from "./devices.ts"
import { GRADE8_BOARD, type SceneLayout, type Vec3 } from "./layout.ts"
import { buildModel, deviceModel, type DeviceKind, iconModel, MODELLED, placedModel, systemUnit } from "./models.ts"

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

export type ScreenTarget =
  | { readonly slot: string }
  | { readonly lever: true }
  | { readonly control: string }
  /** A box on the desk, closed or opened. */
  | { readonly box: string }

/** Everything the scene shows. The React component sends a new view after every action. */
export interface SceneView {
  readonly placed: Readonly<Record<string, Placed>>
  readonly controls: Readonly<Record<string, string>>
  /** Parts the student has read about: their boxes on the desk are open. */
  readonly inspected: ReadonlyArray<string>
  readonly held: { readonly part: string; readonly turn: Turn } | null
  readonly hint: Hint | null
}

const CLICK_PX = 7
const NARROW_PX = 700
/** Camera distances from this far are looks at a wide area, which a narrow screen must fit across. */
const WIDE_SHOT = 60
const WIDE_ASPECT = 1.3
const HOLD_HEIGHT = 5
const SPIN_PER_FRAME = 0.45
const QUARTER = Math.PI / 2
const LEVER_UP = 1.35
const HINT_COLOR = new Color("#ffc94d")
const ACCEPT_COLOR = new Color("#ffffff")

/** Kinds that sit on a desk as a whole device: an opened box shows one of them. */
const DEVICE_KINDS: ReadonlySet<string> = new Set<DeviceKind>(["monitor", "keyboard", "mouse", "speakers", "printer", "flashDrive"])
const BUTTON_FACE = new Vector3(-1, 0, 0)

interface DeskBox {
  readonly part: string
  readonly closed: Group
  readonly open: Group | null
}

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
  private readonly buttons: Array<{ readonly control: string; readonly mesh: Group; readonly when: string | undefined }> = []
  private readonly propScreens: MeshStandardMaterial[] = []
  private screens: MeshStandardMaterial[] = []
  private readonly boxes: DeskBox[] = []
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
  private view: SceneView = { placed: {}, controls: {}, inspected: [], held: null, hint: null }
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
      const reach = layout.bench === "board" ? 22 : Math.max(34, (layout.overview ?? 100) * 0.42)
      Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 10, far: 120 })
      sun.shadow.bias = -0.0005
      sun.shadow.normalBias = 0.03
    }
    this.scene.add(sun)

    this.scene.add(buildDesk())
    this.bench.position.y = 0.05
    this.scene.add(this.bench)
    this.benchModel =
      layout.bench === "case" ? buildCase() : layout.bench === "tower" ? systemUnit() : buildBoard(GRADE8_BOARD, scenario.slots, layout.slots)
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
      // the button model faces -x; turn it to face the way the layout says
      const button = new Group()
      button.add(powerButton())
      button.quaternion.setFromUnitVectors(BUTTON_FACE, new Vector3(...pose.normal).normalize())
      button.scale.setScalar(pose.size ?? 1)
      button.position.set(...pose.at)
      button.userData.control = pose.control
      this.bench.add(button)
      this.buttons.push({ control: pose.control, mesh: button, when: pose.when })
    }
    for (const c of layout.crates ?? []) {
      const basket = crate(c.label, c.colour)
      basket.position.set(...c.at)
      this.bench.add(basket)
    }
    for (const b of layout.boxes ?? []) this.addBox(b.part, b.at)
    for (const prop of layout.props ?? []) {
      const device = deviceModel(prop.kind)
      device.position.set(...prop.at)
      device.rotation.y = prop.yaw ?? 0
      this.propScreens.push(...screensOf(device))
      this.scene.add(device)
    }
    this.screens = [...this.propScreens]
    for (const slot of scenario.slots) this.addArea(slot.id, slot.accepts)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.maxPolarAngle = Math.PI * 0.46
    this.controls.minDistance = 10
    this.controls.maxDistance = Math.max(140, (layout.overview ?? 40) * 2.5)
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
    this.syncDesk()
  }

  /** Glides the camera to look at a point from a comfortable distance and direction; farther on a narrow screen. */
  focus(at: Vec3, distance = 26, view: Vec3 = FRONT_VIEW): void {
    this.focusTarget.set(at[0], at[1], at[2])
    const offset = new Vector3(...view).normalize().multiplyScalar(distance * this.narrowFactor(distance))
    this.focusFrom = this.focusTarget.clone().add(offset)
    this.focusing = 1
  }

  /**
   * How much farther to stand on a narrow screen. Close looks need a little more room; a look at a
   * whole wide desk on a phone held upright needs enough to fit the desk's width.
   */
  private narrowFactor(distance: number): number {
    if (this.host.clientWidth >= NARROW_PX) return 1
    const aspect = Math.max(0.3, this.host.clientWidth / Math.max(1, this.host.clientHeight))
    return distance < WIDE_SHOT ? 1.45 : Math.min(2.4, Math.max(1.45, WIDE_ASPECT / aspect))
  }

  screenPoint(target: ScreenTarget): { x: number; y: number } | null {
    let p: Vector3
    if ("slot" in target) {
      const at = this.layout.slots[target.slot]?.at
      if (!at) return null
      p = this.bench.localToWorld(new Vector3(at[0], at[1] + 0.3, at[2]))
    } else if ("control" in target) {
      const button = this.layout.buttons?.find((b) => b.control === target.control)
      if (!button) return null
      const face = new Vector3(...button.normal).normalize().multiplyScalar(0.3)
      p = this.bench.localToWorld(new Vector3(...button.at).add(face))
    } else if ("box" in target) {
      const at = this.layout.boxes?.find((b) => b.part === target.box)?.at
      if (!at) return null
      p = this.bench.localToWorld(new Vector3(at[0], at[1] + 6, at[2]))
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
      // on the grade 3–4 desk the case is the finished system unit
      if (kind === "case" && this.layout.bench === "tower") return systemUnit()
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
      // a slot that takes any turn shows the part the way it really goes in
      const fixed = this.scenario.slots.find((s) => s.id === slotId)?.turn
      const mesh = placedModel(part.kind, pose, fixed === undefined ? 0 : placed.turn)
      mesh.userData.part = part.id
      this.bench.add(mesh)
      this.placedMeshes.set(part.id, { slot: slotId, mesh })
    }
    // a part taken back into the hand leaves its place: it is in the hand now
    for (const [partId, entry] of this.placedMeshes) entry.mesh.visible = this.view.held?.part !== partId
    this.screens = [...this.propScreens, ...[...this.placedMeshes.values()].flatMap((p) => screensOf(p.mesh))]
    this.spinners = null
  }

  /** A closed box on the desk, and the device it holds once opened. */
  private addBox(part: string, at: Vec3): void {
    const kind = this.kindOf(part)
    const name = this.scenario.parts.find((p) => p.id === part)?.name ?? ""
    const closed = cardboardBox(name)
    closed.position.set(...at)
    closed.userData.part = part
    this.bench.add(closed)
    let open: Group | null = null
    if (kind && DEVICE_KINDS.has(kind)) {
      open = deviceModel(kind as DeviceKind)
      open.position.set(...at)
      open.userData.part = part
      open.visible = false
      this.bench.add(open)
    }
    this.boxes.push({ part, closed, open })
  }

  /** Boxes open once their part is read about; the device stands there until it is taken or placed. */
  private syncDesk(): void {
    const placed = new Set(Object.values(this.view.placed).map((p) => p.part))
    for (const box of this.boxes) {
      const opened = this.view.inspected.includes(box.part)
      box.closed.visible = !opened
      if (box.open) box.open.visible = opened && !placed.has(box.part) && this.view.held?.part !== box.part
    }
    for (const button of this.buttons) button.mesh.visible = button.when === undefined || this.view.placed[button.when] !== undefined
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

  /** The screen shows its picture when the computer is on, and the monitor too when it has its own button. */
  private screenOn(): boolean {
    const screen = this.layout.power?.screen
    return this.poweredOn() && (screen === undefined || this.view.controls[screen.control] === screen.on)
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
    const lit = this.screenOn() ? 1 : 0
    for (const screen of this.screens) screen.emissiveIntensity += (lit - screen.emissiveIntensity) * 0.06
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

  /** A tap on a full spot of a basket (or a taken USB port) means the basket: the first free spot of its group. */
  private freeInGroup(slot: unknown): unknown {
    if (typeof slot !== "string") return slot
    const group = this.layout.slots[slot]?.group
    const occupant = this.view.placed[slot]?.part
    if (!group || occupant === undefined || occupant === this.view.held?.part) return slot
    const free = Object.entries(this.layout.slots).find(([id, pose]) => pose.group === group && this.view.placed[id] === undefined)
    return free?.[0] ?? slot
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
      const slot = this.freeInGroup(hit?.object.userData.slot)
      if (typeof slot === "string") {
        this.holdAt.copy(hit?.point ?? this.holdAt)
        this.events.onSlot(slot)
      }
      return
    }
    const targets: Object3D[] = [
      ...this.buttons.map((b) => b.mesh),
      ...[...this.placedMeshes.values()].map((p) => p.mesh),
      ...this.boxes.flatMap((b) => (b.open ? [b.closed, b.open] : [b.closed])),
      this.benchModel
    ].filter((o) => o.visible)
    if (this.lever) targets.unshift(this.lever)
    const hit = this.ray.intersectObjects(targets, true)[0]
    for (let obj: Object3D | null = hit?.object ?? null; obj; obj = obj.parent) {
      if (obj.userData.lever && this.layout.lever) return this.events.onControl(this.layout.lever.control)
      if (typeof obj.userData.control === "string") return this.events.onControl(obj.userData.control)
      if (typeof obj.userData.part === "string") return this.events.onInspect(obj.userData.part)
    }
  }
}

/** Screen materials in a model: the monitor's picture, lit when the computer is on. */
const screensOf = (model: Object3D): MeshStandardMaterial[] => {
  const found: MeshStandardMaterial[] = []
  model.traverse((o) => {
    if (o instanceof Mesh && o.userData.screen && o.material instanceof MeshStandardMaterial) found.push(o.material)
  })
  return found
}
