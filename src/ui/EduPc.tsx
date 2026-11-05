import { useEffect, useMemo, useRef, useState } from "react"
import { currentStep, isDone, slotOf, type BuildState } from "../core/machine.ts"
import type { Part } from "../core/parts.ts"
import { report } from "../core/progress.ts"
import type { Scenario } from "../core/scenario.ts"
import { focusPoint, focusStops } from "../scene/focus.ts"
import { layouts, type SceneLayout } from "../scene/layout.ts"
import type { PcScene, SceneHandle } from "../scene/PcScene.ts"
import { DoneCard, HeldBar, PartInfo, QuestionCard, SortCard, StepCard, StepList, ToastLine, Tray, UpgradeCard } from "./panels.tsx"
import { useFullScreen } from "./fullscreen.ts"
import { useBuild, type BuildCallbacks } from "./useBuild.ts"
import "./tokens.css"
import "./edu-pc.css"

const DONE_DELAY_MS = 2600

/** The board and the parts on it: every exercise shows the board, built or not, so their models always load. */
const ON_BOARD = ["motherboard", "cpu", "cooler", "ram", "m2ssd"] as const

/** The current step still has to put this part somewhere else: it stands elsewhere, or nowhere yet. */
const stillToPlace = (scenario: Scenario, state: BuildState, part: string): boolean => {
  const step = currentStep(scenario, state)
  const allowed = step?.kind === "place" ? step.targets[part] : undefined
  const at = slotOf(state, part)
  return allowed !== undefined && (at === undefined || !allowed.includes(at))
}

export interface EduPcProps extends BuildCallbacks {
  readonly scenario: Scenario
  /** Where the scenario's slots are in 3D. Defaults to the built-in layout for the scenario's id. */
  readonly layout?: SceneLayout
  /** Light glow over the next target. On by default; the student can switch it off. */
  readonly hints?: boolean
  /** Fewer pixels and no antialiasing, for old school computers. */
  readonly lightGraphics?: boolean
  /**
   * A folder with the realistic models of real parts (the GLB files from `public/models`). Without it
   * every part is the simpler model built in code.
   */
  readonly modelsUrl?: string | undefined
  /** Called once the 3D scene has loaded. For automated tests and teacher tools. */
  readonly onSceneReady?: ((scene: SceneHandle) => void) | undefined
  /** Shows «Наступне завдання» on the summary at the end; the page opens the next exercise. */
  readonly onNext?: (() => void) | undefined
  /** Where to start: a saved session (`replay` of its action log). Defaults to the scenario's start. */
  readonly initialState?: BuildState | undefined
}

