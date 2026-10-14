// The Learn tab: the layout's logic in five short lessons, so someone who
// has never seen it can find any letter by reasoning rather than by drilling
// every key (owner, 14 Oct 2026: "more and less explicit at the same time").
// Each lesson says a rule outright, then tests it without saying the keys:
// first the board lights WHERE to press and the learner finds out WHAT it
// types (legends dark until pressed), then the letters on their own with the
// legends dark, then real words with the next key lit only after a pause.
// A miss is explained by the rule: "That's G. C is above T, right middle
// finger." Figures are scripts/layout-stats.py's.
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
}

export type Step = {
  title: string
  body: string
  // Made fresh each time the step starts, so a retry gets new words.
  drill?: () => Drill
  // Keys lit on a step with no drill.
  lit?: string[]
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

// Eight of the 1,000 commonest words, typeable with `known`, each using one
// of `fresh`.
const words = (known: string, fresh: string, extra = ""): Drill => ({
  text: shuffle(TOP_WORDS.filter((w) => only(known)(w) && uses(fresh)(w)))
    .slice(0, 8)
    .join(" "),
  show: "words",
  lit: [...ids(known + extra), ...SPACES],
  blind: known,
  hint: 1500,
})

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
        title: "Where your hands rest",
        body: "Eight fingers rest on the middle row, the home row, and the thumbs on the space bars. Each finger only presses the keys in its own column, lit here in that finger's colour. Press each lit key, left pinky to right pinky, and see what they type.",
        drill: () =>
          find(
            "aoeuhtns",
            ["Left pinky", "Left ring finger", "Left middle finger", "Left pointer", "Right pointer", "Right middle finger", "Right ring finger", "Right pinky"],
            HOME
          ),
        after:
          "Under the left hand, A O E U: vowels. Under the right, H T N S: the commonest consonants. That split is the layout's big idea.",
      },
      {
        title: "One key in",
        body: "Each pointer finger also takes the key beside it, toward the middle. Reach in with the left pointer, then the right.",
        drill: () => find("id", ["Left pointer, one key in", "Right pointer, one key in"], HOME, "id"),
        after:
          "I, the last vowel, joins the others on the left; D joins the right. Those ten keys type 71% of English letters, against 34% on QWERTY's home row.",
      },
      {
        title: "No labels",
        body: "The labels are off. Vowels left, A O E U from the pinky in and I one reach further; consonants right, H T N S from the pointer out and D one reach in. Press each letter.",
        drill: () => which(HOME, HOME),
      },
      {
        title: "Your first words",
        body: "Every word here uses only the home row. After each word, Space with the thumb of the hand that didn't type its last letter. The next key lights up if you pause.",
        drill: () => words(HOME, HOME),
        after:
          "Vowels on one side and consonants on the other make the hands take turns: 70% of letter pairs switch hands, against 52% on QWERTY. One hand types while the other gets ready.",
      },
    ],
  },
  {
    id: "learn-top",
    title: "Top row",
    steps: [
      {
        title: "Straight up",
        body: "Every finger reaches straight up its own column, so the home row already tells you which finger types each top key. Press the lit keys, left to right.",
        drill: () => find(TOP, places(TOP), HOME + TOP, TOP),
        after:
          "Over the consonants, more consonants: F G C R L. Over the vowels, the punctuation that ends a sentence, ' , . and then P and Y.",
      },
      {
        title: "No labels",
        body: "Find each one by its column: which home key is it above?",
        drill: () => which(TOP, HOME + TOP),
      },
      {
        title: "Words",
        body: "Words from both rows now, so most of English is in reach.",
        drill: () => words(HOME + TOP, "pyfgcrl'"),
      },
    ],
  },
  {
    id: "learn-bottom",
    title: "Bottom row",
    steps: [
      {
        title: "Down for the rest",
        body: "Curling a finger down is the hardest reach, so the bottom row gets what is left: letters that make up 8.5% of typing, against 15% on QWERTY. Press the lit keys, left to right.",
        drill: () => find(BOTTOM, places(BOTTOM), ALL, BOTTOM),
        after:
          "Right: B M W V Z. Left: the semicolon, then Q J K X. The five rarest letters, Q J K X and Z, are all down here.",
      },
      {
        title: "No labels",
        body: "Which home key is each one under?",
        drill: () => which(BOTTOM, ALL),
      },
      {
        title: "Words",
        body: "Every letter is in play now.",
        drill: () => words(ALL, "qjkxbmwvz;"),
      },
    ],
  },
  {
    id: "learn-shift",
    title: "Shift and the rest",
    steps: [
      {
        title: "Capitals",
        body: "Hold Shift with the other hand's pinky: the right Shift for a letter on the left, the left Shift for one on the right. One hand holds while the other types.",
        drill: () => {
          const d = words(ALL, ALL)
          d.text = d.text
            .split(" ")
            .slice(0, 6)
            .map((w) => w[0].toUpperCase() + w.slice(1))
            .join(" ")
          d.lit.push(SHIFT.left, SHIFT.right)
          return d
        },
      },
      {
        title: "The rest of the board",
        body: "Numbers run along the top in the usual order. KeBe's two middle columns hold symbols a standard keyboard leaves to the right pinky: / and \\ between the home rows for the pointers, [ ] above them, - = among the numbers. Tapped alone, a Shift types ( or ), a Ctrl [ or ], an Alt = or _. Held, Fn turns the right hand into a number pad. Backspace is under the left pinky, one key out from A; Enter under the right, one out from S.",
        lit: ids("1234567890-=[]/\\").concat(SHIFT.left, SHIFT.right, "CH57", "CH68", "CH60", "CH65", "CH59", "CH66", "CH29", "CH42"),
      },
    ],
  },
  {
    id: "learn-all",
    title: "Every letter",
    steps: [
      {
        title: "One sentence, every letter",
        body: "A sentence with all 26 letters, and no labels at all. Find each key by its row and column; one lights up if you stop for three seconds.",
        drill: () => ({
          text: PANGRAMS[rnd(PANGRAMS.length)],
          show: "words",
          lit: [...ids(ALL), ...SPACES, SHIFT.left, SHIFT.right],
          blind: ALL,
          hint: 3000,
        }),
        after:
          "You know where every letter is. Speed comes with practice: the levels add one key at a time, and the 10-word test times you.",
      },
    ],
  },
]
