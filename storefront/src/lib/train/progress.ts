// What the typing trainer remembers: the best speed on each test, keyed by
// level id ("home-rest", ...) and "test" for the 10-word test. Which levels
// are open is worked out from those scores, so adding or reordering levels
// never strands anyone. Kept in the browser (localStorage) for everyone, and
// in the customer's metadata (under PROGRESS_KEY) when they are signed in, so
// a top score follows the account. Both copies are merged by taking the
// better of each, so practising signed out is never lost by signing in.
import { LEVELS, PASS_WPM } from "./levels"

export const PROGRESS_KEY = "kebe_trainer"
export const STORAGE_KEY = "kebe-trainer"

export type Progress = { best: Record<string, number> }

export const EMPTY_PROGRESS: Progress = { best: {} }

const KEYS = new Set(["test", ...LEVELS.map((l) => l.id)])
// Faster than anyone has typed: a result above it is not a score.
export const MAX_WPM = 300

// Anything read back from storage or the account is checked field by field.
export function cleanProgress(raw: unknown): Progress {
  const best: Record<string, number> = {}
  const r = raw && typeof raw === "object" ? (raw as { best?: unknown }) : null
  if (r?.best && typeof r.best === "object") {
    for (const [k, v] of Object.entries(r.best as Record<string, unknown>)) {
      if (KEYS.has(k) && typeof v === "number" && v > 0 && v <= MAX_WPM) {
        best[k] = Math.round(v)
      }
    }
  }
  return { best }
}

// Levels 1..openCount are open: every level up to the furthest one passed,
// and the one after it.
export function openCount(p: Progress): number {
  let furthest = 0
  LEVELS.forEach((l) => {
    if ((p.best[l.id] ?? 0) >= PASS_WPM) furthest = l.n
  })
  return Math.min(LEVELS.length, furthest + 1)
}

export function mergeProgress(a: Progress, b: Progress): Progress {
  const best = { ...a.best }
  for (const [k, v] of Object.entries(b.best)) best[k] = Math.max(best[k] ?? 0, v)
  return { best }
}

export function sameProgress(a: Progress, b: Progress): boolean {
  const ka = Object.keys(a.best)
  return (
    ka.length === Object.keys(b.best).length &&
    ka.every((k) => a.best[k] === b.best[k])
  )
}

// One finished test: keep it if it is the best on that test.
export function recordResult(p: Progress, key: string, wpm: number): Progress {
  const rounded = Math.round(wpm)
  if (rounded > MAX_WPM || rounded <= (p.best[key] ?? 0)) return p
  return { best: { ...p.best, [key]: rounded } }
}
