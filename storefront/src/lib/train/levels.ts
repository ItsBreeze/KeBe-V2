// The typing trainer's levels and its 10-word speed test. Every word comes
// from the 1,000 most common English words (words.ts); a level takes only the
// ones its keys can type.
//
// The order is the owner's (5 Oct 2026): the eight resting keys, then I and D
// to finish the home row, then two keys at a time working out from the home
// keys: G C and R L straight up on the right, F B the pointer finger's other
// column, and the same on the left hand and the bottom row. Then the number
// row, the middle columns, the modifiers and the Fn layer.
//
// Each level is practised before it is tested (owner, 5 Oct 2026): words
// that use the new keys, building up from the ones with the fewest
// different keys, with more practice early and less as the levels ramp.
// Only whole words, never letters on their own. The test is ten fresh random words,
// every one using a new key, and PASS_WPM on it opens the next level.
import { FN, KEYS, SHIFT } from "./layout"
import { TOP_WORDS } from "./words"

export const PASS_WPM = 60
export const TEST_WORDS = 10

// Stars on a level: one for passing, more for going faster.
export const STARS = [PASS_WPM, 75, 90]
export const starsFor = (wpm?: number) =>
  STARS.filter((t) => (wpm ?? 0) >= t).length

export type Round = { title: string; make: (avoid: Set<string>) => string[] }

export type Level = {
  id: string
  n: number
  group: string
  title: string
  // The keys this level adds (designators), lit as new on the board.
  adds: string[]
  blurb: string
  // Characters this level types on the Fn layer, and by tapping a modifier.
  fn?: string
  taps?: string
  // Untimed for the gate, easiest first, before the test.
  practice: Round[]
  // The test.
  make: (avoid: Set<string>) => string[]
}

// ---- random helpers -------------------------------------------------------

const rnd = (n: number) => Math.floor(Math.random() * n)
const pick = <T,>(xs: T[]): T => xs[rnd(xs.length)]

