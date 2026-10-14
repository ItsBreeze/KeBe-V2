"use client"

import { clx } from "@medusajs/ui"
import { Fragment, useEffect, useRef, useState } from "react"

import { KEY_BY_ID, SPACE, spaceAfter, strokeFor, touchName, touchOf } from "@lib/train/layout"
import { coach, Drill, keepsKeys, keyOf, label, LESSONS, place, TEXT_FIELD, typedChar } from "@lib/train/lessons"
import Board, { BOARD_WIDTH, FingerKey } from "@modules/train/components/board"

// A lesson on the stage (lib/train/lessons.ts): a guess, then the rule, then
// tests of it. A right key moves on; a wrong one flashes red, shows its own
// legend and gets a line saying where the wanted key is by the rule, and the
// wanted key lights. Keys come from the keyboard (any keyboard: see
// typedChar) or a tap on the board, so it works on a phone too.

type Mark = "ok" | "miss"
type S = {
  si: number
  drill: Drill | null
  pos: number
  marks: Mark[]
  missed: boolean
  tries: number
  hintOn: boolean
  msg: string | null
  picked: number | null
  start: number | null
  end: number | null
}

const fresh = (li: number, si: number): S => {
  const drill = LESSONS[li].steps[si].drill?.() ?? null
  return {
    si,
    drill,
    pos: 0,
    marks: [],
    missed: false,
    tries: 0,
    hintOn: drill?.hint === 0,
    msg: null,
    picked: null,
    start: null,
    end: null,
  }
}

