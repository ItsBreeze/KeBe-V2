"use client"

import { clx } from "@medusajs/ui"
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react"

import { saveTrainerProgress } from "@lib/data/trainer"
import {
  BACKSPACE,
  KEY_BY_ID,
  KEYS,
  spaceAfter,
  Stroke,
  strokeFor,
  touchName,
  touchOf,
} from "@lib/train/layout"
import {
  bare,
  GROUPS,
  learnedBefore,
  starsFor,
  LEVELS,
  PASS_WPM,
  speedTest,
  TEST_WORDS,
} from "@lib/train/levels"
import {
  cleanProgress,
  EMPTY_PROGRESS,
  MAX_WPM,
  mergeProgress,
  openCount,
  Progress,
  recordResult,
  sameProgress,
  STORAGE_KEY,
} from "@lib/train/progress"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Board, { FingerKey } from "@modules/train/components/board"

// The typing trainer: levels that open one at a time at each one's target, and
// a 10-word speed test over the 1,000 most common English words. Words are
// judged one at a time: Space moves on, Backspace can step back into a word
// that went wrong, and only correctly typed words count toward the speed.

type Mode = "levels" | "test"

type Run = {
  id: number
  words: string[]
  typed: string[]
  idx: number
  start: number | null
  end: number | null
  strokes: number
  good: number
}

type Action =
  | { type: "reset"; words: string[] }
  | { type: "char"; ch: string; t: number }
  | { type: "space"; t: number }
  | { type: "back"; word: boolean }

const blank = (id: number, words: string[]): Run => ({
  id,
  words,
  typed: words.map(() => ""),
  idx: 0,
  start: null,
  end: null,
  strokes: 0,
  good: 0,
})

function reducer(r: Run, a: Action): Run {
  if (a.type === "reset") return blank(r.id + 1, a.words)
  if (r.end !== null || r.words.length === 0) return r
  const target = r.words[r.idx]
  const cur = r.typed[r.idx]
  const last = r.idx === r.words.length - 1

  if (a.type === "char") {
    if (cur.length >= target.length + 8) return r
    const typed = r.typed.slice()
    typed[r.idx] = cur + a.ch
    return {
      ...r,
      typed,
      start: r.start ?? a.t,
      // The last word ends the test the moment it is right.
      end: last && typed[r.idx] === target ? a.t : null,
      strokes: r.strokes + 1,
      good: r.good + (target[cur.length] === a.ch ? 1 : 0),
    }
  }
  if (a.type === "space") {
    if (!cur) return r
    const ok = cur === target
    return {
      ...r,
      idx: last ? r.idx : r.idx + 1,
      end: last ? a.t : null,
      strokes: r.strokes + 1,
      good: r.good + (ok ? 1 : 0),
    }
  }
  // Backspace, or Ctrl/Alt + Backspace for the whole word. At the start of
  // a word it steps back into the one before, but only if that one is wrong.
  const typed = r.typed.slice()
  let idx = r.idx
  if (!typed[idx]) {
    if (idx === 0 || typed[idx - 1] === r.words[idx - 1]) return r
    idx -= 1
    if (!a.word) return { ...r, idx }
  }
  typed[idx] = a.word ? "" : typed[idx].slice(0, -1)
  return { ...r, typed, idx }
}

// Words per minute counts only correctly typed words, five characters to a
// word, with the space after each one; raw counts everything typed.
function stats(r: Run, now: number) {
  if (r.start === null) return null
  const ms = Math.max(1, (r.end ?? now) - r.start)
  let chars = 0
  let raw = 0
  r.words.forEach((w, i) => {
    const t = r.typed[i]
    const done = r.end !== null || i < r.idx
    const space = i < r.words.length - 1 ? 1 : 0
    if (done) {
      raw += t.length + space
      if (t === w) chars += w.length + space
    } else if (i === r.idx) {
      raw += t.length
      if (w.startsWith(t)) chars += t.length
    }
  })
  const perMin = 60000 / ms
  return {
    wpm: (chars / 5) * perMin,
    raw: (raw / 5) * perMin,
    acc: r.strokes ? r.good / r.strokes : 1,
    secs: ms / 1000,
  }
}

