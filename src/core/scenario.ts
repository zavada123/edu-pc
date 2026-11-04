import type { MemoryKind, Part, PartKind, Turn } from "./parts.ts"

/**
 * A place on the board, in the case or on the desk where a part goes: the CPU socket,
 * a RAM slot, a fan header, a port on the back of the case, a sorting basket.
 */
export interface Slot {
  readonly id: string
  /** The name the student sees: «Слот DIMM A2», «Гніздо HDMI», «Кошик „Показує результат“». */
  readonly label: string
  readonly accepts: ReadonlyArray<PartKind>
  /** The only way a part fits, in quarter turns. Leave out when any turn fits (a basket, a cable). */
  readonly turn?: Turn
}

/** Something the student switches: the socket lever, the side panel, the power button. */
export interface Control {
  readonly id: string
  readonly label: string
  /** Possible values, the first one is the start value unless the scenario sets another. */
  readonly values: ReadonlyArray<string>
}

/** The aim of the lesson a step checks, as in the lesson passport (ціль A, B or C). */
export type Goal = "A" | "B" | "C"

/** A question the student answers before the step's action. Its answer is in the step's explanation. */
export interface Question {
  readonly text: string
  readonly right: string
  readonly wrong: ReadonlyArray<string>
}

/** Own words for a step's mistakes. Each one falls back to a general message (messages.ts). */
export interface StepMessages {
  /** The part fits this kind of slot but not this one: RAM in A1 instead of A2. */
  readonly wrongSlot?: string
  /** The part is turned the wrong way: the CPU's triangle is not in the corner. */
  readonly wrongTurn?: string
  /** A control is not ready: the socket lever is down. */
  readonly notReady?: string
}

interface StepBase {
  readonly id: string
  /** Short title in the step list: «Встав процесор». */
  readonly title: string
  /** What to do and why, in two or three short sentences. */
  readonly explain: string
  readonly goal?: Goal
  readonly question?: Question
  readonly messages?: StepMessages
  /**
   * Where the camera looks while the step's question is open: «result» is the whole computer and its
   * screen (the layout's finale view), to see a symptom before answering.
   */
  readonly look?: "result"
}

/** Click every listed part to read what it does. */
export interface InspectStep extends StepBase {
  readonly kind: "inspect"
  readonly parts: ReadonlyArray<string>
}

/**
 * Put every listed part in one of its allowed slots. One step can hold several parts:
 * two RAM modules, or six devices sorted into baskets.
 */
export interface PlaceStep extends StepBase {
  readonly kind: "place"
  /** Part id → the slots it may go to. */
  readonly targets: Readonly<Record<string, ReadonlyArray<string>>>
  /** Controls that must have these values first: `{ socketLever: "up" }`. */
  readonly requires?: Readonly<Record<string, string>>
}

/** Switch a control to a value: lift the lever, close the panel, press power. */
export interface SetStep extends StepBase {
  readonly kind: "set"
  readonly control: string
  readonly value: string
  /**
   * Other controls a student may reach for by mistake, each with its explanation:
   * the monitor's button instead of the computer's, «the monitor only shows, the system unit thinks».
   */
  readonly otherControls?: Readonly<Record<string, string>>
}

/** A stop on a data path: a place in the computer the student taps, such as the USB port or the RAM. */
export interface Stop {
  readonly id: string
  /** The name on the marker: «ОЗП», «Процесор». */
  readonly label: string
  /** Why going here now is wrong, for a stop that is a likely mistake: the disk before the RAM. */
  readonly why?: string
}

/** Tap the stops in the order the data goes: from the USB port to the RAM, the processor, the screen. */
export interface SequenceStep extends StepBase {
  readonly kind: "sequence"
  /** Every stop shown on the bench, the right ones and the distractors. */
  readonly stops: ReadonlyArray<Stop>
  /** Stop ids in the right order. */
  readonly order: ReadonlyArray<string>
}

/** What a computer has, for the speed model (upgrade.ts). */
export interface PcSpec {
  readonly cores: number
  readonly ghz: number
  readonly cacheMb: number
  readonly ramGb: number
  readonly disk: "hdd" | "ssd"
}

/** A card the student may buy on an upgrade step. */
export interface UpgradeOption {
  readonly id: string
  /** «Процесор: 6 ядер, 3,6 ГГц, кеш 12 МБ». */
  readonly label: string
  readonly cost: number
  readonly change: Partial<PcSpec>
  /** Cards of one group replace the same part: only one processor fits. */
  readonly group?: string
  /** Why a choice with this card is still slow: the explanation of a misconception, such as «speed is only the frequency». */
  readonly why?: string
}

/** Pick cards within a budget so the task gets fast enough. */
export interface UpgradeStep extends StepBase {
  readonly kind: "upgrade"
  readonly base: PcSpec
  readonly options: ReadonlyArray<UpgradeOption>
  readonly budget: number
  /** The longest time the task may take after the upgrade, in minutes. */
  readonly target: number
  /** What the time is of: «монтаж відео». */
  readonly task: string
}

/** Something on the computer the student sorts by where it is kept: lost at power off or kept. */
export interface SortItem {
  readonly id: string
  readonly label: string
  readonly memory: MemoryKind
  /** Shown when it is put in the wrong group. */
  readonly why: string
}

/** Sort things into «lost when the power goes off» (RAM) and «kept» (disk). */
export interface SortStep extends StepBase {
  readonly kind: "sort"
  readonly items: ReadonlyArray<SortItem>
}

export type Step = InspectStep | PlaceStep | SetStep | SequenceStep | UpgradeStep | SortStep

/** One exercise: the parts and places on the desk, how it starts, and the steps in order. */
export interface Scenario {
  readonly id: string
  /** School grade shown on the task card; 0 hides it. */
  readonly grade: number
  readonly title: string
  /** The story the exercise starts with, a sentence per line. */
  readonly story: ReadonlyArray<string>
  readonly parts: ReadonlyArray<Part>
  readonly slots: ReadonlyArray<Slot>
  readonly controls: ReadonlyArray<Control>
  readonly steps: ReadonlyArray<Step>
  /** Short names of the lesson goals for the summary, from the lesson passport: «A: пристрої введення й виведення». */
  readonly goals?: Readonly<Partial<Record<Goal, string>>>
  /** Parts already in place and control values at the start, for scenarios that begin half built. */
  readonly start?: {
    readonly placed?: Readonly<Record<string, string>>
    readonly controls?: Readonly<Record<string, string>>
  }
}
