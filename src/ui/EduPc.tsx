import { useEffect, useMemo, useRef, useState } from "react"
import { isDone, slotOf } from "../core/machine.ts"
import type { Part } from "../core/parts.ts"
import { report } from "../core/progress.ts"
import type { Scenario } from "../core/scenario.ts"
import { focusPoint } from "../scene/focus.ts"
import { layouts, type SceneLayout } from "../scene/layout.ts"
import type { PcScene, SceneHandle } from "../scene/PcScene.ts"
import { DoneCard, HeldBar, PartInfo, QuestionCard, StepCard, StepList, ToastLine, Tray } from "./panels.tsx"
import { useBuild, type BuildCallbacks } from "./useBuild.ts"
import "./edu-pc.css"

const DONE_DELAY_MS = 2600

export interface EduPcProps extends BuildCallbacks {
  readonly scenario: Scenario
  /** Where the scenario's slots are in 3D. Defaults to the built-in layout for the scenario's id. */
  readonly layout?: SceneLayout
  /** Light glow over the next target. On by default; the student can switch it off. */
  readonly hints?: boolean
  /** Fewer pixels and no antialiasing, for old school computers. */
  readonly lightGraphics?: boolean
  /** Called once the 3D scene has loaded. For automated tests and teacher tools. */
  readonly onSceneReady?: ((scene: SceneHandle) => void) | undefined
}

/** The PC-building trainer: a 3D bench with the steps, the parts tray and the questions around it. */
export const EduPc = ({
  scenario,
  layout,
  hints = true,
  lightGraphics = false,
  onAction,
  onComplete,
  onSceneReady
}: EduPcProps) => {
  const sceneLayout = layout ?? layouts[scenario.id]
  const callbacks = useMemo(() => ({ onAction, onComplete }), [onAction, onComplete])
  const build = useBuild(scenario, callbacks)
  const { state, step, hint, held } = build
  const [showHints, setShowHints] = useState(hints)
  const [sceneError, setSceneError] = useState<string | null>(null)
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
      .then(({ PcScene }) => {
        if (cancelled) return
        sceneRef.current = new PcScene(
          host,
          scenario,
          sceneLayout,
          {
            onSlot: (slot) => handlers.current.placeAt(slot),
            onInspect: (part) => handlers.current.inspect(part),
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
        setIcons(sceneRef.current.icons(scenario.parts.map((p) => p.kind)))
        onSceneReadyRef.current?.(sceneRef.current)
      })
      .catch(() => setSceneError("Не вдалося показати 3D. Онови сторінку або спробуй інший браузер."))
    return () => {
      cancelled = true
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [scenario, sceneLayout, lightGraphics])

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
  useEffect(() => {
    sceneRef.current?.update({ placed: state.placed, controls: state.controls, held, hint: shownHint })
  })

  useEffect(() => {
    if (!sceneLayout) return
    // look at every place the step fills, so a step with several cables shows all their sockets
    const slots = step?.kind === "place" ? [...new Set(Object.values(step.targets).flat())] : hint.slots
    const [at, distance, view] = finished && sceneLayout.finale ? [sceneLayout.finale.at, sceneLayout.finale.distance, sceneLayout.finale.view] : focusPoint(sceneLayout, slots, hint.control?.id)
    // wait a frame: on the first render the scene module is still loading
    const t = window.setTimeout(() => sceneRef.current?.focus(at, distance, view), 60)
    return () => window.clearTimeout(t)
    // Focus once per step, not on every hint change inside a step: hint is left out on purpose.
  }, [state.step, sceneLayout, sceneError])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!handlers.current.held) return
      if (e.key === "q" || e.key === "Q" || e.key === "й" || e.key === "Й") handlers.current.rotate(-1)
      else if (e.key === "e" || e.key === "E" || e.key === "у" || e.key === "У") handlers.current.rotate(1)
      else if (e.key === "Escape") handlers.current.putBack()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  if (!sceneLayout) return <p className="edu-pc-error">Для завдання «{scenario.title}» немає 3D-розкладки.</p>

  const trayParts = scenario.parts.filter((p) => slotOf(state, p.id) === undefined)
  const heldPart = held ? scenario.parts.find((p) => p.id === held.part) : undefined
  const infoPart = build.info ? scenario.parts.find((p) => p.id === build.info) : undefined
  const question = step?.question && !state.answered.includes(step.id) ? step.question : undefined

  const pick = (part: Part) => {
    if (step?.kind === "inspect" || part.id === sceneLayout.benchPart) build.inspect(part.id)
    else build.take(part.id)
  }

  return (
    <div className="edu-pc">
      <header className="edu-pc-head">
        <h1 className="edu-pc-title">
          {scenario.grade > 0 && <span className="edu-pc-grade">{scenario.grade} клас</span>}
          {scenario.title}
        </h1>
        <label className="edu-pc-switch">
          <input type="checkbox" checked={showHints} onChange={(e) => setShowHints(e.target.checked)} />
          Підказки
        </label>
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
          {step && <StepCard step={step} index={state.step} total={scenario.steps.length} />}
          {infoPart && <PartInfo part={infoPart} onClose={() => build.setInfo(null)} />}
          <ToastLine toast={build.toast} />
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
      {question && step && <QuestionCard step={step} question={question} onAnswer={(answer) => build.act({ type: "answer", answer })} />}
      {showDone && <DoneCard result={report(scenario, state)} onRestart={build.restart} />}
    </div>
  )
}
