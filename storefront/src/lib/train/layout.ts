// KeBe's 68 keys for the typing trainer, as the firmware types them: the
// Dvorak base layer and the Fn layer of keyboards/kebe/keymaps/default/
// keymap.c in the kebe repo, on the 18 x 17 mm grid. Designators (CH1..CH68)
// run row by row, 14/14/14/14/12, and name the printed cap art in
// public/train/caps.svg. The two 2U space bars span columns 4-5 and 8-9.
//
// Change this with the keymap: the caps come from the same keymap, so a
// mismatch would show a legend that does not type what the board says.

export type Hand = "left" | "right"

export type Key = {
  id: string
  row: number
  col: number
  w: 1 | 2
  // What a tap types, what Shift + the key types, and what Fn + the key
  // types, where any of them is a character a test can ask for.
  base?: string
  shift?: string
  fn?: string
  // Tap-hold keys: a tap types `tap`, a hold is `hold` (Shift, Ctrl, Alt).
  tap?: string
  name: string
}

type Row = [base: string, shift: string, fn: string][]

// One entry per key, left to right; "" where the key types no character.
// Names for keys without a character are in NAMES.
const ROWS: Row[] = [
  [
    ["", "", "`"], ["1", "!", ""], ["2", "@", ""], ["3", "#", ""], ["4", "$", ""],
    ["5", "%", ""], ["-", "_", ""], ["=", "+", ""], ["6", "^", ""], ["7", "&", ""],
    ["8", "*", ""], ["9", "(", ""], ["0", ")", ""], ["", "", ""],
  ],
  [
    ["", "", ""], ["'", '"', ""], [",", "<", ""], [".", ">", ""], ["p", "P", ""],
    ["y", "Y", ""], ["[", "{", ""], ["]", "}", ""], ["f", "F", "*"], ["g", "G", "7"],
    ["c", "C", "8"], ["r", "R", "9"], ["l", "L", "/"], ["", "", "="],
  ],
  [
    ["", "", ""], ["a", "A", ""], ["o", "O", ""], ["e", "E", ""], ["u", "U", ""],
    ["i", "I", ""], ["/", "?", ""], ["\\", "|", ""], ["d", "D", "+"], ["h", "H", "4"],
    ["t", "T", "5"], ["n", "N", "6"], ["s", "S", "-"], ["", "", ""],
  ],
  [
    ["", "", ""], [";", ":", ""], ["q", "Q", ""], ["j", "J", ""], ["k", "K", ""],
    ["x", "X", ""], ["", "", ""], ["", "", ""], ["b", "B", "0"], ["m", "M", "1"],
    ["w", "W", "2"], ["v", "V", "3"], ["z", "Z", "."], ["", "", ""],
  ],
]

const NAMES: Record<string, string> = {
  CH1: "Esc",
  CH14: "Caps Lock",
  CH15: "the left Tab",
  CH28: "the right Tab",
  CH29: "Backspace",
  CH42: "Enter",
  CH43: "the left Shift",
  CH49: "Left",
  CH50: "Right",
  CH56: "the right Shift",
  CH57: "the left Ctrl",
  CH58: "the left Super",
  CH59: "the left Fn",
  CH60: "the left Alt",
  CH61: "the left space bar",
  CH62: "Up",
  CH63: "Down",
  CH64: "the right space bar",
  CH65: "the right Alt",
  CH66: "the right Fn",
  CH67: "the right Super",
  CH68: "the right Ctrl",
}

// The bottom row: [designator, column, width, tap symbol].
const BOTTOM: [string, number, 1 | 2, string?][] = [
  ["CH57", 0, 1, "["],
  ["CH58", 1, 1],
  ["CH59", 2, 1],
  ["CH60", 3, 1, "="],
  ["CH61", 4, 2],
  ["CH62", 6, 1],
  ["CH63", 7, 1],
  ["CH64", 8, 2],
  ["CH65", 10, 1, "_"],
  ["CH66", 11, 1],
  ["CH67", 12, 1],
  ["CH68", 13, 1, "]"],
]