function shuffle<T>(xs: T[]): T[] {
  const a = xs.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// n items, repeating a pool that is shorter than n.
function fill(pool: string[], n: number): string[] {
  if (!pool.length) return []
  const out: string[] = []
  while (out.length < n) out.push(...shuffle(pool))
  return out.slice(0, n)
}

// n different tokens from a generator.
function distinct(n: number, make: () => string): string[] {
  const out = new Set<string>()
  for (let tries = 0; out.size < n && tries < n * 30; tries++) out.add(make())
  return Array.from(out)
}

const chars = (s: string) => s.split("")
// A token as the avoid-list stores it: no trailing punctuation, lower case,
// so "the." and "The" both count as "the".
export const bare = (w: string) => w.replace(/[,.;]+$/, "").toLowerCase()
const only = (allowed: string) => (w: string) =>
  chars(w).every((c) => allowed.includes(c))
const some = (wanted: string) => (w: string) =>
  chars(w).some((c) => wanted.includes(c))

// Designators for the keys that type these characters on the base layer.
const keysFor = (s: string) =>
  chars(s).map((c) => {
    const k = KEYS.find((k) => k.base === c)
    if (!k) throw new Error(`no key types ${c}`)
    return k.id
  })

const LETTERS = "abcdefghijklmnopqrstuvwxyz"
const MARKS = ",.;"

// ---- choosing words that drill the new keys --------------------------------

// n tokens from the pool, favouring the ones dense in the new keys, never the
// last round's where the pool allows, and with every new key in at least one
// of them (for a level that adds a handful of keys).
function focused(pool: string[], fresh: string, n: number, avoid: Set<string>) {
  const keys = chars(fresh).filter((c) => !MARKS.includes(c))
  const weight = (w: string) =>
    1 + (3 * chars(w).filter((c) => keys.includes(c)).length) / w.length
  let src = pool.filter((w) => !avoid.has(bare(w)))
  if (src.length < n) src = pool
  // Weighted sampling without replacement (Efraimidis-Spirakis).
  const ranked = src
    .map((w) => ({ w, k: Math.pow(Math.random(), 1 / weight(w)) }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.w)
  const out = ranked.slice(0, n)
  if (keys.length <= n / 2) {
    for (const c of keys) {
      if (out.some((w) => w.includes(c))) continue
      const sub = ranked.find((w) => w.includes(c) && !out.includes(w))
      if (!sub) continue
      // Swap out a word whose new keys the others still cover.
      for (let j = out.length - 1; j >= 0; j--) {
        const rest = out.filter((_, i) => i !== j).concat(sub)
        if (keys.every((k) => !out.some((w) => w.includes(k)) || rest.some((w) => w.includes(k)))) {
          out[j] = sub
          break
        }
      }
    }
  }
  return out
}

// Commas, periods and semicolons after some words once they are learned; the
// level that teaches one uses it often.
function punctuate(words: string[], known: string, fresh: string) {
  const marks = chars(MARKS).filter((m) => known.includes(m))
  const extra = chars(MARKS).filter((m) => fresh.includes(m))
  if (!marks.length && !extra.length) return words
  return words.map((w, i) => {
    if (i === words.length - 1 || !/[a-z]$/i.test(w)) return w
    if (extra.length && Math.random() < 0.4) return w + pick(extra)
    if (marks.length && Math.random() < 0.12) return w + pick(marks)
    return w
  })
}

// ---- what each level drills ----------------------------------------------

type Source = {
  // The characters the level teaches.
  fresh: string
  // Every token that uses them and can be typed with the keys so far.
  pool: (known: string) => string[]
  // Tokens to make up a round when the pool is short of ten.
  fallback?: (known: string) => string[]
}

// Only whole words, never letters on their own: a word is learned as one
// movement, like a chord (owner, 5 Oct 2026). Practice builds up: the
// level's words in order of how many different keys they take, fewest
// first, a slice per round, so the first rounds are the simplest chords.
// Early levels, whose few keys make few words, practise all of them over
// more rounds (`most`); later levels get fewer. The test draws from all.
const complexity = (w: string) => new Set(chars(bare(w))).size

function rounds(src: Source, known: string, most: number) {
  const deco = (ws: string[]) => punctuate(ws, known, src.fresh)
  // Ten words from a pool, topped up from the fallback rather than repeated
  // when the pool is small (Q has five words in the thousand).
  const ten = (pool: string[], avoid: Set<string>) => {
    const words = focused(pool, src.fresh, TEST_WORDS, avoid)
    if (words.length < TEST_WORDS && src.fallback) {
      const more = src.fallback(known).filter((w) => !words.includes(w))
      words.push(...shuffle(more).slice(0, TEST_WORDS - words.length))
    }
    return deco(shuffle(fill(words, TEST_WORDS)))
  }
  const built = () =>
    src
      .pool(known)
      .map((w, i) => ({ w, i, c: complexity(w) }))
      .sort((a, b) => a.c - b.c || a.w.length - b.w.length || a.i - b.i)
      .map((x) => x.w)
  // Seven to ten words a round, at most `most` rounds, at least one.
  const count = Math.max(1, Math.min(most, Math.floor(src.pool(known).length / 7)))
  const slice = (k: number) => {
    const pool = built()
    const at = (j: number) => Math.round((j * pool.length) / count)
    return pool.slice(at(k), at(k + 1))
  }
  const practice: Round[] = Array.from({ length: count }, (_, k) => ({
    title: `Practice ${k + 1}`,
    make: (avoid) => {
      const words = slice(k)
      // A slice of six or more is the round, nothing repeated; a smaller
      // pool (Q) is topped up as the test is.
      return words.length >= 6
        ? deco(shuffle(focused(words, src.fresh, Math.min(TEST_WORDS, words.length), avoid)))
        : ten(words, avoid)
    },
  }))
  const make = (avoid: Set<string>) => ten(src.pool(known), avoid)
  return { practice, make }
}

// Letters: each step's new characters. "'" makes contractions typeable, and
// , . ; go after words.
const LETTER_STEPS = [
  "aoeuhtns",
  "id",
  "gc",
  "rl",
  "fb",
  "p.",
  ",'",
  "yx",
  "mw",
  "vz",
  "kj",
  "q;",
]

const wordsUsing = (known: string, fresh: string) => {
  const keys = chars(fresh).filter((c) => !MARKS.includes(c)).join("")
  return keys
    ? TOP_WORDS.filter((w) => only(known + fresh)(w) && some(keys)(w))
    : []
}

const letterSource = (i: number): Source => ({
  fresh: LETTER_STEPS[i],
  pool: (known) => wordsUsing(known, LETTER_STEPS[i]),
  // Short of words (Q, say): the step before's, then anything known.
  fallback: (known) =>
    i > 0
      ? [
          ...shuffle(wordsUsing(known, LETTER_STEPS[i - 1])),
          ...shuffle(TOP_WORDS.filter(only(known))),
        ]
      : [],
})

// Numbers made of the digits so far, each using a new one, written the way
// numbers are (no leading zero).
const numberSource = (fresh: string): Source => ({
  fresh,
  pool: (known) => {
    const digits = chars(known + fresh).filter((c) => /\d/.test(c))
    const lead = digits.filter((d) => d !== "0")
    return distinct(120, () => {
      const len = 1 + rnd(4)
      const d = Array.from({ length: len }, () => pick(digits))
      d[rnd(len)] = pick(chars(fresh))
      if (len > 1 && d[0] === "0" && lead.length) d[0] = pick(lead)
      return d.join("")
    })
  },
})

// The symbol levels use words too, joined or wrapped the way the symbols
// are written: and/or, [edit], well-known, first_name, why?, {name}.

// The middle columns: / \ on the home row, [ ] above, - = on the number row.
const MIDDLE = [
  "and/or", "on/off", "yes/no", "either/or", "his/her", "he/she", "input/output",
  "read/write", "true/false", "in/out", "up/down", "open/close", "black/white",
  "day/night", "this/that", "left/right", "start/stop", "before/after", "now/then",
  "docs\\notes", "src\\main", "users\\me", "home\\work", "temp\\logs", "music\\old",
  "photos\\new", "games\\save", "work\\done", "back\\up", "files\\old", "notes\\new",
  "[edit]", "[note]", "[draft]", "[done]", "[quote]", "[new]", "[read]", "[sent]",
  "[update]", "[video]", "[photo]", "[link]", "[source]", "[help]", "[open]", "[sic]",
  "well-known", "long-term", "self-made", "x-ray", "e-mail", "follow-up", "part-time",
  "full-time", "so-called", "up-to-date", "one-way", "real-time", "high-end", "low-key",
  "old-school", "check-in", "sign-up", "built-in", "drop-down", "hot-swap", "day-to-day",
  "face-to-face", "twenty-one", "all-time", "half-time", "world-class", "short-term",
  "key=value", "size=large", "mode=dark", "sort=new", "page=home", "type=text",
  "status=done", "theme=light", "view=list", "name=value", "color=red", "state=open",
]
const MIDDLE_STEPS = ["/\\", "[]", "-="]

const listSource = (list: string[], fresh: string): Source => ({
  fresh,
  pool: (known) => list.filter((t) => only(known + fresh)(t) && some(fresh)(t)),
})

// Capitals: Shift held with the other hand.
const UPPER = LETTERS.toUpperCase()
const capital = (w: string) => w[0].toUpperCase() + w.slice(1)
const PROPER = [
  "KeBe", "Dvorak", "QMK", "USB", "Canada", "English", "Monday", "Friday", "July",
  "Toronto", "Ottawa", "I", "I'm", "I'll", "OK", "TV",
]
// Tapped, the Shifts type ( and ), the Ctrls [ and ], the left Alt = and
// the right Alt _.
const TAPPED = [
  "(note)", "(sic)", "(yes)", "(and)", "(or)", "(no)", "(it)", "(see", "below)",
  "(maybe)", "(again)", "(please)", "(thanks)", "(later)", "(soon)", "(here)", "(there)",
  "(both)", "(often)", "(usually)", "print()", "open()", "close()", "save()", "start()",
  "stop()", "(today)",
  "snake_case", "user_name", "file_name", "max_size", "is_open", "first_name",
  "last_name", "zip_code", "top_score", "new_line", "is_on", "sort_order", "page_size",
  "start_time", "end_date", "home_page", "[edit]", "[done]", "[note]", "[new]",
  "key=value", "size=large", "mode=dark", "is_done=true", "user_name=you",
]
const SHIFTED_CHARS = "!@#$%^&*?:\"|<>{}+"
const SHIFTED = [
  "why?", "what?", "who?", "how?", "when?", "where?", "really?", "ready?", "yes!", "no!",
  "wow!", "stop!", "go!", "hello!", "thanks!", "wait!", "note:", "re:", "to:", "from:",
  "subject:", "date:", "time:", '"quote"', '"hello"', '"yes"', '"word"', '"home"',
  "#tag", "#home", "#news", "#love", "#music", "@home", "@work", "@you", "@team",
  "$name", "$value", "$home", "%path%", "%home%", "%user%", "R&D", "Q&A", "you&me",
  "this&that", "*note*", "*very*", "*not*", "this|that", "yes|no", "left|right",
  "<html>", "<body>", "<head>", "<title>", "<main>", "<form>", "<table>", "<style>",
  "{name}", "{value}", "{date}", "{user}", "{title}", "C++", "A+", "salt+pepper",
  "this+that", "What?", "Why?", "Yes!", "Hello!", "Dear:",
]

// The Fn layer's number pad: right-hand digits, + - * / and . beside them,
// = on Fn + the right Tab. True sums, so they read as arithmetic.
const PAD_DIGITS = "0123456789."
const PAD_OPS = "+-*/="
const padKeys = (s: string) =>
  KEYS.filter((k) => k.fn && s.includes(k.fn)).map((k) => k.id)

const padNumbers = () =>
  distinct(120, () =>
    pick([
      () => String(rnd(10)),
      () => String(10 + rnd(90)),
      () => String(100 + rnd(900)),
      () => `${rnd(100)}.${rnd(10)}${rnd(10)}`,
      () => `0.${1 + rnd(9)}`,
      () => `${1 + rnd(9)}.${rnd(10)}`,
    ])()
  )

const padSums = () =>
  distinct(120, () => {
    const a = 1 + rnd(12)
    const b = 1 + rnd(12)
    return pick([
      () => `${a}+${b}=${a + b}`,
      () => `${a + b}-${b}=${a}`,
      () => `${a}*${b}=${a * b}`,
      () => `${a * b}/${b}=${a}`,
      () => `${a}.5+${b}.5=${a + b + 1}`,
    ])()
  })

// ---- the levels -----------------------------------------------------------

type Def = Omit<Level, "n" | "practice" | "make"> & {
  source: Source
  // What it adds to what later levels can type.
  teaches: string
  most?: number
}

// Practice rounds at most, by letter level: more at the start, fewer as the
// levels ramp up. Every level after the letters gets two.
const LETTER_PRACTICE = [6, 6, 5, 5, 4, 4, 3, 3, 3, 2, 2, 2]

const LETTER_DEFS: Def[] = [
  {
    id: "home-rest",
    group: "Home row",
    title: "The resting keys",
    blurb:
      "Rest your fingers on A O E U and H T N S and keep them there: every other key is a reach from one of these eight. Space goes to the thumb of the hand that did not type the last letter, so the hands take turns.",
  },
  {
    id: "home-id",
    group: "Home row",
    title: "I and D",
    blurb:
      "Each pointer finger reaches one key toward the middle: I on the left, D on the right. That is the whole home row: every vowel under the left hand, the commonest consonants under the right.",
  },
  {
    id: "right-gc",
    group: "Right hand, up",
    title: "G and C",
    blurb:
      "Straight up from H and T, with the right pointer and middle fingers. KeBe's columns don't lean, so up is straight up.",
  },
  {
    id: "right-rl",
    group: "Right hand, up",
    title: "R and L",
    blurb: "Straight up from N and S, with the right ring finger and pinky.",
  },
  {
    id: "right-fb",
    group: "Right hand, up",
    title: "F and B",
    blurb:
      "The right pointer finger's other column, above and below D: F up, B down.",
  },
  {
    id: "left-p",
    group: "Left hand, up",
    title: "P and .",
    blurb:
      "Now the left hand: P straight up from U with the pointer finger, the period up from E with the middle finger.",
  },
  {
    id: "left-comma",
    group: "Left hand, up",
    title: ", and '",
    blurb:
      "Up from O and A: the comma for the ring finger, the apostrophe for the pinky.",
  },
  {
    id: "left-yx",
    group: "Left hand, up",
    title: "Y and X",
    blurb:
      "The left pointer finger's other column, above and below I: Y up, X down.",
  },
  {
    id: "bottom-mw",
    group: "Bottom row",
    title: "M and W",
    blurb: "Down from H and T, with the right pointer and middle fingers.",
  },
  {
    id: "bottom-vz",
    group: "Bottom row",
    title: "V and Z",
    blurb: "Down from N and S, with the right ring finger and pinky.",
  },
  {
    id: "bottom-kj",
    group: "Bottom row",
    title: "K and J",
    blurb: "Down from U and E, with the left pointer and middle fingers.",
  },
  {
    id: "bottom-q",
    group: "Bottom row",
    title: "Q and ;",
    blurb:
      "Down from O and A: Q for the ring finger, the semicolon for the pinky. That is every letter.",
  },
].map((d, i) => ({
  ...d,
  adds: keysFor(LETTER_STEPS[i]),
  source: letterSource(i),
  teaches: LETTER_STEPS[i],
  most: LETTER_PRACTICE[i],
}))

const DIGIT_STEPS = ["7890", "1234", "56"]
const NUMBER_DEFS: Def[] = [
  {
    id: "num-right",
    title: "7 8 9 0",
    blurb: "Two rows up from H T N S, over the right hand's home keys.",
  },
  {
    id: "num-left",
    title: "1 2 3 4",
    blurb: "Two rows up from A O E U, over the left hand's home keys.",
  },
  {
    id: "num-56",
    title: "5 and 6",
    blurb:
      "The pointer fingers' other columns, two rows up: 5 over I, 6 over D. The two keys between them are for symbols.",
  },
].map((d, i) => ({
  ...d,
  group: "Number row",
  adds: keysFor(DIGIT_STEPS[i]),
  source: numberSource(DIGIT_STEPS[i]),
  teaches: DIGIT_STEPS[i],
}))

const MIDDLE_DEFS: Def[] = [
  {
    id: "mid-slash",
    title: "/ and \\",
    blurb:
      "The two middle keys of the home row, one for each pointer finger: symbols a standard keyboard leaves to the right pinky.",
  },
  {
    id: "mid-brackets",
    title: "[ and ]",
    blurb: "The middle keys of the top row, for the pointer fingers again.",
  },
  {
    id: "mid-dash",
    title: "- and =",
    blurb: "The middle keys of the number row.",
  },
].map((d, i) => ({
  ...d,
  group: "Middle columns",
  adds: keysFor(MIDDLE_STEPS[i]),
  source: listSource(MIDDLE, MIDDLE_STEPS[i]),
  teaches: MIDDLE_STEPS[i],
}))

const MODIFIER_DEFS: Def[] = [
  {
    id: "mod-caps",
    group: "Modifiers",
    title: "Capitals",
    adds: [SHIFT.left, SHIFT.right],
    blurb:
      "Hold Shift with the other hand: the right Shift for a left-hand letter, the left Shift for a right-hand one.",
    source: {
      fresh: UPPER,
      pool: (known) =>
        [...TOP_WORDS.map(capital), ...PROPER].filter(only(known + UPPER)),
    },
    teaches: UPPER,
  },
  {
    id: "mod-parens",
    group: "Modifiers",
    title: "( and )",
    adds: [SHIFT.left, SHIFT.right],
    taps: "()",
    blurb:
      "Tap a Shift without holding it and it types a bracket: ( on the left, ) on the right.",
    source: listSource(TAPPED, "()"),
    teaches: "()",
  },
  {
    id: "mod-taps",
    group: "Modifiers",
    title: "[ ] = _",
    adds: ["CH57", "CH68", "CH60", "CH65"],
    taps: "()[]=_",
    blurb:
      "Ctrl and Alt type when tapped too: [ and ] on the Ctrls, = on the left Alt, _ on the right Alt. Held, they are Ctrl and Alt as usual.",
    source: listSource(TAPPED, "_[]="),
    teaches: "_",
  },
  {
    id: "mod-shifted",
    group: "Modifiers",
    title: "Shifted symbols",
    adds: [],
    taps: "()[]=_",
    blurb:
      "Shift with the number row and the punctuation: ! @ # $ % & * over the digits, and ? : \" | < > { } + from the keys you know.",
    source: listSource(SHIFTED, SHIFTED_CHARS),
    teaches: SHIFTED_CHARS,
  },
]

const FN_DEFS: Def[] = [
  {
    id: "fn-pad",
    group: "Fn layer",
    title: "Number pad",
    adds: [FN.left, FN.right, ...padKeys(PAD_DIGITS)],
    fn: PAD_DIGITS,
    blurb:
      "Hold Fn with the left hand and the right hand becomes a number pad: 7 8 9 on G C R, 4 5 6 on H T N, 1 2 3 on M W V, 0 on B and . on Z.",
    source: {
      fresh: PAD_DIGITS,
      pool: padNumbers,
    },
    teaches: "",
  },
  {
    id: "fn-sums",
    group: "Fn layer",
    title: "Arithmetic",
    adds: padKeys(PAD_OPS),
    fn: PAD_DIGITS + PAD_OPS,
    blurb:
      "Still holding Fn: * on F, / on L, + on D, − on S and = on the right Tab. The rest of the Fn layer is arrows, F-keys, media and lighting, which type no text, and ` on Fn + Esc (~ with Shift).",
    source: {
      fresh: PAD_OPS,
      pool: padSums,
    },
    teaches: "",
  },
]

const DEFS = [...LETTER_DEFS, ...NUMBER_DEFS, ...MIDDLE_DEFS, ...MODIFIER_DEFS, ...FN_DEFS]

export const LEVELS: Level[] = DEFS.map(({ source, teaches, most, ...d }, i) => {
  const known = DEFS.slice(0, i)
    .map((p) => p.teaches)
    .join("")
  return { ...d, n: i + 1, ...rounds(source, known, most ?? 2) }
})

export const GROUPS = LEVELS.reduce<string[]>(
  (gs, l) => (gs.includes(l.group) ? gs : [...gs, l.group]),
  []
)

// The keys each level's board shows as learned: everything the levels
// before it added, plus Space and Backspace from the start.
export function learnedBefore(n: number): Set<string> {
  const s = new Set<string>(["CH29", "CH61", "CH64"])
  for (const l of LEVELS) if (l.n < n) l.adds.forEach((k) => s.add(k))
  return s
}

// The speed test: ten of the 1,000, no punctuation, every key in play.
export function speedTest(avoid: Set<string>): string[] {
  const fresh = TOP_WORDS.filter((w) => !avoid.has(w))
  return shuffle(fresh).slice(0, TEST_WORDS)
}