// What to press next: the next letter, Space at the end of a word, or
// Backspace when the word has gone wrong.
function nextChar(r: Run): string | null {
  if (r.end !== null || r.words.length === 0) return null
  const target = r.words[r.idx]
  const cur = r.typed[r.idx]
  if (!target.startsWith(cur)) return "\b"
  return cur.length < target.length ? target[cur.length] : " "
}

// Correct words in a row, counting back from the last one finished.
function streakOf(r: Run): number {
  let n = 0
  const done = r.end !== null ? r.words.length : r.idx
  for (let i = done - 1; i >= 0 && r.typed[i] === r.words[i]; i--) n++
  return n
}

type Result = {
  key: string
  wpm: number
  raw: number
  acc: number
  secs: number
  prevBest: number
  newTop: boolean
  opened: number | null
}

type KeyLike = {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  isComposing?: boolean
  target: EventTarget | null
  preventDefault: () => void
  getModifierState(k: "AltGraph"): boolean
}

// The browser's copy names the customer it belongs to (null: nobody signed
// in), so on a shared computer one customer's scores never reach the next
// one's account, and every write merges with what is stored, so a second tab
// cannot wipe out the first one's passes.
type Local = { owner: string | null; progress: Progress }

function readLocal(): Local {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
    return {
      owner: typeof raw?.owner === "string" ? raw.owner : null,
      progress: cleanProgress(raw),
    }
  } catch {
    return { owner: null, progress: { best: {} } }
  }
}

function writeLocal(owner: string | null, p: Progress): Progress {
  try {
    const cur = readLocal()
    const all = cur.owner === owner ? mergeProgress(cur.progress, p) : p
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ owner, ...all }))
    return all
  } catch {
    return p
  }
}

const BOARD_PREF = "kebe-trainer-board"

