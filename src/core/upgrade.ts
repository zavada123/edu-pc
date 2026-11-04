import type { PcSpec, UpgradeOption, UpgradeStep } from "./scenario.ts"

/** Work in a video montage, in «gigahertz-core minutes»: what one core at 1 GHz would need. */
const MONTAGE_WORK = 60
/** Extra cores help less and less: part of the work cannot be shared. */
const CORE_POWER = 0.85
const MAX_USEFUL_CORES = 8
/** A bigger cache keeps more data next to the cores. */
const CACHE_GAIN_PER_MB = 1 / 40
/** With too little RAM the computer swaps to the disk. */
const RAM_ENOUGH_GB = 8
const SWAP_SLOWDOWN = 1.6
/** Loading the footage and writing the result: the disk's own part. */
const DISK_MINUTES: Readonly<Record<PcSpec["disk"], number>> = { hdd: 6, ssd: 1 }

/**
 * How long a video montage takes on this computer, in minutes. A teaching model, not a benchmark:
 * more cores and a higher frequency speed up the processor's part, a bigger cache a little, too little
 * RAM slows everything down, and a hard disk adds time for loading and saving.
 */
export const montageMinutes = (pc: PcSpec): number => {
  const cpu = pc.ghz * Math.min(pc.cores, MAX_USEFUL_CORES) ** CORE_POWER * (1 + pc.cacheMb * CACHE_GAIN_PER_MB)
  const swap = pc.ramGb < RAM_ENOUGH_GB ? SWAP_SLOWDOWN : 1
  return (MONTAGE_WORK / cpu) * swap + DISK_MINUTES[pc.disk]
}

/** The computer after the chosen cards. */
export const upgraded = (base: PcSpec, chosen: ReadonlyArray<UpgradeOption>): PcSpec =>
  chosen.reduce<PcSpec>((pc, option) => ({ ...pc, ...option.change }), base)

/** Rounds minutes the way the student sees them: «14,6 хв». */
export const formatMinutes = (minutes: number): string =>
  `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1).replace(".", ",")} хв`

export type UpgradeVerdict =
  | { readonly ok: true; readonly minutes: number }
  | { readonly ok: false; readonly reason: "overBudget" | "sameGroup" | "tooSlow"; readonly minutes: number; readonly why?: string }

/** Checks a choice of cards on an upgrade step: the budget, one card per part, and the time. */
export const judgeUpgrade = (step: UpgradeStep, ids: ReadonlyArray<string>): UpgradeVerdict => {
  const chosen = step.options.filter((o) => ids.includes(o.id))
  const minutes = montageMinutes(upgraded(step.base, chosen))
  if (chosen.reduce((sum, o) => sum + o.cost, 0) > step.budget) return { ok: false, reason: "overBudget", minutes }
  const groups = chosen.flatMap((o) => (o.group ? [o.group] : []))
  if (new Set(groups).size < groups.length) return { ok: false, reason: "sameGroup", minutes }
  if (minutes > step.target) {
    const why = chosen.find((o) => o.why !== undefined)?.why
    return why === undefined ? { ok: false, reason: "tooSlow", minutes } : { ok: false, reason: "tooSlow", minutes, why }
  }
  return { ok: true, minutes }
}

/** The cheapest choice that passes, for the solution and for checking a scenario can be done. */
export const cheapestUpgrade = (step: UpgradeStep): ReadonlyArray<string> | undefined => {
  const n = step.options.length
  let best: { ids: string[]; cost: number } | undefined
  for (let mask = 0; mask < 1 << n; mask++) {
    const picked = step.options.filter((_, i) => (mask >> i) & 1)
    const ids = picked.map((o) => o.id)
    const cost = picked.reduce((sum, o) => sum + o.cost, 0)
    if (judgeUpgrade(step, ids).ok && (!best || cost < best.cost)) best = { ids, cost }
  }
  return best?.ids
}
