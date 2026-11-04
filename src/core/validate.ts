import type { Scenario } from "./scenario.ts"

const duplicates = (ids: ReadonlyArray<string>): ReadonlyArray<string> =>
  [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]

/**
 * Authoring errors in a scenario, in Ukrainian so a teacher writing one can read them.
 * An empty list means every id is unique and every step points to parts, slots and controls that exist
 * and fit together.
 */
export const validateScenario = (scenario: Scenario): ReadonlyArray<string> => {
  const errors: string[] = []
  const parts = new Map(scenario.parts.map((p) => [p.id, p]))
  const slots = new Map(scenario.slots.map((s) => [s.id, s]))
  const controls = new Map(scenario.controls.map((c) => [c.id, c]))

  for (const id of duplicates(scenario.parts.map((p) => p.id))) errors.push(`Деталь «${id}» описана двічі`)
  for (const id of duplicates(scenario.slots.map((s) => s.id))) errors.push(`Місце «${id}» описане двічі`)
  for (const id of duplicates(scenario.controls.map((c) => c.id))) errors.push(`Перемикач «${id}» описаний двічі`)
  for (const id of duplicates(scenario.steps.map((s) => s.id))) errors.push(`Крок «${id}» описаний двічі`)

  const controlValue = (where: string, control: string, value: string): void => {
    const c = controls.get(control)
    if (!c) errors.push(`${where}: немає перемикача «${control}»`)
    else if (!c.values.includes(value)) errors.push(`${where}: перемикач «${control}» не має значення «${value}»`)
  }

  for (const [slotId, partId] of Object.entries(scenario.start?.placed ?? {})) {
    if (!slots.has(slotId)) errors.push(`Початок: немає місця «${slotId}»`)
    if (!parts.has(partId)) errors.push(`Початок: немає деталі «${partId}»`)
  }
  for (const [control, value] of Object.entries(scenario.start?.controls ?? {})) controlValue("Початок", control, value)

  for (const step of scenario.steps) {
    const where = `Крок «${step.id}»`
    if (step.question && step.question.wrong.includes(step.question.right)) {
      errors.push(`${where}: правильна відповідь є серед неправильних`)
    }
    if (step.kind === "inspect") {
      for (const p of step.parts) if (!parts.has(p)) errors.push(`${where}: немає деталі «${p}»`)
    }
    if (step.kind === "set") {
      controlValue(where, step.control, step.value)
      for (const control of Object.keys(step.otherControls ?? {})) {
        if (!controls.has(control)) errors.push(`${where}: немає перемикача «${control}»`)
        if (control === step.control) errors.push(`${where}: «${control}» і є потрібний перемикач`)
      }
    }
    if (step.kind === "place") {
      if (Object.keys(step.targets).length === 0) errors.push(`${where}: не вказано жодної деталі`)
      for (const [control, value] of Object.entries(step.requires ?? {})) controlValue(where, control, value)
      for (const [partId, slotIds] of Object.entries(step.targets)) {
        const part = parts.get(partId)
        if (!part) errors.push(`${where}: немає деталі «${partId}»`)
        if (slotIds.length === 0) errors.push(`${where}: для «${partId}» не вказано місць`)
        for (const slotId of slotIds) {
          const slot = slots.get(slotId)
          if (!slot) errors.push(`${where}: немає місця «${slotId}»`)
          else if (part && !slot.accepts.includes(part.kind)) {
            errors.push(`${where}: «${partId}» (${part.kind}) не вставляється в «${slotId}»`)
          }
        }
      }
    }
  }
  return errors
}
