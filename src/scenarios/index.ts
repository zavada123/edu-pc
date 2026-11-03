import type { Scenario } from "../core/scenario.ts"
import { grade8Club } from "./grade8-club.ts"

/** All scenarios by id. */
export const scenarios: Readonly<Record<string, Scenario>> = {
  [grade8Club.id]: grade8Club
}

export { grade8Club }
