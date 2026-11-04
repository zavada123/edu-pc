import type { Scenario } from "./scenario.ts";
/**
 * Authoring errors in a scenario, in Ukrainian so a teacher writing one can read them.
 * An empty list means every id is unique and every step points to parts, slots and controls that exist
 * and fit together.
 */
export declare const validateScenario: (scenario: Scenario) => ReadonlyArray<string>;
