import { describe, expect, test } from "vitest"
import { apply, isDone, replay, startState } from "../core/machine.ts"
import { hintFor, report, solution } from "../core/progress.ts"
import { validateScenario } from "../core/validate.ts"
import { grade8Case, grade8Club, scenarios } from "./index.ts"

describe.each(Object.values(scenarios))("scenario $id", (scenario) => {
  test("has no authoring errors", () => {
    expect(validateScenario(scenario)).toEqual([])
  })

  test("its solution finishes it without mistakes, and every action is accepted", () => {
    let state = startState(scenario)
    for (const action of solution(scenario)) {
      const outcome = apply(scenario, state, action)
      expect(outcome.result, JSON.stringify(action)).toBe("ok")
      state = outcome.state
    }
    expect(isDone(scenario, state)).toBe(true)
    expect(state.mistakes).toBe(0)
  })

  test("every question has its right answer and at least one wrong one", () => {
    for (const step of scenario.steps) {
      if (step.question) expect(step.question.wrong.length).toBeGreaterThan(0)
    }
  })
})

describe("grade 8 club", () => {
  test("RAM in A1 is a mistake with the dual-channel explanation", () => {
    const actions = solution(grade8Club)
    const ramAt = actions.findIndex((a) => a.type === "place" && a.part === "ram1")
    const before = replay(grade8Club, actions.slice(0, ramAt))
    const outcome = apply(grade8Club, before, { type: "place", part: "ram1", slot: "dimmA1", turn: 0 })
    expect(outcome.result).toBe("mistake")
    if (outcome.result === "mistake") expect(outcome.message).toContain("A2 і B2")
  })

  test("the cooler cable on SYS_FAN is a mistake", () => {
    const actions = solution(grade8Club)
    const fanAt = actions.findIndex((a) => a.type === "place" && a.part === "coolerCable")
    const before = replay(grade8Club, actions.slice(0, fanAt))
    expect(apply(grade8Club, before, { type: "place", part: "coolerCable", slot: "sysFan", turn: 0 }).result).toBe(
      "mistake"
    )
  })

  test("the hint on the RAM step points to the two right slots", () => {
    const actions = solution(grade8Club)
    const ramAt = actions.findIndex((a) => a.type === "place" && a.part === "ram1")
    const hint = hintFor(grade8Club, replay(grade8Club, actions.slice(0, ramAt)))
    expect(hint.parts).toEqual(["ram1", "ram2"])
    expect(hint.slots).toEqual(["dimmA2", "dimmB2"])
  })

  test("the report counts mistakes by lesson goal", () => {
    const actions = solution(grade8Club)
    const cpuQuestion = actions.findIndex((a) => a.type === "answer")
    const before = replay(grade8Club, actions.slice(0, cpuQuestion))
    const wrong = apply(grade8Club, before, { type: "answer", answer: "Показує зображення на екрані" }).state
    const finished = replay(grade8Club, actions.slice(cpuQuestion), wrong)
    const result = report(grade8Club, finished)
    expect(result.done).toBe(true)
    expect(result.mistakes).toBe(1)
    expect(result.byGoal).toEqual({ B: 1, C: 0 })
    expect(result.steps.find((s) => s.id === "cpu")?.mistakes).toBe(1)
  })
})

describe("validateScenario", () => {
  test("finds a missing slot, a wrong kind and an unknown control", () => {
    const broken = {
      ...grade8Club,
      steps: [
        { id: "a", kind: "place" as const, title: "", explain: "", targets: { cpu: ["nowhere", "m2Slot"] }, requires: { fan: "on" } }
      ]
    }
    expect(validateScenario(broken)).toEqual([
      "Крок «a»: немає перемикача «fan»",
      "Крок «a»: немає місця «nowhere»",
      "Крок «a»: «cpu» (cpu) не вставляється в «m2Slot»"
    ])
  })
})

describe("grade 8 case", () => {
  const before = (part: string) => {
    const actions = solution(grade8Case)
    const at = actions.findIndex((a) => a.type === "place" && a.part === part)
    return replay(grade8Case, actions.slice(0, at))
  }

  test("the graphics card's power cable in the CPU socket is a mistake that tells the two apart", () => {
    const outcome = apply(grade8Case, before("atx"), { type: "place", part: "pcie", slot: "cpuPowerPort", turn: 0 })
    expect(outcome.result).toBe("mistake")
    if (outcome.result === "mistake") expect(outcome.message).toContain("CPU і PCIe")
  })

  test("the monitor on the board's HDMI is a mistake once a graphics card is in", () => {
    const outcome = apply(grade8Case, before("monitor"), { type: "place", part: "monitor", slot: "boardHdmi", turn: 0 })
    expect(outcome.result).toBe("mistake")
    if (outcome.result === "mistake") expect(outcome.message).toContain("відеокарті")
  })

  test("the graphics card in the short PCIe x1 slot is a mistake", () => {
    expect(apply(grade8Case, before("gpu"), { type: "place", part: "gpu", slot: "pcieX1", turn: 0 }).result).toBe("mistake")
  })

  test("the power supply turned round is a mistake", () => {
    const outcome = apply(grade8Case, before("psu"), { type: "place", part: "psu", slot: "psuBay", turn: 2 })
    expect(outcome.result).toBe("mistake")
    if (outcome.result === "mistake") expect(outcome.message).toContain("задній стінці")
  })

  test("the keyboard fits any USB socket", () => {
    for (const slot of ["usb1", "usb2", "usb3", "usb4"]) {
      expect(apply(grade8Case, before("keyboard"), { type: "place", part: "keyboard", slot, turn: 1 }).result).toBe("ok")
    }
  })
})