export default function Trainer({
  account,
  initialMode,
}: {
  account: { id: string; firstName: string | null; progress: Progress } | null
  initialMode: Mode
}) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [levelN, setLevelN] = useState(1)
  const [progress, setProgress] = useState<Progress>(
    account?.progress ?? EMPTY_PROGRESS
  )
  const [run, dispatch] = useReducer(reducer, blank(0, []))
  const [result, setResult] = useState<Result | null>(null)
  const [now, setNow] = useState(0)
  const [focused, setFocused] = useState(false)
  const [flash, setFlash] = useState<{ keys: string[]; ok: boolean } | null>(null)
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "failed">("idle")
  const [showBoard, setShowBoard] = useState(true)
  const [coarse, setCoarse] = useState(false)

  const area = useRef<HTMLDivElement>(null)
  const lastWords = useRef<Set<string>>(new Set())
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const recorded = useRef(-1)

  const level = LEVELS[levelN - 1]
  const opts = mode === "levels" ? { fn: level.fn, taps: level.taps } : {}
  const open = openCount(progress)
  const goLevel = useCallback((n: number) => setLevelN(n), [])

  // ---- progress: the browser's copy merged with the account's ------------

  const owner = account?.id ?? null
  const persist = useCallback(
    (p: Progress) => {
      const all = writeLocal(owner, p)
      setProgress((cur) => mergeProgress(cur, all))
      if (!account) return
      setSave("saving")
      saveTrainerProgress(all)
        .then((merged) => {
          if (!merged) return setSave("failed")
          setSave("saved")
          setProgress((cur) => mergeProgress(cur, writeLocal(owner, merged)))
        })
        .catch(() => setSave("failed"))
    },
    [account, owner]
  )

  useEffect(() => {
    const local = readLocal()
    // Practice done signed out joins the account that signs in; a copy that
    // belongs to another customer, or to anyone while signed out, does not.
    const mine = local.owner === owner || (local.owner === null && !!account)
    const merged = mergeProgress(
      mine ? local.progress : EMPTY_PROGRESS,
      account?.progress ?? EMPTY_PROGRESS
    )
    setProgress(merged)
    goLevel(openCount(merged))
    if (!mine) writeLocal(owner, EMPTY_PROGRESS)
    writeLocal(owner, merged)
    if (account && !sameProgress(merged, account.progress)) persist(merged)
    try {
      setShowBoard(localStorage.getItem(BOARD_PREF) !== "hidden")
    } catch {}
    setCoarse(window.matchMedia?.("(pointer: coarse)").matches ?? false)
    // Once, on arrival: later changes go through persist().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Another tab's results, as they land.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      const l = readLocal()
      if (l.owner === owner) setProgress((cur) => mergeProgress(cur, l.progress))
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [owner])

  // ---- tests ---------------------------------------------------------------

  const newWords = useCallback(() => {
    const avoid = lastWords.current
    const words =
      mode === "test" ? speedTest(avoid) : level.make(avoid)
    lastWords.current = new Set(words.map(bare))
    setResult(null)
    dispatch({ type: "reset", words })
    area.current?.focus({ preventScroll: true })
  }, [mode, level])

  useEffect(() => {
    newWords()
  }, [newWords])

  // Live speed while a test runs.
  useEffect(() => {
    if (run.start === null || run.end !== null) return
    const t = setInterval(() => setNow(performance.now()), 200)
    return () => clearInterval(t)
  }, [run.start, run.end])

  // A finished test: score it once, keep the best, open the next level.
  useEffect(() => {
    if (run.end === null || recorded.current === run.id) return
    recorded.current = run.id
    const s = stats(run, run.end)
    if (!s) return
    const key = mode === "test" ? "test" : level.id
    const after = recordResult(progress, key, s.wpm)
    const was = openCount(progress)
    const is = openCount(after)
    setResult({
      key,
      ...s,
      prevBest: progress.best[key] ?? 0,
      newTop: (after.best[key] ?? 0) > (progress.best[key] ?? 0),
      opened: mode === "levels" && is > was ? is : null,
    })
    if (!sameProgress(after, progress)) {
      setProgress(after)
      persist(after)
    }
  }, [run, mode, level, progress, persist])

  // ---- keys ----------------------------------------------------------------

  const state = useRef({ run, result, levelN, progress, mode, opts })
  state.current = { run, result, levelN, progress, mode, opts }

  const handleKey = useCallback(
    (e: KeyLike) => {
      const { run, result, levelN, progress, mode, opts } = state.current
      if (e.isComposing) return
      const el = e.target as HTMLElement | null
      if (
        (e.key === "Enter" || e.key === " ") &&
        el !== area.current &&
        el?.closest?.("button, a")
      )
        return
      if (e.key === "Escape") {
        e.preventDefault()
        newWords()
        return
      }
      if (result || run.end !== null) {
        if (e.key === "Enter") {
          e.preventDefault()
          if (mode === "levels" && openCount(progress) > levelN) goLevel(levelN + 1)
          else newWords()
        } else if (e.key.length === 1) {
          e.preventDefault()
        }
        return
      }
      const altGr = e.getModifierState?.("AltGraph")
      if ((e.ctrlKey || e.metaKey || e.altKey) && !altGr) {
        if (e.key === "Backspace") {
          e.preventDefault()
          dispatch({ type: "back", word: true })
        }
        return
      }
      if (e.key === "Backspace") {
        e.preventDefault()
        dispatch({ type: "back", word: false })
        return
      }
      if (e.key === " " || e.key.length === 1) {
        e.preventDefault()
        const expected = nextChar(run)
        const t = performance.now()
        if (e.key === " ") dispatch({ type: "space", t })
        else dispatch({ type: "char", ch: e.key, t })
        const keys =
          e.key === " "
            ? spaceAfter(run.typed[run.idx]?.slice(-1), opts).keys
            : strokeFor(e.key, opts)?.keys ?? []
        setFlash({ keys, ok: e.key === expected })
        if (flashTimer.current) clearTimeout(flashTimer.current)
        flashTimer.current = setTimeout(() => setFlash(null), 160)
      }
    },
    [newWords, goLevel]
  )

  // Keys pressed outside the test (nothing focused, or after clicking a
  // level) go to it, so nobody has to click the box before typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || area.current?.contains(e.target as Node)) return
      const el = e.target as HTMLElement
      // Only from the page itself or the trainer's own controls: menus and
      // lists elsewhere (the side menu's country list) keep their keys.
      if (el !== document.body && !el.closest?.("[data-trainer]")) return
      // A button or link keeps Space and Enter; any other key types.
      if (el !== document.body && (e.key === " " || e.key === "Enter")) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key.length !== 1 && !["Escape", "Backspace", "Enter"].includes(e.key)) return
      area.current?.focus({ preventScroll: true })
      handleKey(e)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [handleKey])

  // ---- what the board shows -----------------------------------------------

  const allKeys = useMemo(() => new Set(KEYS.map((k) => k.id)), [])
  const learned = mode === "test" ? allKeys : learnedBefore(levelN)
  const adds = useMemo(
    () => new Set(mode === "test" ? [] : level.adds),
    [mode, level]
  )

  const expected = nextChar(run)
  const next: Stroke | null =
    expected === null
      ? null
      : expected === "\b"
      ? { keys: [BACKSPACE], hold: [], name: "Backspace" }
      : expected === " "
      ? spaceAfter(run.words[run.idx].slice(-1), opts)
      : strokeFor(expected, opts)
  const press = next ? touchOf(KEY_BY_ID[next.keys[0]]) : null
  const hold = next ? next.hold.map((id) => touchOf(KEY_BY_ID[id])) : []
  const hint =
    next && press
      ? expected === " "
        ? next.name
        : `${next.name} · ${touchName(press)}${hold.length ? `, held by the ${touchName(hold[0])}` : ""}`
      : null

  // Read the clock while a test runs (the interval re-renders every 200 ms).
  const live =
    run.start !== null && run.end === null && now >= 0
      ? stats(run, performance.now())
      : null
  const best = progress.best[mode === "test" ? "test" : level.id]

  const pickLevel = (n: number) => {
    setMode("levels")
    goLevel(n)
  }
  const passedCount = LEVELS.filter((l) => (progress.best[l.id] ?? 0) >= l.pass).length
  const starCount = LEVELS.reduce((n, l) => n + starsFor(progress.best[l.id], l.pass), 0)
  const streak = streakOf(run)
  const toggleBoard = () => {
    setShowBoard((v) => {
      try {
        localStorage.setItem(BOARD_PREF, v ? "hidden" : "shown")
      } catch {}
      return !v
    })
  }

  return (
    <div data-trainer>
      {/* One screen, top to bottom: the bar (mode, progress), the level
          strip, the level, the words, the speed line, the board coloured by
          finger. Sized so it all fits without scrolling (owner, 5 Oct 2026). */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div
          role="group"
          aria-label="What to practise"
          className="inline-flex rounded-xl border border-kebe-line p-1 font-mono text-xs uppercase tracking-[0.14em]"
        >
          {(
            [
              ["levels", "Levels"],
              ["test", `${TEST_WORDS}-word test`],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={clx(
                "rounded-lg px-3 py-1.5 transition-colors",
                mode === m
                  ? "bg-kebe-text text-kebe-page"
                  : "text-kebe-muted hover:text-kebe-text"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex min-w-[220px] flex-1 items-center gap-3 small:max-w-sm">
          <div
            aria-hidden
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-kebe-line"
          >
            <div
              className="h-full rounded-full bg-[#3f9e77] transition-[width] duration-500"
              style={{ width: `${(passedCount / LEVELS.length) * 100}%` }}
            />
          </div>
          <p className="shrink-0 font-mono text-xs uppercase tracking-[0.14em] text-kebe-muted">
            <span className="text-kebe-text">{passedCount}</span>/{LEVELS.length}{" "}
            passed · <span className="text-[#e3b04b]">★</span>{" "}
            <span className="text-kebe-text">{starCount}</span>
          </p>
        </div>
      </div>

      {/* The level strip: every level in one row, grouped, filled for the
          one being played, outlined green once passed, locked until the one
          before it is passed. Scrolls sideways where the screen is narrow. */}
      {mode === "levels" && (
        <ol
          aria-label="Levels"
          className="mt-4 flex items-center gap-[2px] overflow-x-auto pb-1 [scrollbar-width:thin]"
        >
          {LEVELS.map((l, i) => {
            const locked = l.n > open
            const b = progress.best[l.id]
            const passed = (b ?? 0) >= l.pass
            const current = l.n === levelN
            const newGroup = i > 0 && LEVELS[i - 1].group !== l.group
            return (
              <li key={l.id} className={clx("shrink-0", newGroup && "ml-1.5")}>
                <button
                  disabled={locked}
                  onClick={() => pickLevel(l.n)}
                  aria-current={current ? "step" : undefined}
                  aria-label={`Level ${l.n}, ${l.group}, ${l.title}${
                    locked
                      ? ", locked"
                      : b
                      ? `, best ${b} wpm, ${starsFor(b, l.pass)} of 3 stars`
                      : ""
                  }`}
                  title={
                    locked
                      ? `${l.group} · ${l.title}: pass level ${l.n - 1} to open`
                      : `${l.group} · ${l.title}${b ? ` · best ${b} wpm` : ""}`
                  }
                  className={clx(
                    "flex h-6 w-6 items-center justify-center rounded-md border font-mono text-[9px] transition-colors",
                    current
                      ? "border-[#3f9e77] bg-[#3f9e77] text-kebe-page"
                      : passed
                      ? "border-[#3f9e77]/70 bg-[#3f9e77]/10 text-kebe-text hover:border-[#3f9e77]"
                      : "border-kebe-line text-kebe-text hover:border-kebe-muted",
                    locked &&
                      "cursor-not-allowed text-kebe-faint opacity-50 hover:border-kebe-line"
                  )}
                >
                  {locked ? <Lock /> : l.n}
                </button>
              </li>
            )
          })}
        </ol>
      )}

      {/* The level being played, on one line: where it is, what it adds,
          a one-line tip, its target and the best so far. */}
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-display text-2xl leading-tight">
            {mode === "test" ? "The 10-word test" : level.title}
          </h2>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kebe-muted">
            {mode === "test"
              ? "Ten of the 1,000 most common words"
              : `Level ${level.n}/${LEVELS.length} · ${level.group}`}
          </p>
        </div>
        <dl className="flex shrink-0 items-baseline gap-5 font-mono text-[11px] uppercase tracking-[0.14em] text-kebe-muted">
          {mode === "levels" && (
            <div className="flex items-baseline gap-2">
              <dt>Pass</dt>
              <dd className="text-sm text-kebe-text">{level.pass}</dd>
            </div>
          )}
          <div className="flex items-baseline gap-2">
            <dt>{mode === "test" ? "Top" : "Best"}</dt>
            <dd className="flex items-center gap-2 text-sm text-kebe-text">
              {best ?? "—"}
              {mode === "levels" && best ? <Stars n={starsFor(best, level.pass)} /> : null}
            </dd>
          </div>
        </dl>
      </div>
      {mode === "levels" && (
        <p className="mt-1 text-sm leading-snug text-kebe-muted">{level.blurb}</p>
      )}

      {/* Announced when a round ends: a region that is always present, since
          one inserted along with its text is not read out. */}
      <p role="status" className="sr-only">
        {result
          ? `${Math.round(result.wpm)} words a minute, ${Math.round(result.acc * 100)}% accuracy.${
              result.opened
                ? ` Level ${result.opened}, ${LEVELS[result.opened - 1].title}, is open.`
                : ""
            } Enter for next, Escape for new words.`
          : ""}
      </p>

      {/* The test */}
      <div
        ref={area}
        tabIndex={0}
        role="textbox"
        aria-label="Typing test. Type the words shown; Escape for new words."
        aria-readonly="false"
        onKeyDown={(e) => handleKey(e)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onMouseDown={() => area.current?.focus({ preventScroll: true })}
        className="relative mt-3 min-h-[112px] cursor-text rounded-2xl border border-kebe-line bg-kebe-raised px-6 py-5 outline-none focus-visible:border-kebe-muted small:px-8"
      >
        {result ? (
          <Results
            result={result}
            mode={mode}
            levelN={levelN}
            open={open}
            best={progress.best[result.key] ?? 0}
            signedIn={!!account}
            save={save}
            pass={level.pass}
            onNext={() => goLevel(levelN + 1)}
            onAgain={newWords}
          />
        ) : (
          <Words run={run} />
        )}
        {!focused && !result && run.words.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-kebe-raised/80 backdrop-blur-[2px]">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-kebe-text">
              Click here, or start typing
            </p>
          </div>
        )}
      </div>

      {/* Speed, and the next key with its finger */}
      <div className="mt-2 flex flex-col gap-1 font-mono text-xs uppercase tracking-[0.14em] text-kebe-muted small:flex-row small:items-center small:justify-between">
        <p aria-live="off">
          {live && !result ? (
            <>
              <span className="text-kebe-text">
                {live.secs >= 1 ? Math.round(live.wpm) : "—"}
              </span>{" "}
              wpm
              {" · "}
              {live.secs.toFixed(1)} s{" · "}word {Math.min(run.idx + 1, run.words.length)}/
              {run.words.length}
              {streak >= 2 && (
                <>
                  {" · "}
                  <span className="text-[#3f9e77]">streak ×{streak}</span>
                </>
              )}
            </>
          ) : result ? (
            "Enter: next · Esc: new words"
          ) : (
            "Esc: new words · Backspace: fix a word"
          )}
        </p>
        {hint && !result && (
          <p>
            Next: <span className="text-kebe-text normal-case">{hint}</span>
          </p>
        )}
      </div>

      {/* The board, every key in its finger's colour, as large as the
          screen's height leaves room for. */}
      <div className="mt-3">
        {showBoard && (
          <Board
            learned={learned}
            adds={adds}
            next={result ? null : next}
            flash={flash}
            className="mx-auto block"
            style={{ width: "min(100%, max(520px, calc((100svh - 480px) * 2.83)))" }}
          />
        )}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          {showBoard ? <FingerKey press={result ? null : press} /> : <span />}
          <button
            onClick={toggleBoard}
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-kebe-muted hover:text-kebe-text"
          >
            {showBoard ? "Hide the board" : "Show the board"}
          </button>
        </div>
      </div>

      {coarse && (
        <p className="mt-6 text-sm text-kebe-muted">
          The trainer needs a physical keyboard: plug one in, or come back on a
          computer.
        </p>
      )}

      <p className="mt-10 max-w-2xl text-sm leading-relaxed text-kebe-muted">
        {account ? (
          <>
            Signed in{account.firstName ? ` as ${account.firstName}` : ""}: your
            open levels and top scores are saved to your account
            {save === "saving"
              ? " (saving…)"
              : save === "failed"
              ? ", but the last save didn't go through; this browser still has it"
              : ""}
            .
          </>
        ) : (
          <>
            Your progress is kept in this browser.{" "}
            <LocalizedClientLink
              href="/account"
              className="text-kebe-text underline underline-offset-4"
            >
              Sign in
            </LocalizedClientLink>{" "}
            to save your top scores to your account.
          </>
        )}
      </p>
    </div>
  )
}

function Words({ run }: { run: Run }) {
  if (run.words.length === 0) return <div className="h-24" />
  return (
    <div className="flex flex-wrap gap-x-[0.65em] gap-y-2 font-mono text-[clamp(1.1rem,2.2vw,1.5rem)] leading-relaxed">
      {run.words.map((word, i) => {
        const t = run.typed[i]
        const current = i === run.idx && run.end === null
        const wrong = (i < run.idx || run.end !== null) && t !== word
        const len = Math.max(word.length, t.length)
        return (
          <span
            key={`${run.id}-${i}`}
            className={clx(
              "relative whitespace-pre",
              wrong &&
                "underline decoration-[#e0705f]/70 decoration-2 underline-offset-[6px]"
            )}
          >
            {Array.from({ length: len }, (_, j) => {
              const ch = j < word.length ? word[j] : t[j]
              const cls =
                j >= t.length
                  ? "text-kebe-text/40"
                  : j >= word.length
                  ? "text-[#e0705f]/70"
                  : t[j] === word[j]
                  ? "text-kebe-text"
                  : "text-[#e0705f]"
              return (
                <span key={j} className={clx("relative", cls)}>
                  {current && j === t.length && <Caret />}
                  {ch}
                </span>
              )
            })}
            {current && t.length >= len && (
              <span className="relative">
                <Caret />
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}

function Caret() {
  return (
    <span
      aria-hidden
      className="absolute -left-[1px] top-[0.2em] h-[1.1em] w-[2px] rounded bg-[#3f9e77] motion-safe:animate-pulse"
    />
  )
}

function Results({
  result,
  mode,
  levelN,
  open,
  best,
  signedIn,
  save,
  pass,
  onNext,
  onAgain,
}: {
  result: Result
  mode: Mode
  levelN: number
  open: number
  best: number
  signedIn: boolean
  save: "idle" | "saving" | "saved" | "failed"
  pass: number
  onNext: () => void
  onAgain: () => void
}) {
  const wpm = Math.round(result.wpm)
  const passed = wpm >= pass && wpm <= MAX_WPM
  const last = levelN === LEVELS.length
  const canNext = mode === "levels" && !last && open > levelN
  const newTop = result.newTop
  const passedBefore = result.prevBest >= pass

  let line: string
  if (wpm > MAX_WPM) {
    line = `Over ${MAX_WPM} words a minute is faster than anyone types, so it isn't kept as a score.`
  } else if (mode === "test") {
    line = newTop
      ? result.prevBest
        ? `A new top score, up from ${result.prevBest}.`
        : "Your first top score."
      : `Your top score is ${best}.`
    if (newTop) {
      line += !signedIn
        ? " Sign in to keep it on your account."
        : save === "saved"
        ? " Saved to your account."
        : save === "failed"
        ? " It didn't save to your account; this browser has it."
        : " Saving to your account…"
    }
  } else if (passed && last) {
    line = "That's every level: the letters, numbers, symbols, modifiers and the Fn number pad."
  } else if (passed) {
    line = result.opened
      ? `Level ${result.opened}, ${LEVELS[result.opened - 1].title}, is open.`
      : "Passed again."
  } else if (passedBefore) {
    line = `Below ${pass} this time; your best here is ${best}, so ${
      last ? "this level is passed" : `level ${levelN + 1} is open`
    } already.`
  } else {
    line = `${pass} wpm ${last ? "passes the last level" : `opens level ${levelN + 1}`}: ${pass - wpm} to go. Ten new words with Esc.`
  }

  return (
    <div className="flex flex-col gap-6 small:flex-row small:items-end small:justify-between">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-kebe-muted">
          {mode === "test"
            ? newTop
              ? "Top score"
              : "Done"
            : passed
            ? "Passed"
            : passedBefore
            ? `Below ${pass}`
            : "Not yet"}
        </p>
        <p className="mt-2 font-display text-[clamp(3rem,8vw,4.5rem)] leading-none">
          {wpm}
          <span className="ml-3 font-mono text-base uppercase tracking-[0.14em] text-kebe-muted">
            wpm
          </span>
        </p>
        {mode === "levels" && wpm <= MAX_WPM && (
          <p className="mt-3" aria-label={`${starsFor(wpm, pass)} of 3 stars`}>
            <Stars n={starsFor(wpm, pass)} big />
          </p>
        )}
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-kebe-muted">
          {Math.round(result.acc * 100)}% accuracy · {result.secs.toFixed(1)} s · raw{" "}
          {Math.round(result.raw)}
        </p>
        <p className="mt-4 max-w-md text-base leading-relaxed text-kebe-text/80">
          {line}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {canNext && (
          <button
            onClick={onNext}
            className="rounded-xl bg-kebe-text px-6 py-3 text-base font-medium text-kebe-page transition-colors hover:bg-white"
          >
            Next level{" "}
            <span className="ml-1 font-mono text-xs opacity-60">Enter</span>
          </button>
        )}
        <button
          onClick={onAgain}
          className={clx(
            "rounded-xl px-6 py-3 text-base transition-colors",
            canNext
              ? "border border-kebe-line hover:border-kebe-muted"
              : "bg-kebe-text font-medium text-kebe-page hover:bg-white"
          )}
        >
          Ten new words{" "}
          <span className="ml-1 font-mono text-xs opacity-60">Esc</span>
        </button>
      </div>
    </div>
  )
}

// One to three stars: the level's target, then faster (starsFor).
function Stars({ n, dim, big }: { n: number; dim?: boolean; big?: boolean }) {
  return (
    <span
      aria-hidden
      className={clx("leading-none tracking-[0.08em]", big ? "text-2xl" : "text-[9px]")}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={
            i < n
              ? dim
                ? "text-kebe-page"
                : "text-[#e3b04b]"
              : dim
              ? "text-kebe-page/30"
              : "text-kebe-line"
          }
        >
          ★
        </span>
      ))}
    </span>
  )
}

function Lock() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      aria-label="Locked"
      className="inline-block"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  )
}