/** The PC-building trainer: a 3D bench with the steps, the parts tray and the questions around it. */
export const EduPc = ({
  scenario,
  layout,
  hints = true,
  lightGraphics = false,
  modelsUrl,
  onAction,
  onComplete,
  onSceneReady,
  onNext,
  initialState
}: EduPcProps) => {
  const sceneLayout = layout ?? layouts[scenario.id]
  const callbacks = useMemo(() => ({ onAction, onComplete }), [onAction, onComplete])
  const build = useBuild(scenario, callbacks, initialState)
  const { state, step, hint, held } = build
  const [showHints, setShowHints] = useState(hints)
  const [allTags, setAllTags] = useState(false)
  const { full, toggle: toggleFull } = useFullScreen()
  const [sceneError, setSceneError] = useState<string | null>(null)
  const [sceneReady, setSceneReady] = useState(0)
  const [icons, setIcons] = useState<Partial<Record<string, string>>>({})
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<PcScene | null>(null)
  // The scene's click handlers are made once; they call the latest ones through this ref.
  const handlers = useRef(build)
  handlers.current = build
  const onSceneReadyRef = useRef(onSceneReady)
  onSceneReadyRef.current = onSceneReady

  useEffect(() => {
    const host = hostRef.current
    if (!host || !sceneLayout) return
    let cancelled = false
    import("../scene/PcScene.ts")
      .then(async (mod) => {
        // the realistic models load before the scene is made, so every part is drawn with them from the start
        if (modelsUrl) await mod.preloadModels(modelsUrl, [...ON_BOARD, ...scenario.parts.map((p) => p.kind)])
        return mod
      })
      .then(({ PcScene }) => {
        if (cancelled) return
        sceneRef.current = new PcScene(
          host,
          scenario,
          sceneLayout,
          {
            onSlot: (slot) => handlers.current.placeAt(slot),
            onStop: (stop) => handlers.current.act({ type: "pick", stop }),
            // a part the step still has to place is taken into the hand: a device from its basket or its open box
            onInspect: (part) => (stillToPlace(scenario, handlers.current.state, part) ? handlers.current.take(part) : handlers.current.inspect(part)),
            // a lever or a button switches its control to the other value
            onControl: (control) => {
              const current = handlers.current.state.controls[control]
              const other = scenario.controls.find((c) => c.id === control)?.values.find((v) => v !== current)
              if (other !== undefined) handlers.current.act({ type: "set", control, value: other })
            }
          },
          lightGraphics
        )
        setSceneError(null)
        // the first step's camera aim waits for the scene: look again now that it is here
        setSceneReady((n) => n + 1)
        setIcons(sceneRef.current.icons(scenario.parts.map((p) => p.kind)))
        onSceneReadyRef.current?.(sceneRef.current)
      })
      .catch(() => setSceneError("Не вдалося показати 3D. Онови сторінку або спробуй інший браузер."))
    return () => {
      cancelled = true
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [scenario, sceneLayout, lightGraphics, modelsUrl])

  // Let the last action play out in 3D (fans spin up, the monitor lights) before the summary covers it.
  const finished = isDone(scenario, state)
  const [showDone, setShowDone] = useState(false)
  useEffect(() => {
    if (!finished) {
      setShowDone(false)
      return
    }
    const t = window.setTimeout(() => setShowDone(true), DONE_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [finished])

  const shownHint = showHints ? hint : null
  const mistakeNote = build.toast?.tone === "error" ? build.toast.text : undefined
  const cardStep = (step?.kind === "upgrade" || step?.kind === "sort") && !(step.question && !state.answered.includes(step.id))
  const path = step?.kind === "sequence" ? { stops: step.stops, picked: state.picked } : null
  useEffect(() => {
    sceneRef.current?.showAllTags(allTags)
    sceneRef.current?.update({ placed: state.placed, controls: state.controls, inspected: state.inspected, held, hint: shownHint, path })
  })

  useEffect(() => {
    if (!sceneLayout) return
    // look at every place the step fills, so a step with several cables shows all their sockets
    // and where those parts stand now, so a device to move from its basket is in view too
    const slots =
      step?.kind === "place"
        ? [...new Set([...Object.values(step.targets).flat(), ...Object.keys(step.targets).flatMap((p) => slotOf(state, p) ?? [])])]
        : hint.slots
    const [at, distance, view] = step?.kind === "sequence"
      ? focusStops(sceneLayout, step.stops.map((s) => s.id))
      : (finished || (step?.look === "result" && !!step.question && !state.answered.includes(step.id))) && sceneLayout.finale ? [sceneLayout.finale.at, sceneLayout.finale.distance, sceneLayout.finale.view] : focusPoint(sceneLayout, slots, hint.control?.id, step?.kind === "set" ? Object.keys(step.otherControls ?? {}) : [])
    // wait a frame: on the first render the scene module is still loading
    const t = window.setTimeout(() => {
      // a part the student reads about: the camera flies to it; once the card is closed, back to the step
      if (build.info && sceneRef.current?.showPart(build.info)) return
      sceneRef.current?.focus(at, distance, view)
    }, 60)
    return () => window.clearTimeout(t)
    // Focus once per step, not on every hint change inside a step: hint is left out on purpose.
    // and once more after the step's question: a look at the symptom, then at the button to press
  }, [state.step, state.answered.length, sceneLayout, sceneError, sceneReady, build.info])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!handlers.current.held) return
      if (e.key === "q" || e.key === "Q" || e.key === "й" || e.key === "Й") handlers.current.rotate(-1)
      else if (e.key === "e" || e.key === "E" || e.key === "у" || e.key === "У") handlers.current.rotate(1)
      else if (e.key === "Escape") {
        // the part goes back to the tray; the same Esc does not also leave the full screen
        e.preventDefault()
        handlers.current.putBack()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  if (!sceneLayout) return <p className="edu-pc-error">Для завдання «{scenario.title}» немає 3D-розкладки.</p>

  // On a switch or a question, a part a later step puts in place stays out of the tray: in a fault
  // exercise the loose cable would give the answer away before the student has thought about it.
  const later = new Set(
    step?.kind === "inspect" || step?.kind === "place"
      ? []
      : scenario.steps.slice(state.step + 1).flatMap((s) => (s.kind === "place" ? Object.keys(s.targets) : []))
  )
  const trayParts = scenario.parts.filter(
    (p) => (slotOf(state, p.id) === undefined || stillToPlace(scenario, state, p.id)) && !later.has(p.id)
  )
  const heldPart = held ? scenario.parts.find((p) => p.id === held.part) : undefined
  const infoPart = build.info ? scenario.parts.find((p) => p.id === build.info) : undefined
  const question = step?.question && !state.answered.includes(step.id) ? step.question : undefined

  const pick = (part: Part) => {
    if (step?.kind === "inspect" || part.id === sceneLayout.benchPart) build.inspect(part.id)
    else build.take(part.id)
  }

  return (
    <div className={`edu-pc${full ? " is-full" : ""}`}>
      <header className="edu-pc-head">
        <h1 className="edu-pc-title">
          {scenario.grade > 0 && <span className="edu-pc-grade">{scenario.grade} клас</span>}
          {scenario.title}
        </h1>
        <div className="edu-pc-tools">
          <label className="edu-pc-switch">
            <input type="checkbox" checked={allTags} onChange={(e) => setAllTags(e.target.checked)} />
            Назви гнізд
          </label>
          <label className="edu-pc-switch">
            <input type="checkbox" checked={showHints} onChange={(e) => setShowHints(e.target.checked)} />
            Підказки
          </label>
          <button
            type="button"
            className="edu-pc-full"
            aria-pressed={full}
            aria-label={full ? "Вийти з повного екрана" : "На весь екран"}
            onClick={toggleFull}
            title={full ? "Вийти з повного екрана (Esc)" : "На весь екран"}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d={full ? "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" : "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="edu-pc-full-text">{full ? "Згорнути" : "На весь екран"}</span>
          </button>
        </div>
      </header>
      <div className="edu-pc-body">
        <nav className="edu-pc-side">
          {state.step === 0 && state.inspected.length === 0 && (
            <div className="edu-pc-story">
              {scenario.story.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          )}
          <StepList scenario={scenario} state={state} />
        </nav>
        <div className="edu-pc-stage">
          <div className="edu-pc-view" ref={hostRef} />
          {sceneError && <p className="edu-pc-error">{sceneError}</p>}
          <p className="edu-pc-keys" aria-hidden="true">
            Камера: перетягни мишею або стрілки, W A S D; наблизити + і −
          </p>
          {/* one message at a time: a part's card stands in for the step card until it is closed */}
          {infoPart ? (
            <PartInfo part={infoPart} onClose={() => build.setInfo(null)} />
          ) : (
            step && <StepCard step={step} index={state.step} total={scenario.steps.length} />
          )}
          {/* a card that shows the mistake itself needs no second copy of it */}
          <ToastLine toast={(cardStep && mistakeNote) || infoPart ? null : build.toast} />
        </div>
      </div>
      <footer className="edu-pc-foot">
        {heldPart ? (
          <HeldBar part={heldPart} onTurn={build.rotate} onPutBack={build.putBack} />
        ) : (
          <Tray
            parts={trayParts}
            held={held}
            highlighted={shownHint?.parts ?? []}
            benchPart={sceneLayout.benchPart}
            icons={icons}
            onPick={pick}
          />
        )}
      </footer>
      {!question && step?.kind === "upgrade" && (
        <UpgradeCard key={step.id} step={step} note={mistakeNote} onCheck={(choose) => build.act({ type: "upgrade", choose })} />
      )}
      {!question && step?.kind === "sort" && (
        <SortCard step={step} sorted={state.sorted} note={mistakeNote} onSort={(item, memory) => build.act({ type: "sort", item, memory })} />
      )}
      {question && step && <QuestionCard step={step} question={question} onAnswer={(answer) => build.act({ type: "answer", answer })} />}
      {showDone && <DoneCard result={report(scenario, state)} goals={scenario.goals ?? {}} onRestart={build.restart} onNext={onNext} />}
    </div>
  )
}