export const KEYS: Key[] = [
  ...ROWS.flatMap((row, r) =>
    row.map(([base, shift, fn], c): Key => {
      const id = `CH${r * 14 + c + 1}`
      const tap = id === "CH43" ? "(" : id === "CH56" ? ")" : undefined
      return {
        id,
        row: r,
        col: c,
        w: 1,
        base: base || undefined,
        shift: shift || undefined,
        fn: fn || undefined,
        tap,
        name: NAMES[id] ?? (base ? keyName(base) : id),
      }
    })
  ),
  ...BOTTOM.map(
    ([id, col, w, tap]): Key => ({ id, row: 4, col, w, tap, name: NAMES[id] })
  ),
]

function keyName(ch: string) {
  if (/[a-z]/.test(ch)) return ch.toUpperCase()
  return `the ${ch} key`
}

export const KEY_BY_ID: Record<string, Key> = Object.fromEntries(
  KEYS.map((k) => [k.id, k])
)

// Which finger presses each column. The pointer fingers rest on U and H and
// also take the two columns beside them, the middle pair included, which is
// the point of putting the symbols there. On the bottom row the thumbs take
// the space bars and the Alts beside them; Ctrl, Super and Fn go by column.
export type Finger = "pinky" | "ring" | "middle" | "pointer" | "thumb"
export type Touch = { hand: Hand; finger: Finger }

const COLUMN_FINGER: Finger[] = [
  "pinky", "pinky", "ring", "middle", "pointer", "pointer", "pointer",
  "pointer", "pointer", "pointer", "middle", "ring", "pinky", "pinky",
]
const THUMB_KEYS = new Set(["CH60", "CH61", "CH64", "CH65"])

export function handOf(key: Key): Hand {
  return key.col + (key.w - 1) / 2 < 7 ? "left" : "right"
}

export function touchOf(key: Key): Touch {
  return {
    hand: handOf(key),
    finger: THUMB_KEYS.has(key.id) ? "thumb" : COLUMN_FINGER[key.col],
  }
}

export function touchName({ hand, finger }: Touch): string {
  return `${hand} ${finger === "pinky" || finger === "thumb" ? finger : `${finger} finger`}`
}

export const SHIFT = { left: "CH43", right: "CH56" }
export const FN = { left: "CH59", right: "CH66" }
export const SPACE = { left: "CH61", right: "CH64" }
export const BACKSPACE = "CH29"

// Space goes to the thumb of the hand that did not type the word's last
// character, on that thumb's own space bar, so the hands keep alternating.
export function spaceAfter(prev: string | undefined, opts: Route = {}): Stroke {
  const last = prev ? strokeFor(prev, opts)?.keys[0] : undefined
  const hand: Hand =
    last && handOf(KEY_BY_ID[last]) === "left" ? "right" : "left"
  return { keys: [SPACE[hand]], hold: [], name: `Space, ${hand} thumb` }
}

// The keys to press for one character. `keys` are struck, `hold` are held
// while striking them. Shift and Fn come from the other hand, the way a
// touch typist reaches for them. Characters in `fn` come from the Fn
// layer's number pad instead of the number row, and characters in `taps`
// from tapping Shift, Ctrl or Alt, where a level teaches them that way.
export type Stroke = { keys: string[]; hold: string[]; name: string }
export type Route = { fn?: string; taps?: string }

export function strokeFor(ch: string, opts: Route = {}): Stroke | null {
  if (ch === " ") return { keys: [SPACE.left, SPACE.right], hold: [], name: "Space" }
  if (opts.fn?.includes(ch)) {
    const k = KEYS.find((k) => k.fn === ch)
    if (k) {
      const fn = handOf(k) === "left" ? FN.right : FN.left
      return {
        keys: [k.id],
        hold: [fn],
        name: `Fn + ${fnName(k)}`,
      }
    }
  }
  if (opts.taps?.includes(ch)) {
    const k = KEYS.find((k) => k.tap === ch)
    if (k) return { keys: [k.id], hold: [], name: `tap ${k.name}` }
  }
  const base = KEYS.find((k) => k.base === ch)
  if (base) return { keys: [base.id], hold: [], name: base.name }
  const shifted = KEYS.find((k) => k.shift === ch)
  if (shifted) {
    const shift = handOf(shifted) === "left" ? SHIFT.right : SHIFT.left
    return {
      keys: [shifted.id],
      hold: [shift],
      name: `Shift + ${shifted.name}`,
    }
  }
  const tap = KEYS.find((k) => k.tap === ch)
  if (tap) return { keys: [tap.id], hold: [], name: `tap ${tap.name}` }
  return null
}

function fnName(k: Key) {
  return k.base ? keyName(k.base) : k.name
}
