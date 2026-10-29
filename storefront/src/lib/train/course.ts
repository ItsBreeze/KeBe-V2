// The trainer as one road (owner, 14 Oct 2026: "you can change the whole
// ui"): five chapters, each a lesson that teaches the rule and then the
// levels that build speed on it, with the 10-word test once every letter and
// the capitals are in. The map, where a visit starts, and every Next button
// follow this order. Lessons and the test are always open; a level opens
// when the one before it is passed, as before.
import { LESSONS } from "./lessons"
import { LEVELS } from "./levels"
import { openCount, Progress } from "./progress"

export type Item = { kind: "lesson"; i: number } | { kind: "level"; n: number } | { kind: "test" }
export type Chapter = { title: string; items: Item[] }

const lesson = (id: string): Item => ({ kind: "lesson", i: LESSONS.findIndex((l) => l.id === id) })
const levelsIn = (...groups: string[]): Item[] =>
  LEVELS.filter((l) => groups.includes(l.group)).map((l) => ({ kind: "level", n: l.n }))

export const CHAPTERS: Chapter[] = [
  { title: "Home row", items: [lesson("learn-home"), ...levelsIn("Home row")] },
  { title: "Top row", items: [lesson("learn-top"), ...levelsIn("Top row")] },
  {
    title: "Bottom row",
    items: [lesson("learn-bottom"), ...levelsIn("Bottom row, right hand", "Bottom row, left hand")],
  },
  { title: "Capitals", items: [lesson("learn-caps"), ...levelsIn("Capitals"), { kind: "test" }] },
  {
    title: "The Breeze's extras",
    items: [lesson("learn-extras"), ...levelsIn("Symbols", "Number row", "Fn layer")],
  },
]

export const ROAD: Item[] = CHAPTERS.flatMap((c) => c.items)

// Every lesson and level is on the road once, in the levels' own order.
const onRoad = ROAD.flatMap((it) => (it.kind === "level" ? [it.n] : []))
if (
  onRoad.length !== LEVELS.length ||
  onRoad.some((n, i) => n !== i + 1) ||
  ROAD.filter((it) => it.kind === "lesson" && it.i >= 0).length !== LESSONS.length
)
  throw new Error("course.ts: the road must hold every lesson once and every level once, in order")

export const same = (a: Item, b: Item) =>
  a.kind === b.kind &&
  (a.kind !== "lesson" || a.i === (b as typeof a).i) &&
  (a.kind !== "level" || a.n === (b as typeof a).n)

export const chapterOf = (it: Item) => CHAPTERS.findIndex((c) => c.items.some((x) => same(x, it)))

export function isDone(it: Item, p: Progress) {
  if (it.kind === "lesson") return !!p.best[LESSONS[it.i].id]
  if (it.kind === "test") return !!p.best.test
  const l = LEVELS[it.n - 1]
  return (p.best[l.id] ?? 0) >= l.pass
}

export const isOpen = (it: Item, p: Progress) => it.kind !== "level" || it.n <= openCount(p)

// Where a visit starts: the first thing on the road not yet done that is
// open, or the test once everything is.
export function resume(p: Progress): Item {
  return ROAD.find((it) => !isDone(it, p) && isOpen(it, p)) ?? { kind: "test" }
}

// What comes after this, if it is open yet.
export function nextAfter(it: Item, p: Progress): Item | null {
  const i = ROAD.findIndex((x) => same(x, it))
  const next = ROAD[i + 1]
  return next && isOpen(next, p) ? next : null
}

// The address of an item, ?at=lesson-2, level-14 or test, so a reload or a
// shared link lands on it (?mode=test as before).
export const atOf = (it: Item) =>
  it.kind === "lesson" ? `lesson-${it.i + 1}` : it.kind === "level" ? `level-${it.n}` : "test"

export function itemFrom(at?: string, mode?: string): Item | null {
  if (mode === "test" || at === "test") return { kind: "test" }
  const m = /^(lesson|level)-(\d+)$/.exec(at ?? "")
  if (!m) return null
  const n = Number(m[2])
  if (m[1] === "lesson") return n >= 1 && n <= LESSONS.length ? { kind: "lesson", i: n - 1 } : null
  return n >= 1 && n <= LEVELS.length ? { kind: "level", n } : null
}
