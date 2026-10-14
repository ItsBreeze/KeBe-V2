"use client"

import { clx } from "@medusajs/ui"
import { Fragment, useEffect, useRef, useState } from "react"

import { KEY_BY_ID, SPACE, spaceAfter, strokeFor, touchName, touchOf } from "@lib/train/layout"
import { coach, Drill, keyOf, label, LESSONS, place, typedChar } from "@lib/train/lessons"
import Board, { FingerKey } from "@modules/train/components/board"

// The Learn tab (lib/train/lessons.ts): a rule, then a test of it. A right
// key moves on; a wrong one flashes red, shows its own legend and gets a
// line saying where the wanted key is by the rule, and the wanted key lights.
// Keys come from the keyboard (any keyboard: see typedChar) or a click on the
// board, so it works on a phone too.

type Mark = "ok" | "miss"
type S = {
  li: number
  si: number
  drill: Drill | null
  pos: number
  marks: Mark[]
  missed: boolean
  hintOn: boolean
  msg: string | null
  start: number | null
  end: number | null
}

const fresh = (li: number, si: number): S => {
  const drill = LESSONS[li].steps[si].drill?.() ?? null
  return { li, si, drill, pos: 0, marks: [], missed: false, hintOn: drill?.hint === 0, msg: null, start: null, end: null }
}

