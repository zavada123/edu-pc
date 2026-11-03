import { useCallback, useMemo, useState } from "react"
import { apply, currentStep, isDone, startState, type Action, type BuildState, type Outcome } from "../core/machine.ts"
import { turn, type Turn } from "../core/parts.ts"
import { hintFor, report, type Report } from "../core/progress.ts"
import type { Scenario } from "../core/scenario.ts"

export interface Held {
  readonly part: string
  readonly turn: Turn
}

export interface Toast {
  readonly text: string
  readonly tone: "ok" | "error" | "info"
  /** Changes on every toast, so the same text shown twice still restarts its animation. */
  readonly key: number
}

export interface BuildCallbacks {
  /** After every accepted action or mistake: the action, the new state. Save the log to replay it later. */
  readonly onAction?: ((action: Action, state: BuildState) => void) | undefined
  readonly onComplete?: ((result: Report) => void) | undefined
}

/** The trainer's state for React: the build state, the part in hand and the last message. */
export const useBuild = (scenario: Scenario, callbacks: BuildCallbacks) => {
  const [state, setState] = useState<BuildState>(() => startState(scenario))
  const [held, setHeld] = useState<Held | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const say = useCallback((text: string, tone: Toast["tone"]) => setToast({ text, tone, key: Date.now() }), [])

  const act = useCallback(
    (action: Action): Outcome => {
      const outcome = apply(scenario, state, action)
      setState(outcome.state)
      if (outcome.result === "mistake") say(outcome.message, "error")
      else if (outcome.result !== "ok") say(outcome.message, "info")
      else if (outcome.advanced) say(isDone(scenario, outcome.state) ? "Готово!" : "Правильно!", "ok")
      if (outcome.result === "ok" || outcome.result === "mistake") {
        callbacks.onAction?.(action, outcome.state)
        if (outcome.result === "ok" && outcome.advanced && isDone(scenario, outcome.state)) {
          callbacks.onComplete?.(report(scenario, outcome.state))
        }
      }
      return outcome
    },
    [scenario, state, say, callbacks]
  )

  const inspect = useCallback(
    (part: string) => {
      setInfo(part)
      act({ type: "inspect", part })
    },
    [act]
  )

  const take = useCallback((part: string) => {
    setInfo(null)
    setHeld((h) => (h?.part === part ? null : { part, turn: 0 }))
  }, [])

  const rotate = useCallback((by: 1 | -1) => setHeld((h) => (h ? { ...h, turn: turn(h.turn, by) } : h)), [])
  const putBack = useCallback(() => setHeld(null), [])

  const placeAt = useCallback(
    (slot: string) => {
      if (!held) return
      const outcome = act({ type: "place", part: held.part, slot, turn: held.turn })
      if (outcome.result === "ok") setHeld(null)
    },
    [act, held]
  )

  const restart = useCallback(() => {
    setState(startState(scenario))
    setHeld(null)
    setInfo(null)
    setToast(null)
  }, [scenario])

  const step = currentStep(scenario, state)
  const hint = useMemo(() => hintFor(scenario, state), [scenario, state])
  return { state, step, hint, held, toast, info, act, inspect, take, rotate, putBack, placeAt, restart, setInfo }
}
