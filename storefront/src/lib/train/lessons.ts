// The lessons: the layout's logic, so someone who has never seen it can find
// any letter by reasoning rather than by drilling every key (owner, 14 Oct
// 2026: "more and less explicit at the same time"). Each opens a chapter of
// the course (course.ts) and starts with a guess: the learner predicts the
// rule before it is said. Then it tests the rule without saying the keys:
// first the board lights WHERE to press and the learner finds out WHAT it
// types (legends dark until pressed), then the letters on their own with the
// legends dark, then real words with the next key lit only after a pause.
// The home row ends on every one of its words before anything else (owner,
// 14 Oct 2026). A miss is explained by the rule: "That's G. C is above T,
// right middle finger." Figures are scripts/layout-stats.py's.
import { KEYS, Key, KEY_BY_ID, SHIFT, SPACE, strokeFor, touchName, touchOf } from "./layout"
import { TOP_WORDS } from "./words"

export type Drill = {
  // The characters to press, in order.
  text: string
  // How the box shows them: "where" names each key's place (say) and lights
  // it; "which" shows each character alone; "words" shows the whole text.
  show: "where" | "which" | "words"
  say?: string[]
  // Keys in play on the board, and the characters whose legends stay dark
  // until pressed in this drill.
  lit: string[]
  blind: string
  // Milliseconds before the next key lights by itself (0: at once). A miss
  // lights it straight away.
  hint: number
  // Words shown at a time, for a long list.
  page?: number
}

// A guess before the rule: any answer goes on, and the reveal says why.
export type Choice = {
  options: string[]
  answer: number
  reveal: string
  // Keys lit once answered (legends stay dark: finding them is next).
  shows: string[]
}

export type Step = {
  title: string
  // The rule, said outright.
  body: string
  // What to do, shown over the play area.
  act?: string
  // Made fresh each time the step starts, so a retry gets new words.
  drill?: () => Drill
  choice?: Choice
  // Keys lit on a step with no drill, and the legends kept dark.
  lit?: string[]
  blind?: string
  after?: string
}

export type Lesson = { id: string; title: string; steps: Step[] }

const HOME = "aoeuidhtns"
const TOP = "',.pyfgcrl"
const BOTTOM = ";qjkxbmwvz"

// ---- keys and places --------------------------------------------------------

export const keyOf = (ch: string): Key | undefined => {
  const s = strokeFor(ch)
  return s ? KEY_BY_ID[s.keys[0]] : undefined
}

const ids = (chars: string) =>
  Array.from(new Set(chars.split("").flatMap((c) => strokeFor(c)?.keys ?? [])))
const SPACES = [SPACE.left, SPACE.right]

const NAMES: Record<string, string> = {
  "'": "the apostrophe",
  ",": "the comma",
  ".": "the period",
  ";": "the semicolon",
  " ": "Space",
}
export const label = (ch: string) => NAMES[ch] ?? ch.toUpperCase()

const homeAt = (col: number) =>
  (KEYS.find((k) => k.row === 2 && k.col === col)?.base ?? "").toUpperCase()

