// The typing trainer's levels and its 10-word speed test. Every word comes
// from the 1,000 most common English words (words.ts); a level takes only the
// ones its keys can type.
//
// The order is the owner's (5 Oct 2026): four home keys to start, A E T S,
// the fewest that make a round of real words (ten of the thousand; three
// keys make five), then one key at a time: O N U H I D to finish the home
// row, then (owner, 6 Oct 2026) the top row's G C R L and P . , ', the
// pointer fingers' reaches F Y, the bottom row's right hand B M W V Z, then
// the numbers, symbols and Fn layer, and last of all the bottom row's left
// hand, the rarest letters, X K J Q ;, so the game ends on the semicolon. Then the number row, the middle
// columns, the modifiers and the Fn layer, a few keys a level.
//
// One key a level makes the levels themselves the build-up, so each is a
// single round: ten fresh random words, every one using the new key where
// the thousand words allow, and its target speed (`pass`) opens the next.
// Only whole words, never letters on their own: a word is learned as one
// movement, like a chord. The targets drop after the letters, where the
// reaches are longer and the words are not prose (owner, 5 Oct 2026).
import { FN, KEYS, SHIFT } from "./layout"
import { TOP_WORDS } from "./words"

// The letters' target; later levels set their own.
export const PASS_WPM = 60
export const TEST_WORDS = 10

// Stars on a level: one for reaching its target, two at 1.25 times it, three
// at 1.5 times (60, 75, 90 on the letters).
export const starsFor = (wpm: number | undefined, pass = PASS_WPM) =>
  [1, 1.25, 1.5].filter((f) => (wpm ?? 0) >= Math.round(pass * f)).length

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
  // Words a minute that pass it and open the next level.
  pass: number
  // Ten words for a round.
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
    // A punctuation key's own level puts it after most words.
    const often = chars(fresh).every((c) => MARKS.includes(c)) ? 0.8 : 0.4
    if (extra.length && Math.random() < often) return w + pick(extra)
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

// Ten words for a round: the level's own, topped up from the fallback
// rather than repeated when the thousand words have few (Z has three).
function round(src: Source, known: string) {
  return (avoid: Set<string>) => {
    const words = focused(src.pool(known), src.fresh, TEST_WORDS, avoid)
    if (words.length < TEST_WORDS && src.fallback) {
      // In the fallback's order (the key before's words first), each once,
      // the last round's words only after the others: O has three words and
      // a fallback of ten, so leaving those out would repeat words.
      const fb = Array.from(new Set(src.fallback(known))).filter(
        (w) => !words.includes(w)
      )
      const fresh = fb.filter((w) => !avoid.has(bare(w)))
      const seen = fb.filter((w) => avoid.has(bare(w)))
      words.push(...[...fresh, ...seen].slice(0, TEST_WORDS - words.length))
    }
    return punctuate(shuffle(fill(words, TEST_WORDS)), known, src.fresh)
  }
}