const ALL_LETTERS = Object.values(KEY_BY_ID)
  .filter((k) => k.base && /[a-z',.;]/.test(k.base))
  .map((k) => k.id)

// A finished step ignores keys this long, so a Space or Enter already on its
// way doesn't skip what the step has to say.
const SETTLE = 400

export default function Learn({
  li,
  chapter,
  onScore,
  onNext,
  onKebe,
  setOnKebe,
}: {
  li: number
  chapter: string
  onScore: (id: string, score: number) => void
  onNext: () => void
  onKebe: boolean
  setOnKebe: (v: boolean) => void
}) {
  // A lesson's first step is a guess, with nothing random in it, so the
  // server's render matches the browser's.
  const [s, setS] = useState<S>(() => fresh(li, 0))
  const [flash, setFlash] = useState<{ keys: string[]; ok: boolean } | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const box = useRef<HTMLDivElement>(null)
  const doneAt = useRef(0)
  // Two presses in a row that only one way of reading makes right, before
  // the reading changes: one slip must not switch it.
  const vote = useRef<{ kebe: boolean; n: number }>({ kebe: false, n: 0 })

  const lesson = LESSONS[li]
  const step = lesson.steps[s.si]
  const last = s.si === lesson.steps.length - 1
  const d = s.drill
  const choice = step.choice
  const done = choice ? s.picked !== null : !d || s.pos >= d.text.length
  const want = d && !done ? d.text[s.pos] : null

  const go = (si: number) => setS(fresh(li, si))
  const next = () => (last ? onNext() : go(s.si + 1))

  // Each new step takes the focus (not the first, on arrival), so Space and
  // Enter type here rather than pressing whatever was clicked last.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    box.current?.focus({ preventScroll: true })
  }, [s.si, s.drill])

  useEffect(() => {
    if (done) doneAt.current = performance.now()
  }, [done])

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
      if (!ok)
        return {
          ...c,
          missed: true,
          tries: c.tries + 1,
          hintOn: true,
          msg: coach(got, want, d.show === "where"),
        }
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

  const pick = (i: number) => {
    if (!choice || s.picked !== null) return
    setS((c) => ({ ...c, picked: i }))
    box.current?.focus({ preventScroll: true })
  }

  // The next key lights by itself after the drill's pause.
  useEffect(() => {
    if (!d || done || s.hintOn || !Number.isFinite(d.hint)) return
    const t = setTimeout(() => setS((c) => (c.drill === d ? { ...c, hintOn: true } : c)), d.hint)
    return () => clearTimeout(t)
  }, [d, done, s.pos, s.hintOn])

  // A lesson counts once its last step is done: the share of keys found on
  // your own (no miss, no hint) in that step, or 100 for one with no keys.
  const ok = s.marks.filter((m) => m === "ok").length
  useEffect(() => {
    if (!last || !done) return
    onScore(lesson.id, s.marks.length ? Math.max(1, Math.round((100 * ok) / s.marks.length)) : 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.si, done])

  // Keys, from anywhere on the page except another control's own Space and
  // Enter (the rule the levels follow too).
  const live = {
    press,
    next,
    pick,
    done,
    choice,
    restart: () => go(s.si),
    onKebe,
    setOnKebe,
    want,
    show: d?.show,
  }
  const state = useRef(live)
  state.current = live
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return
      const el = e.target as HTMLElement
      if (el !== document.body && !el.closest?.("[data-trainer]")) return
      if (el.closest?.(TEXT_FIELD)) return
      const onControl = keepsKeys(el)
      const c = state.current
      if (e.key === "Escape") {
        e.preventDefault()
        c.restart()
        return
      }
      if (onControl && (e.key === " " || e.key === "Enter")) return
      if (c.done) {
        // Only Enter moves on: Space after a last word is a habit.
        if (e.key === " ") e.preventDefault()
        // An Enter inside the pause after the last key waits it out rather
        // than being dropped, which read as Enter not working (14 Oct 2026).
        if (e.key === "Enter" && !e.repeat) {
          e.preventDefault()
          const wait = SETTLE - (performance.now() - doneAt.current)
          if (wait > 0) setTimeout(() => state.current.done && state.current.next(), wait)
          else c.next()
        }
        return
      }
      if (c.choice) {
        const n = Number(e.key)
        if (n >= 1 && n <= c.choice.options.length) {
          e.preventDefault()
          c.pick(n - 1)
        }
        return
      }
      if ((e.ctrlKey || e.metaKey || e.altKey) && !e.getModifierState?.("AltGraph")) return
      const placed = typedChar(e, false)
      const sent = typedChar(e, true)
      let ch = c.onKebe ? sent : placed
      // Finding a key by its place, nobody knows its letter yet, so a press
      // that is right one way and wrong the other says which keyboard this
      // is: a KeBe sends its own letters, any other its keys' places.
      if (c.show === "where" && c.want && placed !== sent && (placed === c.want || sent === c.want)) {
        const kebe = sent === c.want
        vote.current = vote.current.kebe === kebe ? { kebe, n: vote.current.n + 1 } : { kebe, n: 1 }
        if (vote.current.n >= 2 && kebe !== c.onKebe) c.setOnKebe(kebe)
        ch = c.want
      }
      if (ch.length !== 1) return
      e.preventDefault()
      // Space between letters is a scroll or a slip, not a miss.
      if (ch === " " && c.show !== "words") return
      c.press(ch)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // ---- the board ------------------------------------------------------------

  const target = want ? keyOf(want) : undefined
  const nextStroke =
    want && s.hintOn ? (want === " " ? spaceAfter(d!.text[s.pos - 1]) : strokeFor(want)) : null
  const blind = new Set<string>()
  const dark = d ? (done ? "" : d.blind) : step.blind ?? ""
  const found = d?.show === "where" ? d.text.slice(0, s.pos) : ""
  for (const c of dark) {
    const k = keyOf(c)
    if (k && !found.includes(c)) blind.add(k.id)
  }
  // A hint shows the key and its legend, except where finding out what a
  // key types is the point.
  if (target && s.hintOn && d?.show !== "where") blind.delete(target.id)
  const lit = new Set(
    choice && s.picked !== null ? choice.shows : d?.lit ?? step.lit ?? ALL_LETTERS
  )
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

  // What a screen reader hears: the prompt, a miss's lesson (a second
  // identical miss is still read), the result.
  const prompt = !want
    ? ""
    : d!.show === "where"
    ? d!.say?.[s.pos] ?? ""
    : d!.show === "which"
    ? `Press ${label(want)}`
    : `Type ${currentWord(d!.text, s.pos)}`
  const announce = s.msg
    ? s.msg + "​".repeat(s.tries % 2)
    : done
    ? choice
      ? `${s.picked === choice.answer ? "Right." : "Not quite."} ${choice.reveal}`
      : `${d ? `${ok} of ${s.marks.length} keys on your own. ` : ""}${step.after ?? ""} Enter for next.`
    : prompt

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kebe-muted">
          {chapter} · Lesson
        </p>
        <ol aria-label={`Step ${s.si + 1} of ${lesson.steps.length}`} className="flex gap-1">
          {lesson.steps.map((_, i) => (
            <li
              key={i}
              aria-hidden
              className={clx(
                "h-1.5 rounded-full transition-all",
                i === s.si ? "w-5 bg-kebe-text" : i < s.si ? "w-1.5 bg-[#3f9e77]" : "w-1.5 bg-kebe-line"
              )}
            />
          ))}
        </ol>
      </div>
      <h2 className="mt-1 font-display text-3xl leading-tight">{step.title}</h2>
      <p className="mt-1 max-w-3xl text-[15px] leading-snug text-kebe-text/75">{step.body}</p>

      <p role="status" className="sr-only">
        {announce}
      </p>

      <div
        ref={box}
        data-play
        tabIndex={-1}
        aria-label={step.act ?? step.title}
        className="relative mt-4 flex min-h-[148px] flex-col justify-center rounded-2xl border border-kebe-line bg-kebe-raised px-5 py-5 outline-none focus-visible:border-kebe-muted small:px-8"
      >
        {choice ? (
          <ChoiceCard
            act={step.act ?? ""}
            options={choice.options}
            answer={choice.answer}
            reveal={choice.reveal}
            picked={s.picked}
            onPick={pick}
            onNext={next}
          />
        ) : done ? (
          <div className="flex flex-col gap-4 small:flex-row small:items-center small:justify-between">
            <div className="min-w-0">
              {d && (
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kebe-muted">
                  <span className="text-kebe-text">{ok}</span> of {s.marks.length} keys on your own
                  {d.show === "words" && wpm ? (
                    <>
                      {" · "}
                      <span className="text-kebe-text">{wpm}</span> wpm
                    </>
                  ) : null}
                </p>
              )}
              {d?.show === "where" && (
                <p className="mt-1 font-display text-3xl tracking-[0.2em]">{d.text.toUpperCase()}</p>
              )}
              {step.after && <p className="mt-1 max-w-xl text-[15px] leading-snug text-kebe-text">{step.after}</p>}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <NextButton onClick={next}>{last ? "Continue" : "Next"}</NextButton>
              {d && (
                <button
                  onClick={() => go(s.si)}
                  className="rounded-xl border border-kebe-line px-4 py-2 text-sm transition-colors hover:border-kebe-muted"
                >
                  Again <kbd className="ml-1 font-mono text-[11px] opacity-60">Esc</kbd>
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {step.act && <p className="mb-3 text-sm text-kebe-muted">{step.act}</p>}
            {d!.show === "words" ? (
              <Text text={d!.text} pos={s.pos} missed={s.missed} page={d!.page} />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p
                  aria-hidden
                  className={clx(
                    "font-display leading-none",
                    d!.show === "which" ? "text-6xl" : "text-3xl",
                    s.missed && "text-[#e0705f]"
                  )}
                >
                  {d!.show === "which" ? want : d!.say?.[s.pos]}
                </p>
                {d!.show === "which" && /[^a-z]/i.test(want!) && (
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kebe-muted">{label(want!)}</p>
                )}
                <Slots text={d!.text} pos={s.pos} marks={s.marks} reveal={d!.show === "where"} />
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-2 flex min-h-[1.5rem] flex-col gap-1 text-[13px] text-kebe-muted small:flex-row small:items-center small:justify-between">
        <p className={clx(s.msg && "text-[#e3b04b]")}>
          {s.msg ??
            (done
              ? "Enter: next · Esc: again"
              : choice
              ? `Press ${choice.options.map((_, i) => i + 1).join(", ")} or click an answer`
              : "Esc: start this step again")}
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
          style={BOARD_WIDTH}
        />
        {/* A phone held upright draws the keys under 24 px. */}
        <p className="mt-2 hidden text-center text-[13px] text-kebe-muted portrait:max-xsmall:block">
          Turn your phone sideways for bigger keys.
        </p>
        <BoardFooter
          press={nextStroke ? touchOf(KEY_BY_ID[nextStroke.keys[0]]) : null}
          onKebe={onKebe}
          setOnKebe={setOnKebe}
        />
      </div>
    </div>
  )
}

const currentWord = (text: string, pos: number) => {
  const start = text.lastIndexOf(" ", pos - 1) + 1
  const end = text.indexOf(" ", pos)
  return text.slice(start, end < 0 ? undefined : end) || "Space"
}

export function NextButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl bg-kebe-text px-4 py-2 text-sm font-medium text-kebe-page transition-colors hover:bg-white"
    >
      {children} <kbd className="ml-1 font-mono text-[11px] opacity-60">Enter</kbd>
    </button>
  )
}

// A guess: the question large, the answers as buttons (or their numbers),
// then whether it was right and why. Any answer goes on: guessing first is
// the point, being right isn't.
function ChoiceCard({
  act,
  options,
  answer,
  reveal,
  picked,
  onPick,
  onNext,
}: {
  act: string
  options: string[]
  answer: number
  reveal: string
  picked: number | null
  onPick: (i: number) => void
  onNext: () => void
}) {
  return (
    <div>
      <p className="font-display text-2xl leading-snug small:text-[1.75rem]">{act}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((o, i) => {
          const right = picked !== null && i === answer
          const wrong = picked === i && i !== answer
          return (
            <button
              key={o}
              onClick={() => onPick(i)}
              disabled={picked !== null}
              aria-pressed={picked === i}
              className={clx(
                "flex min-h-[44px] items-center gap-3 rounded-xl border px-4 text-left text-[15px] transition-colors",
                right
                  ? "border-[#3f9e77] bg-[#3f9e77]/15 text-kebe-text"
                  : wrong
                  ? "border-[#e0705f] bg-[#e0705f]/10 text-kebe-text"
                  : picked !== null
                  ? "border-kebe-line text-kebe-muted"
                  : "border-kebe-line text-kebe-text hover:border-kebe-muted hover:bg-kebe-alt"
              )}
            >
              <kbd className="flex h-6 w-6 items-center justify-center rounded border border-kebe-line font-mono text-xs text-kebe-muted">
                {i + 1}
              </kbd>
              {o}
              {right && <span aria-label=", the answer">✓</span>}
              {wrong && <span aria-label=", your guess">✗</span>}
            </button>
          )
        })}
      </div>
      {picked !== null && (
        <div className="mt-4 flex flex-col gap-3 small:flex-row small:items-end small:justify-between">
          <p className="max-w-2xl text-[15px] leading-snug text-kebe-text">
            <span className={picked === answer ? "text-[#3f9e77]" : "text-[#e3b04b]"}>
              {picked === answer ? "Right. " : "Not quite. "}
            </span>
            {reveal}
          </p>
          <div className="shrink-0">
            <NextButton onClick={onNext}>Next</NextButton>
          </div>
        </div>
      )}
    </div>
  )
}

// One box a key: what it turned out to type (where finding out is the
// point), and how it went: ✓ found on your own, • found with help.
function Slots({ text, pos, marks, reveal }: { text: string; pos: number; marks: Mark[]; reveal: boolean }) {
  return (
    <ol aria-hidden className="flex flex-wrap justify-center gap-1">
      {text.split("").map((c, i) => (
        <li
          key={i}
          className={clx(
            "relative flex h-7 min-w-[1.75rem] items-center justify-center rounded border px-1 font-mono text-xs uppercase",
            i === pos
              ? "border-kebe-text text-kebe-text"
              : marks[i] === "ok"
              ? "border-[#3f9e77] bg-[#3f9e77]/15 text-kebe-text"
              : marks[i] === "miss"
              ? "border-[#e3b04b] bg-[#e3b04b]/10 text-kebe-text"
              : "border-kebe-line text-kebe-muted"
          )}
        >
          {i < pos ? (reveal ? c : marks[i] === "ok" ? "✓" : "•") : reveal ? "?" : ""}
          {reveal && marks[i] === "miss" && (
            <span className="absolute -right-0.5 -top-1 text-[9px] text-[#e3b04b]">•</span>
          )}
        </li>
      ))}
    </ol>
  )
}

// Under the board: the fingers' colours, and how keys are read.
export function BoardFooter({
  press,
  onKebe,
  setOnKebe,
  extra,
}: {
  press: ReturnType<typeof touchOf> | null
  onKebe: boolean
  setOnKebe: (v: boolean) => void
  extra?: React.ReactNode
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
      <FingerKey press={press} />
      <div className="flex items-center gap-4">
        <KebeToggle on={onKebe} set={setOnKebe} />
        {extra}
      </div>
    </div>
  )
}

// Which way keys are read (lib/train/lessons.ts typedChar): a KeBe's own
// letters, or any other keyboard's keys by their place.
export function KebeToggle({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  return (
    <label
      title={on ? "Reading the letters your KeBe types" : "Reading your keyboard's keys by their place"}
      className="flex min-h-[32px] cursor-pointer items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-kebe-muted hover:text-kebe-text"
    >
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => {
          set(e.target.checked)
          // Typing goes back to the trainer, not the box.
          document.querySelector<HTMLElement>("[data-play]")?.focus({ preventScroll: true })
        }}
        className="accent-[#3f9e77]"
      />
      Typing on a KeBe
    </label>
  )
}

// The words to type: done in full ink, the next character marked (red once
// missed), the rest lighter. Words wrap whole. A long list shows `page`
// words at a time, with a count.
function Text({ text, pos, missed, page }: { text: string; pos: number; missed: boolean; page?: number }) {
  const words = text.split(" ")
  const at = text.slice(0, pos).split(" ").length - 1
  const from = page ? Math.floor(at / page) * page : 0
  const to = page ? from + page : words.length
  let i = words.slice(0, from).reduce((n, w) => n + w.length + 1, 0)
  return (
    <div>
      <p className="flex flex-wrap gap-y-1 font-mono text-[clamp(1.25rem,2.5vw,1.75rem)] leading-relaxed">
        {words.slice(from, to).map((w, wi) => {
          const start = i
          i += w.length + 1
          const ch = (c: string, j: number) => (
            <span
              key={j}
              className={clx(
                j < pos ? "text-kebe-text" : "text-kebe-text/60",
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
              <span className="whitespace-nowrap">{w.split("").map((c, k) => ch(c, start + k))}</span>
              {start + w.length < text.length && ch(" ", start + w.length)}
            </Fragment>
          )
        })}
      </p>
      {page && (
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-kebe-muted">
          Word <span className="text-kebe-text">{Math.min(at + 1, words.length)}</span> of {words.length}
        </p>
      )}
    </div>
  )
}
