"use client"

import { clx } from "@medusajs/ui"
import { useEffect, useState } from "react"

import { CHAPTERS, chapterOf, isDone, isOpen, Item, same } from "@lib/train/course"
import { LESSONS } from "@lib/train/lessons"
import { LEVELS, starsFor } from "@lib/train/levels"
import { Progress } from "@lib/train/progress"

// The course, beside the stage on a computer and folded above it on a
// phone: five chapters, each its lesson and its levels, with the one being
// played marked, a tick or stars on what is done and a lock on levels not
// yet open. The chapter being played is unfolded; any other unfolds on a
// click. The 10-word test sits at the bottom, open to anyone at any time.

export default function CourseMap({
  item,
  progress,
  onPick,
}: {
  item: Item
  progress: Progress
  onPick: (it: Item) => void
}) {
  const here = chapterOf(item)
  const [unfolded, setUnfolded] = useState(here)
  const [phoneOpen, setPhoneOpen] = useState(false)
  useEffect(() => setUnfolded(here), [here])

  const stars = LEVELS.reduce((n, l) => n + starsFor(progress.best[l.id], l.pass), 0)
  const passed = LEVELS.filter((l) => isDone({ kind: "level", n: l.n }, progress)).length
  const lessons = LESSONS.filter((l) => progress.best[l.id]).length
  const pick = (it: Item) => {
    setPhoneOpen(false)
    onPick(it)
  }
  const test = { kind: "test" } as const

  return (
    <nav aria-label="Course" className="small:sticky small:top-6 small:self-start">
      {/* On a phone: where you are, and the course folded under it. */}
      <button
        aria-expanded={phoneOpen}
        aria-controls="course-list"
        onClick={() => setPhoneOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-kebe-line px-4 py-3 text-left small:hidden"
      >
        <span className="min-w-0">
          <span className="block font-mono text-[11px] uppercase tracking-[0.14em] text-kebe-muted">
            Chapter {here + 1} of {CHAPTERS.length}
          </span>
          <span className="block truncate text-sm text-kebe-text">
            {CHAPTERS[here]?.title ?? "10-word test"} · {label(item)}
          </span>
        </span>
        <span aria-hidden className="text-kebe-muted">
          {phoneOpen ? "▴" : "▾"}
        </span>
      </button>

      <div id="course-list" className={clx(phoneOpen ? "block" : "hidden", "mt-3 small:mt-0 small:block")}>
        <dl className="grid grid-cols-3 divide-x divide-kebe-line rounded-xl border border-kebe-line py-2.5 text-center">
          {(
            [
              ["Lessons", `${lessons}/${LESSONS.length}`],
              ["Levels", `${passed}/${LEVELS.length}`],
              ["Stars", stars],
            ] as const
          ).map(([name, value]) => (
            <div key={name} className="flex flex-col-reverse">
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-kebe-muted">{name}</dt>
              <dd className="font-mono text-[15px] text-kebe-text">
                {name === "Stars" && (
                  <span aria-hidden className="mr-1 text-kebe-warn">
                    ★
                  </span>
                )}
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <ol className="mt-4 space-y-1">
          {CHAPTERS.map((c, ci) => {
            const items = c.items.filter((it) => it.kind !== "test")
            const done = items.filter((it) => isDone(it, progress)).length
            const open = unfolded === ci
            return (
              <li key={c.title}>
                <button
                  aria-expanded={open}
                  aria-label={`Chapter ${ci + 1}, ${c.title}, ${done} of ${items.length} done`}
                  onClick={() => setUnfolded(open ? -1 : ci)}
                  className={clx(
                    "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-kebe-raised",
                    ci === here && "text-kebe-text"
                  )}
                >
                  <Ring done={done} of={items.length} n={ci + 1} current={ci === here} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-tight">{c.title}</span>
                    <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-kebe-muted">
                      {done}/{items.length} done
                    </span>
                  </span>
                </button>
                {open && (
                  <ol className="mb-2 ml-[1.15rem] border-l border-kebe-line pl-3">
                    {items.map((it) => (
                      <Row key={key(it)} it={it} item={item} progress={progress} onPick={pick} />
                    ))}
                  </ol>
                )}
              </li>
            )
          })}
        </ol>

        <ul className="mt-3 border-t border-kebe-line pt-3">
          <Row it={test} item={item} progress={progress} onPick={pick} />
        </ul>
      </div>
    </nav>
  )
}

const key = (it: Item) => (it.kind === "lesson" ? `l${it.i}` : it.kind === "level" ? `v${it.n}` : "test")

function label(it: Item) {
  if (it.kind === "lesson") return "Lesson"
  if (it.kind === "test") return "10-word test"
  return `Level ${it.n}: ${LEVELS[it.n - 1].title}`
}

function Row({
  it,
  item,
  progress,
  onPick,
}: {
  it: Item
  item: Item
  progress: Progress
  onPick: (it: Item) => void
}) {
  const current = same(it, item)
  const open = isOpen(it, progress)
  const done = isDone(it, progress)
  const level = it.kind === "level" ? LEVELS[it.n - 1] : null
  const best = level ? progress.best[level.id] : it.kind === "test" ? progress.best.test : undefined
  const stars = level ? starsFor(best, level.pass) : 0
  const name =
    it.kind === "lesson" ? "Lesson" : it.kind === "test" ? "10-word test" : level!.title
  const status = !open
    ? `locked: pass level ${it.kind === "level" ? it.n - 1 : ""} to open`
    : level
    ? best
      ? `best ${best} wpm, ${stars} of 3 stars`
      : `pass at ${level.pass} wpm`
    : it.kind === "test"
    ? best
      ? `top ${best} wpm`
      : "not taken yet"
    : done
    ? "done"
    : "not done yet"
  return (
    <li>
      <button
        disabled={!open}
        aria-current={current ? "step" : undefined}
        aria-label={`${label(it)}, ${status}`}
        title={`${label(it)}: ${status}`}
        onClick={() => {
          onPick(it)
          // Typing goes to the stage, not this button.
          requestAnimationFrame(() =>
            document.querySelector<HTMLElement>("[data-play]")?.focus({ preventScroll: true })
          )
        }}
        className={clx(
          "flex min-h-[32px] w-full items-center gap-2.5 rounded-md px-2 text-left text-sm transition-colors",
          current
            ? "bg-kebe-good/15 text-kebe-text ring-1 ring-kebe-good"
            : open
            ? "text-kebe-text/85 hover:bg-kebe-raised hover:text-kebe-text"
            : // Muted, not faint: a locked level's name still has to be read (4.5:1).
              "cursor-not-allowed text-kebe-muted"
        )}
      >
        <span aria-hidden className="w-4 shrink-0 text-center text-xs">
          {!open ? "🔒︎" : done ? <span className="text-kebe-good">✓</span> : current ? "▸" : "·"}
        </span>
        <span className={clx("min-w-0 flex-1 truncate", it.kind === "level" && "font-mono text-[13px]")}>
          {name}
        </span>
        {level && best ? (
          <span aria-hidden className="shrink-0 text-[10px] tracking-[0.06em]">
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < stars ? "text-kebe-warn" : "text-kebe-faint"}>
                ★
              </span>
            ))}
          </span>
        ) : it.kind === "test" && best ? (
          <span aria-hidden className="shrink-0 font-mono text-[11px] text-kebe-muted">
            {best} wpm
          </span>
        ) : null}
      </button>
    </li>
  )
}

// A chapter's number in a ring that fills as its lesson and levels are done.
function Ring({ done, of, n, current }: { done: number; of: number; n: number; current: boolean }) {
  const r = 11
  const c = 2 * Math.PI * r
  return (
    <span aria-hidden className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center">
      <svg viewBox="0 0 28 28" className="absolute inset-0 -rotate-90">
        <circle cx="14" cy="14" r={r} fill="none" className="stroke-kebe-line" strokeWidth="2.5" />
        <circle
          cx="14"
          cy="14"
          r={r}
          fill="none"
          className="stroke-kebe-good"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${(done / of) * c} ${c}`}
        />
      </svg>
      <span className={clx("font-mono text-[11px]", current ? "text-kebe-text" : "text-kebe-muted")}>{n}</span>
    </span>
  )
}