// Letters: each step's new key. "'" makes contractions typeable, and , . ;
// go after words.
const LETTER_STEPS = [
  "aets", "o", "n", "u", "h", "i", "d",
  "g", "c", "r", "l", "p", ".", ",", "'", "f", "y",
  "b", "m", "w", "v", "z",
  "x", "k", "j", "q", ";",
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
  // Short of words (Z, say, or a punctuation key): the step before's, then
  // anything known.
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
// The capitals level teaches Shift, not new keys: after it, a capital is
// typeable once its letter is, so the levels after it (K J Q ; X) bring
// their own capitals with them. "⇧" in what is known stands for it.
const SHIFT_MARK = "⇧"
const withCapitals = (known: string) =>
  known.includes(SHIFT_MARK)
    ? known + chars(known).filter((c) => LETTERS.includes(c)).join("").toUpperCase()
    : known
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
  "this+that", "Dear:",
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

type Def = Omit<Level, "n" | "make" | "pass"> & {
  source: Source
  // What it adds to what later levels can type.
  teaches: string
  pass?: number
}

// [id, group, title, blurb] for each letter step.
const LETTER_INFO: [string, string, string, string][] = [
  ["home-aets", "Home row", "A E T S", "Four keys to start: A and E under the left pinky and middle finger, T and S under the right middle finger and pinky. Space goes to the thumb of the hand that did not type the word's last letter."],
  ["key-o", "Home row", "O", "The left ring finger's home key, between A and E."],
  ["key-n", "Home row", "N", "The right ring finger's home key, between T and S."],
  ["key-u", "Home row", "U", "The left pointer finger's home key, beside E."],
  ["key-h", "Home row", "H", "The right pointer finger's home key, beside T."],
  ["key-i", "Home row", "I", "The left pointer finger reaches in from U."],
  ["key-d", "Home row", "D", "The right pointer finger reaches in from H. That is every home-row letter."],
  ["key-g", "Top row", "G", "Straight up from H, with the right pointer finger."],
  ["key-c", "Top row", "C", "Straight up from T, with the right middle finger."],
  ["key-r", "Top row", "R", "Straight up from N, with the right ring finger."],
  ["key-l", "Top row", "L", "Straight up from S, with the right pinky."],
  ["key-p", "Top row", "P", "Straight up from U, with the left pointer finger."],
  ["key-period", "Top row", "Period", "Straight up from E, with the left middle finger."],
  ["key-comma", "Top row", "Comma", "Straight up from O, with the left ring finger."],
  ["key-apostrophe", "Top row", "Apostrophe", "Straight up from A, with the left pinky."],
  ["key-f", "Top row", "F", "Up from D, with the right pointer finger."],
  ["key-y", "Top row", "Y", "Up from I, with the left pointer finger. That is every top-row letter."],
  ["key-b", "Bottom row, right hand", "B", "Down from D, with the right pointer finger."],
  ["key-m", "Bottom row, right hand", "M", "Straight down from H, with the right pointer finger."],
  ["key-w", "Bottom row, right hand", "W", "Straight down from T, with the right middle finger."],
  ["key-v", "Bottom row, right hand", "V", "Straight down from N, with the right ring finger."],
  ["key-z", "Bottom row, right hand", "Z", "Straight down from S, with the right pinky."],
  ["key-x", "Bottom row, left hand", "X", "Down from I, with the left pointer finger."],
  ["key-k", "Bottom row, left hand", "K", "Straight down from U, with the left pointer finger."],
  ["key-j", "Bottom row, left hand", "J", "Straight down from E, with the left middle finger."],
  ["key-q", "Bottom row, left hand", "Q", "Straight down from O, with the left ring finger."],
  ["key-semicolon", "Bottom row, left hand", "Semicolon", "Straight down from A, with the left pinky; with Shift, it types a colon. That is every letter, and the last level."],
]

const LETTER_DEFS: Def[] = LETTER_INFO.map(([id, group, title, blurb], i) => ({
  id,
  group,
  title,
  blurb,
  adds: keysFor(LETTER_STEPS[i]),
  source: letterSource(i),
  teaches: LETTER_STEPS[i],
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
  pass: 40,
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
  pass: 40,
  adds: keysFor(MIDDLE_STEPS[i]),
  source: listSource(MIDDLE, MIDDLE_STEPS[i]),
  teaches: MIDDLE_STEPS[i],
}))

const MODIFIER_DEFS: Def[] = [
  {
    id: "mod-caps",
    group: "Modifiers",
    title: "Capitals",
    pass: 50,
    adds: [SHIFT.left, SHIFT.right],
    blurb:
      "Hold Shift with the other hand: the right Shift for a left-hand letter, the left Shift for a right-hand one.",
    source: {
      fresh: UPPER,
      pool: (known) =>
        [...TOP_WORDS.map(capital), ...PROPER].filter(only(withCapitals(known + SHIFT_MARK))),
    },
    teaches: SHIFT_MARK,
  },
  {
    id: "mod-parens",
    group: "Modifiers",
    title: "( and )",
    pass: 40,
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
    pass: 40,
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
    pass: 30,
    adds: [],
    taps: "()[]=_",
    blurb:
      "Shift with the number row and the punctuation: ! @ # $ % & * over the digits, and ? \" | < > { } + from the keys you know.",
    source: {
      fresh: SHIFTED_CHARS,
      // Only the symbols whose key is learned: the colon waits for the
      // semicolon key, which comes last.
      pool: (known) => {
        const ok = KEYS.filter((k) => k.base && k.shift && known.includes(k.base))
          .map((k) => k.shift)
          .filter((c) => SHIFTED_CHARS.includes(c!))
          .join("")
        return SHIFTED.filter((t) => only(known + ok)(t) && some(ok)(t))
      },
    },
    teaches: SHIFTED_CHARS,
  },
]

const FN_DEFS: Def[] = [
  {
    id: "fn-pad",
    group: "Fn layer",
    title: "Number pad",
    pass: 35,
    adds: [FN.left, FN.right, ...padKeys(PAD_DIGITS)],
    fn: PAD_DIGITS,
    blurb:
      "Hold Fn with the left hand and the right hand becomes a number pad: 7 8 9 on G C R, 4 5 6 on H T N, 1 2 3 on M W V, 0 on B and . on Z. Backspace and Esc still work with Fn held.",
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
    pass: 30,
    adds: padKeys(PAD_OPS),
    fn: PAD_DIGITS + PAD_OPS,
    blurb:
      "Still holding Fn: * on F, / on L, + on D, − on S and = on the right Tab. The rest of the Fn layer types no text: arrows, Home/End, PgUp/PgDn, F-keys, Delete, Insert, Print Screen, Menu, Calculator, media, lighting, Num Lock and AUTO (autocorrect on and off); ` is on Fn + Esc (~ with Shift).",
    source: {
      fresh: PAD_OPS,
      pool: padSums,
    },
    teaches: "",
  },
]

// The letters up to Z, everything else, then X K J Q ;.
const LAST_LETTERS = LETTER_DEFS.findIndex((d) => d.id === "key-x")
const DEFS = [
  ...LETTER_DEFS.slice(0, LAST_LETTERS),
  ...NUMBER_DEFS,
  ...MIDDLE_DEFS,
  ...MODIFIER_DEFS,
  ...FN_DEFS,
  ...LETTER_DEFS.slice(LAST_LETTERS),
]

export const LEVELS: Level[] = DEFS.map(({ source, teaches, pass, ...d }, i) => {
  const known = DEFS.slice(0, i)
    .map((p) => p.teaches)
    .join("")
  return {
    ...d,
    n: i + 1,
    pass: pass ?? PASS_WPM,
    make: round(source, withCapitals(known)),
  }
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
