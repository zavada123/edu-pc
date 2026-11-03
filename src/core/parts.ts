/**
 * The parts a scenario puts on the desk. A part is data: what it is, what it is called
 * and what it does. The 3D scene draws a part by its `kind`.
 */
export type PartKind =
  | "motherboard"
  | "cpu"
  | "cooler"
  | "thermalPaste"
  | "fanCable"
  | "ram"
  | "m2ssd"
  | "sataSsd"
  | "hdd"
  | "psu"
  | "gpu"
  | "case"
  | "monitor"
  | "keyboard"
  | "mouse"
  | "speakers"
  | "printer"
  | "flashDrive"

/** Where a part keeps data: until power off (`volatile`) or for a long time (`persistent`). */
export type MemoryKind = "volatile" | "persistent"

/** Properties the upgrade and data-path tasks use. All optional: a cooler has none of them. */
export interface PartProps {
  readonly cores?: number
  readonly ghz?: number
  readonly cacheMb?: number
  /** Size in gigabytes: RAM, SSD, HDD. */
  readonly gb?: number
  readonly memory?: MemoryKind
}

export interface Part {
  readonly id: string
  readonly kind: PartKind
  /** The name the student sees: «Процесор», «Модуль оперативної пам'яті». */
  readonly name: string
  /** One or two short sentences on what the part does. Shown when the student inspects it. */
  readonly role: string
  readonly props?: PartProps
}

/** Quarter turns of a part around its vertical axis: 0, 1, 2 or 3. */
export type Turn = 0 | 1 | 2 | 3

const TURNS = 4

/** Turns a part one quarter clockwise (`+1`) or counterclockwise (`-1`). */
export const turn = (current: Turn, by: 1 | -1): Turn => {
  const next = (((current + by) % TURNS) + TURNS) % TURNS
  return next as Turn
}

/** Index of parts by id. Throws on a duplicate id: a scenario with two parts of one id is an authoring error. */
export const indexParts = (parts: ReadonlyArray<Part>): ReadonlyMap<string, Part> => {
  const map = new Map<string, Part>()
  for (const part of parts) {
    if (map.has(part.id)) throw new Error(`Деталь «${part.id}» описана двічі`)
    map.set(part.id, part)
  }
  return map
}
