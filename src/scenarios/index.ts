import type { Scenario } from "../core/scenario.ts"
import { grade3Box } from "./grade3-box.ts"
import { grade8Case } from "./grade8-case.ts"
import { grade8Club } from "./grade8-club.ts"

/** All scenarios by id. */
export const scenarios: Readonly<Record<string, Scenario>> = {
  [grade3Box.id]: grade3Box,
  [grade8Club.id]: grade8Club,
  [grade8Case.id]: grade8Case
}

export { grade3Box, grade8Case, grade8Club }
