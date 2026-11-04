import type { Scenario } from "../core/scenario.ts";
import { grade3Box } from "./grade3-box.ts";
import { grade8Case } from "./grade8-case.ts";
import { grade8Club } from "./grade8-club.ts";
import { grade8Lab } from "./grade8-lab.ts";
/** All scenarios by id. */
export declare const scenarios: Readonly<Record<string, Scenario>>;
export { grade3Box, grade8Case, grade8Club, grade8Lab };
export { faultScenarios } from "./faults.ts";