const ALL_LETTERS = Object.values(KEY_BY_ID)
  .filter((k) => k.base && /[a-z',.;]/.test(k.base))
  .map((k) => k.id)

export default function Learn({
  best,
  onScore,
  onLevels,
  onKebe,
  setOnKebe,
}: {
  best: Record<string, number>
  onScore: (id: string, score: number) => void
  onLevels: () => void
  onKebe: boolean
  setOnKebe: (v: boolean) => void
}) {
  // Lesson 1's first step has no random words, so the server's render
  // matches the browser's.
  const [s, setS] = useState<S>(() => fresh(0, 0))
  const [flash, setFlash] = useState<{ keys: string[]; ok: boolean } | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const lesson = LESSONS[s.li]
  const step = lesson.steps[s.si]
  const d = s.drill
  const done = !d || s.pos >= d.text.length
  const want = d && !done ? d.text[s.pos] : null
  const finale = s.li === LESSONS.length - 1 && s.si === lesson.steps.length - 1

  const go =(li: number, si: number) => setS(fresh(li, si))

  // Back again: start at the first lesson not yet done, once the stored
  // progress has arrived, unless the learner has already begun.
  const resumed = useRef(false)
  useEffect(() => {
    if (resumed.current || !Object.keys(best).length) return
    resumed.current = true
    const i = LESSONS.findIndex((l) => !best[l.id])
    if (i > 0 && s.li === 0 && s.si === 0 && s.pos === 0) go(i, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [best])
  const next = () => {
    if (s.si < lesson.steps.length - 1) go(s.li, s.si + 1)
    else if (s.li < LESSONS.length - 1) go(s.li + 1, 0)
    else onLevels()
  }

  function press(got: string, id?: string) {
    if (!d || !want) return
    const wanted = want === " " ? [SPACE.left, SPACE.right] : strokeFor(want)?.keys ?? []
    const ok = id ? wanted.includes(id) : got === want
    const t = performance.now()
    const keys = id
      ? [id]
      : got === " "
      ? spaceAfter(d.text[s.pos - 1]).keys
      : strokeFor(got)?.keys ?? []
    setFlash({ keys, ok })
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 220)
    setS((c) => {
      if (c.drill !== d || c.pos !== s.pos) return c
      if (!ok) return { ...c, missed: true, hintOn: true, msg: coach(got, want, d.show === "where") }
      const pos = c.pos + 1
      return {
        ...c,
        pos,
        // Lit by a pause counts as help, like a miss.
        marks: [...c.marks, c.missed || (c.hintOn && d.hint > 0) ? "miss" : "ok"],
        missed: false,
        hintOn: d.hint === 0,
        msg: null,
        start: c.start ?? t,
        end: pos === d.text.length ? t : null,
      }
    })
  }

  // The next key lights by itself after the drill's pause.
  useEffect(() => {
    if (!d || done || s.hintOn || !Number.isFinite(d.hint)) return
    const t = setTimeout(() => setS((c) => (c.drill === d ? { ...c, hintOn: true } : c)), d.hint)
    return () => clearTimeout(t)
  }, [d, done, s.pos, s.hintOn])

  // A lesson counts once its last step is done: the share of keys found
  // on your own (no miss, no hint) in that step, or 100 for a step that
  // only reads.
  const ok = s.marks.filter((m) => m === "ok").length
  useEffect(() => {
    if (s.si !== LESSONS[s.li].steps.length - 1 || !done) return
    onScore(LESSONS[s.li].id, s.marks.length ? Math.max(1, Math.round((100 * ok) / s.marks.length)) : 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.li, s.si, done])

  // Keys, from anywhere on the page except other controls' own Space and
  // Enter (the same rule as the levels).
  const live = { press, next, done, restart: () => go(s.li, s.si), onKebe, setOnKebe, want, where: d?.show === "where" }
  const state = useRef(live)
  state.current = live
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return
      const el = e.target as HTMLElement
      if (el !== document.body && !el.closest?.("[data-trainer]")) return
      if (el.closest?.("input, select, textarea")) return
      const onControl = el !== document.body && !!el.closest?.("button, a")
      const c = state.current
      if (e.key === "Escape") {
        e.preventDefault()
        c.restart()
        return
      }
      if (c.done) {
        if ((e.key === "Enter" || e.key === " ") && !onControl) {
          e.preventDefault()
          c.next()
        }
        return
      }
      if ((e.ctrlKey || e.metaKey || e.altKey) && !e.getModifierState?.("AltGraph")) return
      if (onControl && (e.key === " " || e.key === "Enter")) return
      const placed = typedChar(e, false)
      const sent = typedChar(e, true)
      let ch = c.onKebe ? sent : placed
      // Finding a key by its place, nobody knows its letter yet, so a press
      // that is right one way and wrong the other says which keyboard this
      // is: a KeBe sends its own letters, any other its keys' places.
      if (c.where && placed !== sent && (placed === c.want || sent === c.want)) {
        if ((sent === c.want) !== c.onKebe) c.setOnKebe(sent === c.want)
        ch = c.want!
      }
      if (ch.length !== 1) return
      e.preventDefault()
      c.press(ch)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // ---- the board ------------------------------------------------------------

  const target = want ? keyOf(want) : undefined
  const nextStroke =
    want && s.hintOn
      ? want === " "
        ? spaceAfter(d!.text[s.pos - 1])
        : strokeFor(want)
      : null
  const blind = new Set<string>()
  if (d && !done) {
    const found = d.show === "where" ? d.text.slice(0, s.pos) : ""
    for (const c of d.blind) {
      const k = keyOf(c)
      if (k && !found.includes(c)) blind.add(k.id)
    }
    // A hint shows the key and its legend, except where finding out what a
    // key types is the point.
    if (target && s.hintOn && d.show !== "where") blind.delete(target.id)
  }
  const lit = new Set(d?.lit ?? step.lit ?? ALL_LETTERS)
  const hint =
    want && target && s.hintOn && !s.msg && d!.show !== "where"
      ? want === " "
        ? nextStroke?.name
        : `${label(want)}, ${place(target)}, ${touchName(touchOf(target))}${
            want !== want.toLowerCase() ? ", with Shift" : ""
          }`
      : null
  const secs = s.start !== null && s.end !== null ? (s.end - s.start) / 1000 : 0
  const wpm = secs > 0 && d ? Math.round((d.text.length / 5) * (60 / secs)) : 0

  return (
    <div>
      {/* The lessons, in one row: free to jump between, ticked once done. */}
      <ol aria-label="Lessons" className="mt-4 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {LESSONS.map((l, i) => (
          <li key={l.id} className="shrink-0">
            <button
              aria-current={i === s.li ? "step" : undefined}
              onClick={(e) => {
                e.currentTarget.blur()
                go(i, 0)
              }}
              className={clx(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
                i === s.li
                  ? "border-[#3f9e77] bg-[#3f9e77] text-kebe-page"
                  : best[l.id]
                  ? "border-[#3f9e77]/70 bg-[#3f9e77]/10 text-kebe-text hover:border-[#3f9e77]"
                  : "border-kebe-line text-kebe-muted hover:border-kebe-muted hover:text-kebe-text"
              )}
            >
              <span>{i + 1}</span>
              {l.title}
              {best[l.id] ? <span aria-label=", done">✓</span> : null}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-display text-2xl leading-tight">{step.title}</h2>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kebe-muted">
          Lesson {s.li + 1} · step {s.si + 1}/{lesson.steps.length}
        </p>
      </div>
      <p className="mt-1 max-w-3xl text-sm leading-snug text-kebe-muted">{step.body}</p>

      <p role="status" className="sr-only">
        {s.msg ?? (done && d ? `Done: ${ok} of ${s.marks.length} on your own.` : "")}
      </p>

      <div className="relative mt-3 flex min-h-[128px] flex-col justify-center rounded-2xl border border-kebe-line bg-kebe-raised px-6 py-5 small:px-8">
        {done ? (
          <div className="flex flex-col gap-4 small:flex-row small:items-center small:justify-between">
            <div className="min-w-0">
              {d && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-kebe-muted">
                  <span className="text-kebe-text">{ok}</span> of {s.marks.length} on your own
                  {d.show === "words" && wpm ? (
                    <>
                      {" · "}
                      <span className="text-kebe-text">{wpm}</span> wpm
                    </>
                  ) : null}
                </p>
              )}
              {d?.show === "where" && (
                <p className="mt-1 font-display text-3xl tracking-[0.2em]">
                  {d.text.toUpperCase()}
                </p>
              )}
              {step.after && (
                <p className="mt-1 max-w-xl text-sm leading-snug text-kebe-text/85">{step.after}</p>
              )}
              {!d && !step.after && (
                <p className="max-w-xl text-sm leading-snug text-kebe-text/85">
                  The lit keys are the ones above. The levels teach each of them in turn.
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                onClick={next}
                className="rounded-xl bg-kebe-text px-4 py-2 text-sm font-medium text-kebe-page transition-colors hover:bg-white"
              >
                {finale ? "Start the levels" : s.si < lesson.steps.length - 1 ? "Next" : "Next lesson"}{" "}
                <span className="ml-1 font-mono text-[11px] opacity-60">Enter</span>
              </button>
              {d && (
                <button
                  onClick={() => go(s.li, s.si)}
                  className="rounded-xl border border-kebe-line px-4 py-2 text-sm transition-colors hover:border-kebe-muted"
                >
                  {finale ? "Another sentence" : "Again"}{" "}
                  <span className="ml-1 font-mono text-[11px] opacity-60">Esc</span>
                </button>
              )}
            </div>
          </div>
        ) : d!.show === "words" ? (
          <Text text={d!.text} pos={s.pos} missed={s.missed} />
        ) : (
          <div className="flex flex-col items-center gap-3">
            <p
              className={clx(
                "font-display leading-none",
                d!.show === "which" ? "text-6xl" : "text-3xl",
                s.missed && "text-[#e0705f]"
              )}
            >
              {d!.show === "which" ? want : d!.say?.[s.pos]}
            </p>
            {d!.show === "which" && /[^a-z]/.test(want!) && (
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kebe-muted">
                {label(want!)}
              </p>
            )}
            {/* One slot a key: what it turned out to type, or how it went. */}
            <ol aria-hidden className="flex gap-1.5">
              {d!.text.split("").map((c, i) => (
                <li
                  key={i}
                  className={clx(
                    "flex h-6 min-w-[1.5rem] items-center justify-center rounded border px-1 font-mono text-xs uppercase",
                    i === s.pos
                      ? "border-kebe-text text-kebe-text"
                      : s.marks[i] === "ok"
                      ? "border-[#3f9e77] bg-[#3f9e77]/15 text-kebe-text"
                      : s.marks[i] === "miss"
                      ? "border-[#e3b04b] bg-[#e3b04b]/10 text-kebe-text"
                      : "border-kebe-line text-kebe-faint"
                  )}
                >
                  {d!.show === "where" ? (i < s.pos ? c : "?") : i < s.pos ? c : ""}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <div className="mt-2 flex min-h-[1.25rem] flex-col gap-1 font-mono text-xs tracking-[0.06em] text-kebe-muted small:flex-row small:items-center small:justify-between">
        <p className={clx(s.msg && "text-[#e3b04b]")}>
          {s.msg ?? (done ? "Enter: next · Esc: again" : "Esc: start this step again")}
        </p>
        {hint && (
          <p>
            Next: <span className="text-kebe-text">{hint}</span>
          </p>
        )}
      </div>

      <div className="mt-3">
        <Board
          learned={lit}
          adds={new Set()}
          next={nextStroke}
          flash={flash}
          blind={blind}
          onPress={(id) => {
            const k = KEY_BY_ID[id]
            const ch = id === SPACE.left || id === SPACE.right ? " " : k.base
            if (ch) press(ch, id)
          }}
          className="mx-auto block"
          style={{ width: "min(100%, max(520px, calc((100svh - 540px) * 2.83)))" }}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <FingerKey press={nextStroke ? touchOf(KEY_BY_ID[nextStroke.keys[0]]) : null} />
          <KebeToggle on={onKebe} set={setOnKebe} />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-kebe-muted">
          {onKebe
            ? "Reading the letters your KeBe types."
            : "Any keyboard works: press the key in the same place as on the board, or click the board."}
        </p>
      </div>
    </div>
  )
}

// Which way keys are read (lib/train/lessons.ts typedChar): a KeBe's own
// letters, or any other keyboard's keys by their place.
export function KebeToggle({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-kebe-muted hover:text-kebe-text">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => {
          set(e.target.checked)
          // Typing goes back to the trainer, not the box.
          e.target.blur()
        }}
        className="accent-[#3f9e77]"
      />
      Typing on a KeBe
    </label>
  )
}

// The words to type: done in full ink, the next character marked (red once
// missed), the rest faint. Words wrap whole.
function Text({ text, pos, missed }: { text: string; pos: number; missed: boolean }) {
  let i = 0
  return (
    <p className="flex flex-wrap gap-y-1 font-mono text-[clamp(1.25rem,2.5vw,1.75rem)] leading-relaxed">
      {text.split(" ").map((w, wi) => {
        const at = i
        i += w.length + 1
        const ch = (c: string, j: number) => (
          <span
            key={j}
            className={clx(
              j < pos ? "text-kebe-text" : "text-kebe-text/45",
              j === pos &&
                clx(
                  "rounded-sm underline decoration-2 underline-offset-[6px]",
                  missed ? "text-[#e0705f] decoration-[#e0705f]" : "text-kebe-text decoration-[#3f9e77]"
                )
            )}
          >
            {c === " " ? " " : c}
          </span>
        )
        return (
          <Fragment key={wi}>
            <span className="whitespace-nowrap">{w.split("").map((c, k) => ch(c, at + k))}</span>
            {at + w.length < text.length && ch(" ", at + w.length)}
          </Fragment>
        )
      })}
    </p>
  )
}
