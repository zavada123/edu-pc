import { describe, expect, test } from "vitest"
import { scenarios } from "../scenarios/index.ts"
import { topicGroups, nextScenario, summaryOf, topicOf } from "./catalog.ts"

const all = Object.values(scenarios)

describe("task catalog", () => {
  test("groups the exercises by topic, without grades, and counts the done ones", () => {
    const groups = topicGroups(all, ["grade3-new-box"])
    expect(new Set(groups.map((g) => g.topic)).size).toBe(groups.length)
    expect(groups.find((g) => g.items.some((s) => s.id === "grade3-new-box"))?.done).toBe(1)
    for (const g of groups) expect(g.items.every((s) => topicOf(s) === g.topic)).toBe(true)
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(all.length)
  })

  test("gives every exercise a kind and a line of text for its card", () => {
    for (const s of all) {
      expect(summaryOf(s).length).toBeGreaterThan(10)
      expect(topicOf(s)).toBeTruthy()
    }
    expect(topicOf(scenarios["grade8-fault-hdmi"]!)).toBe("fault")
  })

  test("opens the next exercise not done yet, going round to the start", () => {
    const ids = all.map((s) => s.id)
    expect(nextScenario(all, [], ids[0]!)?.id).toBe(ids[1])
    expect(nextScenario(all, ids.slice(0, -1), ids[ids.length - 1]!)).toBeUndefined()
    expect(nextScenario(all, [ids[1]!], ids[0]!)?.id).toBe(ids[2])
    expect(nextScenario(all, ids.slice(1, -1), ids[ids.length - 1]!)?.id).toBe(ids[0])
  })
})
