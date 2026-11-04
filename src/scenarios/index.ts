import type { Scenario } from "../core/scenario.ts"
import { faultScenarios } from "./faults.ts"
import { grade3Box } from "./grade3-box.ts"
import { grade8Case } from "./grade8-case.ts"
import { grade8Club } from "./grade8-club.ts"
import { grade8Lab } from "./grade8-lab.ts"

/** All scenarios by id. */
export const scenarios: Readonly<Record<string, Scenario>> = {
  [grade3Box.id]: grade3Box,
  [grade8Club.id]: grade8Club,
  [grade8Case.id]: grade8Case,
  [grade8Lab.id]: grade8Lab,
  ...Object.fromEntries(faultScenarios.map((s) => [s.id, s]))
}

export { grade3Box, grade8Case, grade8Club, grade8Lab }
export { faultScenarios } from "./faults.ts"