// A key's place, said from the home row: every other key is straight above
// or below a home key, struck by the same finger.
export function place(k: Key): string {
  if (k.row === 2)
    return k.col === 5 ? "one key in from U" : k.col === 8 ? "one key in from H" : "on the home row"
  if (k.row === 4) return "on the thumbs' row"
  return `${k.row === 1 ? "above" : k.row === 3 ? "below" : "two rows above"} ${homeAt(k.col)}`
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

// What a miss teaches: what was pressed, and where the wanted key is by the
// rule, never just "wrong". Where finding out what a key types is the point
// (`hide`), it places the key pressed instead of naming the wanted one.
export function coach(got: string, want: string, hide = false): string {
  const w = keyOf(want)
  const g = keyOf(got)
  if (hide && g && g.id !== w?.id)
    return `That's ${label(got)}, ${place(g)}, ${touchName(touchOf(g))}. Try the lit key.`
  if (!w) return `That's ${label(got)}.`
  if (want === " ") return `That's ${label(got)}. The word is done: Space, with a thumb.`
  if (g?.id === w.id && got !== want)
    return want === want.toUpperCase()
      ? `Right key: now hold Shift with your ${touchOf(w).hand === "left" ? "right" : "left"} pinky.`
      : "Right key, without Shift."
  return `That's ${label(got)}. ${cap(label(want))} is ${place(w)}, ${touchName(touchOf(w))}.`
}

// ---- reading any keyboard --------------------------------------------------

// KeBe's letter block sits where QWERTY's does, so on any other keyboard the
// learner presses the key in the same place and the browser's physical key
// code says which one it is, whatever the computer's layout. A KeBe sends its
// own letters instead (QMK types them), so there the character is read.
const CODES = [
  "KeyQ KeyW KeyE KeyR KeyT KeyY KeyU KeyI KeyO KeyP",
  "KeyA KeyS KeyD KeyF KeyG KeyH KeyJ KeyK KeyL Semicolon",
  "KeyZ KeyX KeyC KeyV KeyB KeyN KeyM Comma Period Slash",
]
const BY_CODE: Record<string, string> = Object.fromEntries(
  CODES.flatMap((row, r) => row.split(" ").map((code, i) => [code, [TOP, HOME, BOTTOM][r][i]]))
)

// A field typed into keeps every key. The trainer's one input is a
// checkbox, which doesn't: a click on it must not stop the typing.
export const TEXT_FIELD = "select, textarea, input:not([type=checkbox])"

// Whether a focused control keeps Space and Enter for itself: only one
// reached by keyboard, its focus ring showing. One just clicked, or the
// results card, hands them to the game (14 Oct 2026).
export function keepsKeys(el: Element | null) {
  if (!el?.closest?.("button, a, input")) return false
  try {
    return el.matches(":focus-visible")
  } catch {
    return true // a browser without :focus-visible: the old rule
  }
}

export function typedChar(e: { key: string; code: string; shiftKey: boolean }, onKebe: boolean) {
  const base = onKebe ? undefined : BY_CODE[e.code]
  if (!base) return e.key
  return e.shiftKey ? KEYS.find((k) => k.base === base)?.shift ?? base : base
}

// ---- drills -------------------------------------------------------------------

const rnd = (n: number) => Math.floor(Math.random() * n)
function shuffle<T>(xs: T[]): T[] {
  const a = xs.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const only = (allowed: string) => (w: string) => w.split("").every((c) => allowed.includes(c))
const uses = (wanted: string) => (w: string) => w.split("").some((c) => wanted.includes(c))

// The row's keys in place: each found by its place on the board.
const find = (chars: string, say: string[], lit: string, blind = chars): Drill => ({
  text: chars,
  show: "where",
  say,
  lit: [...ids(lit), ...SPACES],
  blind,
  hint: 0,
})

const places = (chars: string) => chars.split("").map((c) => cap(place(keyOf(c)!)))

// Each of these once, in a random order, legends dark.
const which = (chars: string, lit: string): Drill => ({
  text: shuffle(chars.split("")).join(""),
  show: "which",
  lit: [...ids(lit), ...SPACES],
  blind: lit,
  hint: 4000,
})

// The `n` commonest of the 1,000 commonest words (all of them when n is 0),
// typeable with `known`, each using one of `fresh`, in a random order. The
// commonest, not a random n: they are the ones worth learning first (owner,
// 14 Oct 2026).
export const wordsFor = (known: string, fresh: string) =>
  TOP_WORDS.filter((w) => only(known)(w) && uses(fresh)(w))
const words = (known: string, fresh: string, n = 10): Drill => {
  const all = wordsFor(known, fresh)
  return {
    text: shuffle(n ? all.slice(0, n) : all).join(" "),
    show: "words",
    lit: [...ids(known), ...SPACES],
    blind: known,
    hint: 1500,
    page: n ? undefined : 10,
  }
}

// Every letter in one sentence, for the last lesson.
export const PANGRAMS = [
  "The quick brown fox jumps over the lazy dog.",
  "Pack my box with five dozen liquor jugs.",
  "Sphinx of black quartz, judge my vow.",
  "The five boxing wizards jump quickly.",
  "Jackdaws love my big sphinx of quartz.",
]

const ALL = HOME + TOP + BOTTOM

export const LESSONS: Lesson[] = [
  {
    id: "learn-home",
    title: "Home row",
    steps: [
      {
        title: "Guess first",
        body: "Your eight fingers rest on the middle row of letters, the home row, and your thumbs on the space bars. Dvorak put all five vowels under one hand there, and the commonest consonants under the other.",
        act: "Which hand gets the vowels?",
        lit: ids(HOME),
        blind: HOME,
        choice: {
          options: ["The left hand", "The right hand"],
          answer: 0,
          reveal:
            "The left. Nearly every syllable needs a vowel and a consonant, so with the two on different hands, your hands take turns: one types while the other gets ready.",
          shows: ids("aoeui"),
        },
      },
      {
        title: "Where your hands rest",
        body: "Each finger only ever presses the keys in its own column, lit in that finger's colour. Find out what the eight home keys type.",
        act: "Press each lit key, left pinky to right pinky",
        drill: () =>
          find(
            "aoeuhtns",
            ["Left pinky", "Left ring finger", "Left middle finger", "Left pointer", "Right pointer", "Right middle finger", "Right ring finger", "Right pinky"],
            HOME,
            HOME
          ),
        after: "A O E U under the left hand: vowels. H T N S under the right: the commonest consonants.",
      },
      {
        title: "One key in",
        body: "Each pointer finger also takes the key beside it, toward the middle.",
        act: "Reach in with the left pointer, then the right",
        drill: () => find("id", ["Left pointer, one key in", "Right pointer, one key in"], HOME, "id"),
        after:
          "I joins the vowels and D the consonants. These ten keys type 71% of English letters; QWERTY's home row types 34%.",
      },
      {
        title: "No labels",
        body: "Vowels left: A O E U from the pinky in, and I one reach further. Consonants right: H T N S from the pointer out, and D one reach in.",
        act: "The labels are off. Press each letter",
        drill: () => which(HOME, HOME),
      },
      {
        // Not all 91 home-row words at once, which read as a 90-word test
        // at the start (owner, 14 Oct 2026): the ten commonest, and the
        // levels take the rest a few at a time.
        title: "The commonest home-row words",
        body: "Ten of the most common English words, all on the home row. After each word, Space with the thumb of the hand that didn't type its last letter.",
        act: "Type them. A key lights up if you pause",
        drill: () => words(HOME, HOME, 10),
        after:
          "That's the home row: on this layout 70% of letter pairs switch hands, on QWERTY 52%. Next, its levels build speed. There a wrong key stays typed, and Backspace takes it back.",
      },
    ],
  },
  {
    id: "learn-top",
    title: "Top row",
    steps: [
      {
        title: "Guess first",
        body: "The top row is the next easiest reach: each finger goes straight up its own column. Above the right hand's consonants sit more consonants, F G C R L.",
        act: "What goes above the vowels, under the left hand?",
        lit: ids(HOME + TOP),
        blind: TOP,
        choice: {
          options: ["More vowels", "Punctuation", "The rarest letters"],
          answer: 1,
          reveal:
            "Punctuation: the apostrophe, comma and period, which end words and sentences, then P and Y under the pointer.",
          shows: ids("',.py"),
        },
      },
      {
        title: "Straight up",
        body: "Same finger, one row up: the home key underneath tells you which finger.",
        act: "Press each lit key, left to right",
        drill: () => find(TOP, places(TOP), HOME + TOP, TOP),
        after: "Left: ' , . P Y. Right: F G C R L.",
      },
      {
        title: "No labels",
        body: "Find each one by its column: which home key is it above?",
        act: "Press each one",
        drill: () => which(TOP, HOME + TOP),
      },
      {
        title: "Words",
        body: "Both rows now: most of English is in reach.",
        act: "Type them",
        drill: () => words(HOME + TOP, "pyfgcrl'", 12),
      },
    ],
  },
  {
    id: "learn-bottom",
    title: "Bottom row",
    steps: [
      {
        title: "Guess first",
        body: "Curling a finger down to the bottom row is the hardest reach of all.",
        act: "Which letters belong there?",
        lit: ids(ALL),
        blind: BOTTOM,
        choice: {
          options: ["The most used", "The least used"],
          answer: 1,
          reveal:
            "The least used: together just 8.5% of typing, against 15% on QWERTY's bottom row. The five rarest letters, Q J K X and Z, are all down here.",
          shows: ids(BOTTOM),
        },
      },
      {
        title: "Down for the rest",
        body: "Same finger, one row down from its home key.",
        act: "Press each lit key, left to right",
        drill: () => find(BOTTOM, places(BOTTOM), ALL, BOTTOM),
        after: "Left: the semicolon, then Q J K X. Right: B M W V Z.",
      },
      {
        title: "No labels",
        body: "Which home key is each one under?",
        act: "Press each one",
        drill: () => which(BOTTOM, ALL),
      },
      {
        title: "Words",
        body: "Every letter is in play now.",
        act: "Type them",
        drill: () => words(ALL, "qjkxbmwvz;", 12),
      },
    ],
  },
  {
    id: "learn-caps",
    title: "Capitals",
    steps: [
      {
        title: "Guess first",
        body: "A capital is a letter with Shift held down, and each hand has a Shift under its pinky.",
        act: "A is under your left pinky. Which hand holds Shift for a capital A?",
        lit: [...ids(ALL), SHIFT.left, SHIFT.right],
        choice: {
          options: ["The left hand", "The right hand"],
          answer: 1,
          reveal:
            "The right: always the hand that isn't typing the letter, so one hand holds while the other strikes.",
          shows: [SHIFT.right, ...ids("a")],
        },
      },
      {
        title: "Capitals",
        body: "The right Shift for a letter on the left, the left Shift for a letter on the right.",
        act: "Type them",
        drill: () => {
          const d = words(ALL, ALL, 6)
          d.text = d.text
            .split(" ")
            .map((w) => w[0].toUpperCase() + w.slice(1))
            .join(" ")
          d.lit.push(SHIFT.left, SHIFT.right)
          return d
        },
      },
      {
        title: "Every letter",
        body: "A sentence with all 26 letters and no labels at all. Find each key by its row and column.",
        act: "Type it. A key lights up if you stop for three seconds",
        drill: () => ({
          text: PANGRAMS[rnd(PANGRAMS.length)],
          show: "words",
          lit: [...ids(ALL), ...SPACES, SHIFT.left, SHIFT.right],
          blind: ALL,
          hint: 3000,
        }),
        after:
          "You know where every letter is. Speed comes with practice: the levels build it one key at a time.",
      },
    ],
  },
  {
    id: "learn-extras",
    title: "The Breeze's extras",
    steps: [
      {
        title: "Guess first",
        body: "On the Breeze, a Shift tapped on its own, without a letter, types something.",
        act: "What would be most useful?",
        lit: [SHIFT.left, SHIFT.right, ...ids(ALL)],
        choice: {
          options: ["Nothing", "Brackets", "A space"],
          answer: 1,
          reveal:
            "Brackets: ( from the left Shift, ) from the right. Tapped, the Ctrls type [ and ], and the Alts = and _. Held, each works as usual.",
          shows: [SHIFT.left, SHIFT.right, "CH57", "CH68", "CH60", "CH65"],
        },
      },
      {
        title: "The rest of the board",
        body: "Numbers run along the top in the usual order. The two middle columns hold symbols a standard keyboard leaves to the right pinky: / and \\ between the home rows, [ ] above them, - and = among the numbers. Held, Fn turns the right hand into a number pad. Backspace is one key out from A, under the left pinky; Enter one out from S.",
        lit: ids("1234567890-=[]/\\").concat(SHIFT.left, SHIFT.right, "CH57", "CH68", "CH60", "CH65", "CH59", "CH66", "CH29", "CH42"),
        after:
          "The levels ahead teach each of these in turn. They need the Breeze: other keyboards don't have these keys.",
      },
    ],
  },
]

// Each lesson's guess has an answer among its options.
for (const l of LESSONS)
  for (const s of l.steps)
    if (s.choice && !s.choice.options[s.choice.answer]) throw new Error(`${l.id}: no answer`)
