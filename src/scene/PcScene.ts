import {
  ACESFilmicToneMapping,
  Box3,
  BoxGeometry,
  type CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
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
  Sphere,
  SphereGeometry,
  Spherical,
  Sprite,
  SpriteMaterial,
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
import { buildBoard, buildDesk, buildLever, DESK_SIZE } from "./board.ts"
import { buildCase, powerButton } from "./case.ts"
import { type Bounds, FRONT_VIEW } from "./focus.ts"
import { renderIcons } from "./icons.ts"
import { cardboardBox, crate } from "./devices.ts"
import { noDiskTexture, signTexture } from "./textures.ts"
import { GRADE8_BOARD, type LoosePose, type SceneLayout, type Vec3 } from "./layout.ts"
export { preloadModels } from "./gltf.ts"
import { buildModel, deviceModel, type DeviceKind, iconModel, MODELLED, placedModel, systemUnit } from "./models.ts"

export interface SceneEvents {
  /** The student clicked a slot while holding a part. */
  readonly onSlot: (slotId: string) => void
  /** The student clicked a control on the bench: the socket lever, the power button. */
  readonly onControl: (controlId: string) => void
  /** The student clicked a placed part or the bench (the board, the case). */
  readonly onInspect: (partId: string) => void
  /** The student tapped a marker on a data path. */
  readonly onStop: (stopId: string) => void
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
  /** A marker on a data path. */
  | { readonly stop: string }

/** Everything the scene shows. The React component sends a new view after every action. */
export interface SceneView {
  readonly placed: Readonly<Record<string, Placed>>
  readonly controls: Readonly<Record<string, string>>
  /** Parts the student has read about: their boxes on the desk are open. */
  readonly inspected: ReadonlyArray<string>
  readonly held: { readonly part: string; readonly turn: Turn } | null
  readonly hint: Hint | null
  /** The data path the student lays: every marker, and the stops tapped so far. Null on other steps. */
  readonly path: { readonly stops: ReadonlyArray<{ readonly id: string; readonly label: string }>; readonly picked: ReadonlyArray<string> } | null
}

const CLICK_PX = 7
const NARROW_PX = 700
/** Camera distances from this far are looks at a wide area, which a narrow screen must fit across. */
const WIDE_SHOT = 60
const WIDE_ASPECT = 1.3
const HOLD_HEIGHT = 5
const SPIN_PER_FRAME = 0.45
// Colours of the marks the scene draws over the models come from the EduProstir palette (ui/tokens.css).
const MARKER_COLOR = new Color("#e0185c")
const DONE_COLOR = new Color("#14874a")
const PACKET_COLOR = new Color("#ffd15c")
const PACKET_MS_PER_LEG = 700
/** Width of a marker's label, in centimetres. */
const LABEL_W = 9
const QUARTER = Math.PI / 2
const LEVER_UP = 1.35
const HINT_COLOR = new Color("#ffc247")
const ACCEPT_COLOR = new Color("#ffffff")
/** The slot under the pointer. */
const HOVER_COLOR = new Color("#ff6696")
/** How close two tags with the same name may stand on the screen before one hides: four USB ports get one tag. */
const SAME_TAG_PX = 56
/** Tags that would cover each other go up a row, up to this many rows; the rest hide. */
const TAG_ROWS = 3
const TAG_ROW_PX = 24
const TAG_GAP_PX = 4
/** The note by the pointer keeps this far from the pointer and from the edge of the view. */
const TIP_OFFSET_PX = 16
const TIP_EDGE_PX = 8
/** A part in hand stays this far in front of the model it would go into. */
const HOLD_GAP = 1.5

/** Kinds that sit on a desk as a whole device: an opened box shows one of them. */
/** A fitted look never comes closer than this: a tiny part still shows a little of what is round it. */
const MIN_FIT = 26
/** Only this share of the picture's width and height is used for what must fit: the step card covers its top. */
const FIT_PAD_H = 0.85
const FIT_PAD_V = 0.6

/** How much deeper than the farthest camera distance the camera still draws: the far side of the desk. */
const FAR_MARGIN = 300

type KeyMove = "left" | "right" | "up" | "down" | "in" | "out" | "forward" | "back" | "strafeLeft" | "strafeRight"
/**
 * Keys that move the camera: W A S D fly it over the desk, the arrows turn and tilt it, + and − zoom.
 * Codes match any keyboard layout.
 */
const KEY_MOVES: Readonly<Record<string, KeyMove>> = {
  KeyW: "forward",
  KeyS: "back",
  KeyA: "strafeLeft",
  KeyD: "strafeRight",
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  Equal: "in",
  NumpadAdd: "in",
  "+": "in",
  Minus: "out",
  NumpadSubtract: "out",
  "-": "out",
  PageUp: "in",
  PageDown: "out",
}
/** How fast the camera flies over the desk: this share of its distance from the point it looks at, a second. */
const FLY_SPEED = 0.9
/** Radians a second the camera turns round and tilts while a key is held. */
const TURN_SPEED = 1.6
const TILT_SPEED = 1.0
/** How fast the camera closes in or backs off: the distance grows or shrinks e-fold in 1 / ZOOM_SPEED seconds. */
const ZOOM_SPEED = 1.2
/** The camera never looks straight down: the view would spin round the vertical. */
const MIN_POLAR = 0.08

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
  /** Parts lying on the desk until they are taken: where each one lies and how big it is, for the camera. */
  private readonly loose: Array<{ part: string; mesh: Group; centre: Vector3; radius: number }> = []
  private spinners: Object3D[] | null = null
  private readonly areas: SlotArea[] = []
  private readonly placedMeshes = new Map<string, { slot: string; mesh: Group }>()
  private heldMesh: { part: string; mesh: Group; reach: number } | null = null
  private readonly ray = new Raycaster()
  private readonly pointer = new Vector2()
  private readonly holdHeight: number
  private readonly holdPlane: Plane
  private readonly holdAt: Vector3
  private down: { x: number; y: number } | null = null
  private view: SceneView = { placed: {}, controls: {}, inspected: [], held: null, hint: null, path: null }
  private readonly markers = new Group()
  private markerKey = ""
  private readonly packet: Mesh
  private leverAngle = 0
  private readonly focusTarget = new Vector3()
  private focusFrom = new Vector3()
  private focusing = 0
  /** Camera moves held down on the keyboard now. */
  private readonly keys = new Set<KeyMove>()
  private lastFrame = 0
  private readonly resize: ResizeObserver
  /** Name tags of the slots, over the canvas, and the note by the pointer. */
  private readonly tagLayer: HTMLDivElement
  private readonly tags = new Map<string, HTMLDivElement>()
  private readonly tip: HTMLDivElement
  private hovered: string | null = null
  private hoverAt: { x: number; y: number } | null = null
  private allTags = false

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
    this.tagLayer = document.createElement("div")
    this.tagLayer.className = "edu-pc-tags"
    this.tagLayer.setAttribute("aria-hidden", "true")
    this.tip = document.createElement("div")
    this.tip.className = "edu-pc-tip"
    this.tip.hidden = true
    this.tagLayer.appendChild(this.tip)
    host.appendChild(this.tagLayer)

    const pmrem = new PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    this.scene.background = new Color("#30272e")
    this.scene.add(new HemisphereLight("#ffffff", "#5a4a3a", 0.6))
    const sun = new DirectionalLight("#ffffff", 1.6)
    sun.position.set(-20, 40, 25)
    if (!light) {
      sun.castShadow = true
      sun.shadow.mapSize.set(2048, 2048)
      const reach = layout.bench === "board" ? 22 : Math.max(34, (layout.overview ?? 100) * 0.42, (layout.desk?.[0] ?? 0) / 2)
      Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 10, far: 120 })
      sun.shadow.bias = -0.0005
      sun.shadow.normalBias = 0.03
    }
    this.scene.add(sun)

    this.scene.add(buildDesk(layout.desk))
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
    for (const l of layout.loose ?? []) this.addLoose(l)
    this.bench.add(this.markers)
    this.packet = onTop(new Mesh(new SphereGeometry(0.9, 20, 14), new MeshBasicMaterial({ color: PACKET_COLOR })))
    this.packet.visible = false
    this.bench.add(this.packet)
    for (const prop of layout.props ?? []) {
      const device = deviceModel(prop.kind)
      device.position.set(...prop.at)
      device.rotation.y = prop.yaw ?? 0
      this.propScreens.push(...screensOf(device))
      device.userData.prop = true
      this.scene.add(device)
    }
    this.screens = [...this.propScreens]
    for (const slot of scenario.slots) this.addArea(slot.id, slot.accepts)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.maxPolarAngle = Math.PI * 0.46
    this.controls.minDistance = 10
    this.controls.maxDistance = Math.max(140, (layout.overview ?? 40) * 2.5)
    // the far end of the desk must stay in view from the farthest the camera may go, or it is cut off
    this.camera.far = this.controls.maxDistance + FAR_MARGIN
    this.camera.updateProjectionMatrix()
    const far = (layout.overview ?? 40) / 40
    this.camera.position.set(0, 34 * far, 30 * far)
    this.controls.target.set(0, 0, 0)

    const el = this.renderer.domElement
    el.addEventListener("pointerdown", this.onDown)
    el.addEventListener("pointermove", this.onMove)
    el.addEventListener("pointerup", this.onUp)
    el.addEventListener("pointerleave", this.onLeave)
    el.tabIndex = 0
    el.setAttribute("aria-label", "Тривимірний стіл. W A S D переміщують камеру, стрілки повертають її, + і − наближають і віддаляють")
    el.addEventListener("keydown", this.onKeyDown)
    el.addEventListener("keyup", this.onKeyUp)
    el.addEventListener("blur", this.onBlur)
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
    this.syncPath()
  }

  /** Name tags over every slot (on), or only over the slots that matter now: the hint and where the part in hand fits (off). */
  showAllTags(on: boolean): void {
    this.allTags = on
  }

  /** Glides the camera to look at a point from a comfortable distance and direction; farther on a narrow screen. */
  focus(at: Vec3, distance = 26, view: Vec3 = FRONT_VIEW, bounds?: Bounds, parts: ReadonlyArray<string> = []): void {
    this.focusTarget.set(at[0], at[1], at[2])
    const dir = new Vector3(...view).normalize()
    const box = new Box3()
    if (bounds) box.set(new Vector3(...bounds[0]), new Vector3(...bounds[1]))
    for (const part of parts) for (const obj of this.objectsOf(part)) box.union(new Box3().setFromObject(obj))
    // with something to show, look at its middle and stand back just far enough for all of it; otherwise as far as asked
    if (!box.isEmpty()) box.getCenter(this.focusTarget)
    const far = box.isEmpty()
      ? distance * this.narrowFactor(distance)
      : Math.min(this.controls.maxDistance, Math.max(MIN_FIT, this.fitDistance(box, dir)))
    this.focusFrom = this.focusTarget.clone().addScaledVector(dir, far)
    this.focusing = 1
  }

  /** The distance from the target at which every corner of the box is inside the picture, seen from this direction. */
  private fitDistance(box: Box3, dir: Vector3): number {
    const right = new Vector3(0, 1, 0).cross(dir).normalize()
    if (right.lengthSq() === 0) right.set(1, 0, 0)
    const up = dir.clone().cross(right)
    const tan = Math.tan((this.camera.fov * Math.PI) / 360)
    const tanV = tan * FIT_PAD_V
    const tanH = tan * FIT_PAD_H * Math.max(0.3, this.camera.aspect)
    let need = 0
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) {
          const c = new Vector3(x, y, z).sub(this.focusTarget)
          const depth = c.dot(dir)
          need = Math.max(need, Math.abs(c.dot(right)) / tanH + depth, Math.abs(c.dot(up)) / tanV + depth)
        }
    return need
  }

  /** What shows a part in the scene now: where it lies, its box, the device out of the box, or where it stands. */
  private objectsOf(part: string): Object3D[] {
    const found: Object3D[] = []
    for (const l of this.loose) if (l.part === part && l.mesh.visible) found.push(l.mesh)
    for (const b of this.boxes) if (b.part === part) found.push(...[b.closed, b.open].filter((o): o is Group => o !== null && o.visible))
    const placed = this.placedMeshes.get(part)
    if (placed?.mesh.visible) found.push(placed.mesh)
    if (part === this.layout.benchPart) found.push(this.benchModel)
    return found
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
    } else if ("stop" in target) {
      const at = this.layout.stops?.[target.stop]
      if (!at) return null
      p = this.bench.localToWorld(new Vector3(...at))
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
    el.removeEventListener("pointerleave", this.onLeave)
    el.removeEventListener("keydown", this.onKeyDown)
    el.removeEventListener("keyup", this.onKeyUp)
    el.removeEventListener("blur", this.onBlur)
    this.tagLayer.remove()
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
    this.noDisk?.dispose()
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
    const tag = document.createElement("div")
    tag.className = "edu-pc-tag"
    tag.textContent = this.scenario.slots.find((s) => s.id === id)?.tag ?? this.slotLabel(id)
    tag.hidden = true
    this.tagLayer.appendChild(tag)
    this.tags.set(id, tag)
  }

  private slotLabel(id: string): string {
    return this.scenario.slots.find((s) => s.id === id)?.label ?? id
  }

  /** The parts of this scenario a slot takes, by name: what the note under the pointer says goes there. */
  private takes(accepts: ReadonlyArray<string>): string {
    const names = [...new Set(this.scenario.parts.filter((p) => accepts.includes(p.kind)).map((p) => p.name))]
    return names.join(", ")
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

  /** A part lying on the desk: its lowest point rests at the pose. */
  private addLoose(pose: LoosePose): void {
    const kind = this.scenario.parts.find((p) => p.id === pose.part)?.kind
    if (!kind) return
    const mesh = buildModel(kind, false)
    if (pose.flat) mesh.rotation.z = Math.PI / 2
    mesh.rotation.y = pose.yaw ?? 0
    mesh.updateMatrixWorld(true)
    const box = new Box3().setFromObject(mesh)
    mesh.position.set(pose.at[0], pose.at[1] - box.min.y, pose.at[2])
    mesh.userData.part = pose.part
    this.bench.add(mesh)
    const sphere = box.getBoundingSphere(new Sphere())
    const centre = sphere.center.add(mesh.position)
    this.loose.push({ part: pose.part, mesh, centre, radius: sphere.radius })
  }

  /**
   * Flies the camera to a part the student reads about: where it lies on the desk, its box, the slot
   * it stands in, or the bench itself. False when the part is nowhere in the scene.
   */
  showPart(part: string): boolean {
    const objects = this.objectsOf(part)
    if (objects.length === 0) return false
    const box = new Box3()
    for (const obj of objects) box.union(new Box3().setFromObject(obj))
    const centre = box.getCenter(new Vector3())
    const slot = Object.entries(this.view.placed).find(([, p]) => p.part === part)?.[0]
    const view = (slot ? this.layout.slots[slot]?.view : undefined) ?? FRONT_VIEW
    this.focus([centre.x, centre.y, centre.z], 0, view, [box.min.toArray(), box.max.toArray()])
    return true
  }

  /** Markers of the data path: blue until tapped in turn, green once on the path, joined by arrows. */
  private syncPath(): void {
    const path = this.view.path
    const key = path ? `${path.stops.map((s) => s.id).join()}|${path.picked.join()}` : ""
    if (key === this.markerKey) return
    this.markerKey = key
    for (const child of [...this.markers.children]) {
      this.markers.remove(child)
      child.traverse((o) => {
        if (o instanceof Mesh || o instanceof Sprite) {
          o.geometry.dispose()
          const m = o.material as MeshBasicMaterial | SpriteMaterial
          m.map?.dispose()
          m.dispose()
        }
      })
    }
    if (!path) return
    for (const stop of path.stops) {
      const at = this.layout.stops?.[stop.id]
      if (!at) continue
      const done = path.picked.includes(stop.id)
      const marker = new Group()
      marker.position.set(...at)
      marker.userData.stop = stop.id
      marker.add(onTop(new Mesh(new SphereGeometry(1.1, 20, 14), new MeshBasicMaterial({ color: done ? DONE_COLOR : MARKER_COLOR }))))
      const label = onTop(new Sprite(new SpriteMaterial({ map: signTexture([stop.label], done ? "#116b3c" : "#ba0f4b", "#ffffff") })))
      label.scale.set(LABEL_W, LABEL_W / 4, 1)
      label.position.y = 2.6
      marker.add(label)
      this.markers.add(marker)
    }
    const points = path.picked.flatMap((id) => {
      const at = this.layout.stops?.[id]
      return at ? [new Vector3(...at)] : []
    })
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1]
      const to = points[i]
      if (from && to) this.markers.add(arrow(from, to))
    }
    this.pathPoints = points
  }

  /** Boxes open once their part is read about; the device stands there until it is taken or placed. */
  private syncDesk(): void {
    const placed = new Set(Object.values(this.view.placed).map((p) => p.part))
    for (const box of this.boxes) {
      const opened = this.view.inspected.includes(box.part)
      box.closed.visible = !opened
      if (box.open) box.open.visible = opened && !placed.has(box.part) && this.view.held?.part !== box.part
    }
    for (const l of this.loose) l.mesh.visible = !placed.has(l.part) && this.view.held?.part !== l.part
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
        // how far the model reaches from its origin: that much room it needs in front of a wall
        const reach = new Box3().setFromObject(mesh).getBoundingSphere(new Sphere()).radius
        this.heldMesh = { part: held.part, mesh, reach }
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

  private pathPoints: Vector3[] = []
  private noDisk: CanvasTexture | null = null

  /** A light runs along the laid path, over and over: the data on its way. */
  private animatePath(time: number): void {
    const pts = this.pathPoints
    this.packet.visible = this.view.path !== null && pts.length > 1
    if (!this.packet.visible) return
    const legs = pts.length - 1
    const t = ((time / PACKET_MS_PER_LEG) % legs + legs) % legs
    const i = Math.floor(t)
    const a = pts[i]
    const b = pts[i + 1]
    if (a && b) this.packet.position.lerpVectors(a, b, t - i)
    const next = this.view.hint?.stop
    for (const marker of this.markers.children) {
      if (marker.userData.stop === undefined) continue
      const pulse = marker.userData.stop === next ? 1 + 0.25 * Math.sin(time / 200) : 1
      marker.scale.setScalar(pulse)
    }
  }

  private readonly frame = (time: number): void => {
    const pulse = 0.5 + 0.5 * Math.sin(time / 260)
    const held = this.view.held
    const heldKind = held ? this.kindOf(held.part) : undefined
    const hintSlots = new Set(this.view.hint?.slots ?? [])
    for (const area of this.areas) {
      const accepts = heldKind !== undefined && area.accepts.includes(heldKind)
      const hinted = hintSlots.has(area.id) && (held === null || accepts)
      const hover = this.hovered === area.id
      const fill = area.mesh.material as MeshBasicMaterial
      const line = area.edges.material as LineBasicMaterial
      fill.color.copy(hover ? HOVER_COLOR : hinted ? HINT_COLOR : ACCEPT_COLOR)
      line.color.copy(fill.color)
      fill.opacity = hover ? 0.28 : hinted ? 0.12 + 0.18 * pulse : accepts ? 0.06 : 0
      line.opacity = hover ? 1 : hinted ? 0.5 + 0.5 * pulse : accepts ? 0.35 : 0
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
    this.animatePath(time)
    this.animatePower()
    if (this.heldMesh && held) {
      const m = this.heldMesh.mesh
      m.position.lerp(this.holdAt, 0.35)
      m.position.y = this.holdAt.y + Math.sin(time / 400) * 0.15
      m.rotation.y += (-held.turn * QUARTER - m.rotation.y) * 0.25
    }
    this.steer(time)
    if (this.focusing > 0) {
      this.controls.target.lerp(this.focusTarget, 0.08)
      this.camera.position.lerp(this.focusFrom, 0.08)
      this.focusing = this.camera.position.distanceTo(this.focusFrom) > 0.05 ? 1 : 0
    }
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
    this.syncTags(hintSlots, heldKind)
  }

  /**
   * Name tags over the slots: where the part in hand fits, the next target, the slot under the pointer, or
   * every slot when the student asks. A tag with the same name close by on the screen stays hidden.
   */
  private syncTags(hintSlots: ReadonlySet<string>, heldKind: string | undefined): void {
    const w = this.renderer.domElement.clientWidth
    const h = this.renderer.domElement.clientHeight
    const p = new Vector3()
    const wanted: Array<{ id: string; tag: HTMLDivElement; x: number; y: number; rank: number; fits: boolean; group?: string }> = []
    for (const area of this.areas) {
      const tag = this.tags.get(area.id)
      const pose = this.layout.slots[area.id]
      if (!tag || !pose) continue
      const occupant = this.view.placed[area.id]?.part
      const free = occupant === undefined || occupant === this.view.held?.part
      const fits = heldKind !== undefined && area.accepts.includes(heldKind) && free
      const hover = this.hovered === area.id
      const hint = hintSlots.has(area.id)
      const want = hover || fits || (heldKind === undefined && (hint || (this.allTags && free)))
      p.set(pose.at[0], pose.at[1] + pose.area[1] - 0.3, pose.at[2])
      this.bench.localToWorld(p)
      p.project(this.camera)
      const x = ((p.x + 1) / 2) * w
      const y = ((1 - p.y) / 2) * h
      const onScreen = p.z < 1 && x > -40 && x < w + 40 && y > -20 && y < h + 20
      if (!want || !onScreen) {
        tag.hidden = true
        continue
      }
      // the slot under the pointer first, then the targets, then the rest: the first ones keep their place
      wanted.push({ id: area.id, tag, x, y, rank: hover ? 0 : fits || hint ? 1 : 2, fits, ...(pose.group ? { group: pose.group } : {}) })
    }
    wanted.sort((a, b) => a.rank - b.rank)
    const placed: Array<{ text: string; x: number; y: number; left: number; right: number; row: number; group?: string }> = []
    for (const item of wanted) {
      const { tag, x, y } = item
      const text = tag.textContent ?? ""
      // one tag is enough for the places of one basket: the same name over each of them only piles up
      const sameGroup = (o: { text: string; group?: string }) => item.group !== undefined && o.group === item.group && o.text === text
      if (item.rank > 0 && placed.some((o) => sameGroup(o) || (o.text === text && Math.hypot(o.x - x, o.y - y) < SAME_TAG_PX))) {
        tag.hidden = true
        continue
      }
      tag.hidden = false
      // the width is read once: the text of a tag never changes
      const width = Number(tag.dataset.width) || tag.offsetWidth
      tag.dataset.width = String(width)
      const left = x - width / 2 - TAG_GAP_PX
      const right = x + width / 2 + TAG_GAP_PX
      const row = [...Array(TAG_ROWS).keys()].find(
        (r) => !placed.some((o) => o.row === r && Math.abs(o.y - y) < TAG_ROW_PX && o.left < right && left < o.right)
      )
      if (row === undefined) {
        tag.hidden = true
        continue
      }
      placed.push({ text, x, y, left, right, row, ...(item.group ? { group: item.group } : {}) })
      tag.style.transform = `translate(${x.toFixed(1)}px, ${(y - row * TAG_ROW_PX).toFixed(1)}px) translate(-50%, -100%)`
      tag.classList.toggle("is-raised", row > 0)
      tag.classList.toggle("is-fit", item.fits)
      tag.classList.toggle("is-hint", hintSlots.has(item.id) && !item.fits)
      tag.classList.toggle("is-hover", this.hovered === item.id)
    }
    this.syncTip(heldKind, w, h)
  }

  /** The note by the pointer: the slot's name, what goes there and whether the part in hand fits. */
  private syncTip(heldKind: string | undefined, w: number, h: number): void {
    const area = this.areas.find((a) => a.id === this.hovered)
    if (!area || !this.hoverAt) {
      this.tip.hidden = true
      return
    }
    const occupant = this.view.placed[area.id]?.part
    const taken = occupant !== undefined && occupant !== this.view.held?.part
    const fits = heldKind !== undefined && area.accepts.includes(heldKind)
    const verdict =
      heldKind === undefined ? "" : taken ? "Тут уже стоїть деталь" : fits ? "Сюди підходить те, що в руці" : "Те, що в руці, сюди не підходить"
    const key = `${area.id}|${verdict}`
    if (this.tip.dataset.key !== key) {
      this.tip.dataset.key = key
      this.tip.replaceChildren()
      const name = document.createElement("b")
      name.textContent = this.slotLabel(area.id)
      this.tip.appendChild(name)
      const what = this.takes(area.accepts)
      if (what) {
        const line = document.createElement("span")
        line.textContent = `Для: ${what}`
        this.tip.appendChild(line)
      }
      if (verdict) {
        const line = document.createElement("span")
        line.className = fits && !taken ? "is-yes" : "is-no"
        line.textContent = verdict
        this.tip.appendChild(line)
      }
    }
    this.tip.hidden = false
    // beside the pointer, on the side where it fits in the view
    const tw = this.tip.offsetWidth
    const th = this.tip.offsetHeight
    const right = this.hoverAt.x + TIP_OFFSET_PX
    const below = this.hoverAt.y + TIP_OFFSET_PX
    const x = right + tw + TIP_EDGE_PX > w ? Math.max(TIP_EDGE_PX, this.hoverAt.x - TIP_OFFSET_PX - tw) : right
    const y = below + th + TIP_EDGE_PX > h ? Math.max(TIP_EDGE_PX, this.hoverAt.y - TIP_OFFSET_PX - th) : below
    this.tip.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`
  }

  private poweredOn(): boolean {
    const power = this.layout.power
    if (power === undefined || this.view.controls[power.control] !== power.on) return false
    return Object.entries(power.requires ?? {}).every(([control, value]) => this.view.controls[control] === value)
  }

  /** What the screen shows with the power on: the desktop, nothing, or «disk not found» when a needed part is missing. */
  private picture(): "desktop" | "dark" | "noDisk" {
    const missing = (this.layout.power?.needs ?? []).filter((n) => this.view.placed[n.slot] === undefined)
    if (missing.some((n) => n.screen === "dark")) return "dark"
    return missing.length > 0 ? "noDisk" : "desktop"
  }

  /** The screen shows its picture when the computer is on, and the monitor too when it has its own button. */
  private screenOn(): boolean {
    const screen = this.layout.power?.screen
    return this.poweredOn() && (screen === undefined || this.view.controls[screen.control] === screen.on) && this.picture() !== "dark"
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
    const map = this.picture() === "noDisk" ? (this.noDisk ??= noDiskTexture()) : null
    for (const screen of this.screens) {
      screen.userData.desktop ??= screen.emissiveMap
      const want = map ?? (screen.userData.desktop as typeof screen.emissiveMap)
      if (screen.emissiveMap !== want) {
        screen.emissiveMap = want
        screen.needsUpdate = true
      }
    }
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

  /**
   * The slot area the ray points at. Areas overlap: the socket, the paste and the cooler share one spot, and
   * seen at an angle a tall RAM slot's box covers its neighbour. Prefer areas that take the held part, then
   * the one whose centre is closest to the ray, so a tap lands on the slot the student aimed at.
   */
  private slotHit(): ReturnType<Raycaster["intersectObjects"]>[number] | undefined {
    const hits = this.ray.intersectObjects(this.areas.map((a) => a.mesh), false)
    const heldKind = this.view.held ? this.kindOf(this.view.held.part) : undefined
    const fits = (id: unknown) => this.areas.some((a) => a.id === id && heldKind !== undefined && a.accepts.includes(heldKind))
    const candidates = hits.some((h) => fits(h.object.userData.slot)) ? hits.filter((h) => fits(h.object.userData.slot)) : hits
    const centre = new Vector3()
    const off = (h: (typeof hits)[number]) => this.ray.ray.distanceToPoint(h.object.getWorldPosition(centre))
    return candidates.reduce<(typeof hits)[number] | undefined>((best, h) => (!best || off(h) < off(best) ? h : best), undefined)
  }

  /**
   * Where the part in hand floats: over the desk at the hold height, but in front of a model the pointer
   * is on that rises above it, so a cable held at the standing system unit does not go into it.
   */
  private moveHeld(): void {
    const onPlane = this.ray.ray.intersectPlane(this.holdPlane, new Vector3())
    const solid: Object3D[] = [this.benchModel, ...this.scene.children.filter((o) => o.userData.prop === true)]
    const hit = this.ray.intersectObjects(solid, true).find((h) => h.object.visible)
    const reach = onPlane ? this.ray.ray.origin.distanceTo(onPlane) : Infinity
    const gap = HOLD_GAP + (this.heldMesh?.reach ?? 0)
    if (hit && hit.distance < reach) this.holdAt.copy(this.ray.ray.at(Math.max(0, hit.distance - gap), new Vector3()))
    else if (onPlane) this.holdAt.copy(onPlane)
  }

  private setPointer(e: PointerEvent): void {
    const r = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    this.ray.setFromCamera(this.pointer, this.camera)
  }

  private readonly onDown = (e: PointerEvent): void => {
    this.down = { x: e.clientX, y: e.clientY }
    // a click on the view hands it the keyboard, so the arrows turn the camera
    this.renderer.domElement.focus({ preventScroll: true })
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const move = KEY_MOVES[e.code] ?? KEY_MOVES[e.key]
    if (!move) return
    e.preventDefault()
    this.keys.add(move)
  }

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    const move = KEY_MOVES[e.code] ?? KEY_MOVES[e.key]
    if (move) this.keys.delete(move)
  }

  private readonly onBlur = (): void => {
    this.keys.clear()
  }

  /** While keys are held: flies the camera over the desk, turns and tilts it round the point it looks at, zooms. */
  private steer(time: number): void {
    const dt = Math.min(0.1, Math.max(0, (time - this.lastFrame) / 1000))
    this.lastFrame = time
    if (this.keys.size === 0 || dt === 0) return
    this.focusing = 0
    const k = this.keys
    const offset = this.camera.position.clone().sub(this.controls.target)
    const s = new Spherical().setFromVector3(offset)
    s.theta += ((k.has("left") ? 1 : 0) - (k.has("right") ? 1 : 0)) * TURN_SPEED * dt
    s.phi += ((k.has("down") ? 1 : 0) - (k.has("up") ? 1 : 0)) * TILT_SPEED * dt
    s.phi = Math.min(this.controls.maxPolarAngle, Math.max(MIN_POLAR, s.phi))
    const zoom = (k.has("out") ? 1 : 0) - (k.has("in") ? 1 : 0)
    s.radius = Math.min(this.controls.maxDistance, Math.max(this.controls.minDistance, s.radius * Math.exp(zoom * ZOOM_SPEED * dt)))
    // W A S D fly the camera and the point it looks at together, level over the desk, the way the camera faces
    // the point the camera looks at stays over the desk: it may not fly off into the dark
    const ahead = (k.has("forward") ? 1 : 0) - (k.has("back") ? 1 : 0)
    const aside = (k.has("strafeRight") ? 1 : 0) - (k.has("strafeLeft") ? 1 : 0)
    if (ahead !== 0 || aside !== 0) {
      const forward = new Vector3(-offset.x, 0, -offset.z).normalize()
      const right = new Vector3(-forward.z, 0, forward.x)
      const step = forward.multiplyScalar(ahead).add(right.multiplyScalar(aside)).normalize().multiplyScalar(s.radius * FLY_SPEED * dt)
      const target = this.controls.target
      const [w, d] = this.layout.desk ?? DESK_SIZE
      target.x = Math.min(w / 2, Math.max(-w / 2, target.x + step.x))
      target.z = Math.min(d / 2, Math.max(-d / 2, target.z + step.z))
    }
    this.camera.position.copy(this.controls.target).add(new Vector3().setFromSpherical(s))
  }

  private readonly onMove = (e: PointerEvent): void => {
    // turning the view by hand stops the automatic camera glide; a plain tap does not
    if (this.down && Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > CLICK_PX) this.focusing = 0
    this.setPointer(e)
    // a finger has no hover: the tags over the fitting slots show the names instead
    const hit = e.pointerType === "touch" || this.down ? undefined : this.slotHit()
    const slot = hit?.object.userData.slot
    this.hovered = typeof slot === "string" ? slot : null
    const r = this.renderer.domElement.getBoundingClientRect()
    this.hoverAt = this.hovered ? { x: e.clientX - r.left, y: e.clientY - r.top } : null
    this.renderer.domElement.style.cursor = this.hovered && this.view.held ? "pointer" : ""
    if (this.view.held) this.moveHeld()
  }

  private readonly onLeave = (): void => {
    this.hovered = null
    this.hoverAt = null
  }

  private readonly onUp = (e: PointerEvent): void => {
    const down = this.down
    this.down = null
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_PX) return
    this.setPointer(e)
    if (this.view.held) {
      const hit = this.slotHit()
      const slot = this.freeInGroup(hit?.object.userData.slot)
      if (typeof slot === "string") {
        if (hit) this.holdAt.copy(hit.point)
        this.events.onSlot(slot)
      }
      return
    }
    // markers are drawn over everything, so a tap on one wins over the glass and the parts behind it
    const marker = this.ray.intersectObjects(this.markers.children, true)[0]
    for (let obj: Object3D | null = marker?.object ?? null; obj; obj = obj.parent) {
      if (typeof obj.userData.stop === "string") return this.events.onStop(obj.userData.stop)
    }
    const targets: Object3D[] = [
      ...this.buttons.map((b) => b.mesh),
      ...[...this.placedMeshes.values()].map((p) => p.mesh),
      ...this.boxes.flatMap((b) => (b.open ? [b.closed, b.open] : [b.closed])),
      ...this.loose.map((l) => l.mesh),
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

/** Drawn after everything and through it: a marker must stay visible inside the case and behind the glass. */
const onTop = <T extends Mesh | Sprite>(o: T): T => {
  const m = o.material as MeshBasicMaterial | SpriteMaterial
  m.depthTest = false
  m.transparent = true
  o.renderOrder = 10
  return o
}

/** An arrow from one stop to the next: a thin tube and a cone at its end. */
const arrow = (from: Vector3, to: Vector3): Group => {
  const g = new Group()
  const dir = to.clone().sub(from)
  const length = dir.length()
  const material = () => new MeshBasicMaterial({ color: DONE_COLOR })
  const shaft = onTop(new Mesh(new CylinderGeometry(0.28, 0.28, Math.max(0.1, length - 3.4), 10), material()))
  shaft.position.y = (length - 3.4) / 2 + 1.1
  const head = onTop(new Mesh(new ConeGeometry(0.8, 2, 14), material()))
  head.position.y = length - 1.1 - 1
  g.add(shaft, head)
  g.position.copy(from)
  g.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize())
  return g
}
