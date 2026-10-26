// The case for KeBe's layout, in the words the homepage
// (app/[countryCode]/(main)/page.tsx) sets out in full. The reel and the ads
// make the same argument, and the product page they land on quotes it under
// the button (templates/index.tsx), so both pages read from this one copy
// (6 Oct 2026).

// The two typewriter habits a standard keyboard keeps, and what KeBe does
// instead. The owner's argument (30 Sept 2026): the stagger cleared levers a
// keyboard does not have, and QWERTY's order kept common letter pairs apart
// so the typebars would not jam.
export const HABITS = [
  {
    label: "The stagger",
    title: "Rows knocked sideways",
    // The offsets are a standard ANSI board's: its rows start 1, 1.5, 1.75
    // and 2.25 keys from the left edge (` / Tab / Caps / Shift). KeBe's grid
    // is 18 x 17 mm (Keycaps/print/kebe-legend-list.csv).
    body: "On a typewriter every key sat on a lever that ran straight back under the keys behind it, so each row was shifted sideways to let the levers pass. A keyboard has no levers, yet the offset stayed. Half a key between the number row and the row with Q on it, a quarter of a key more to the home row, and half a key again to the bottom row: every finger still reaches off at an angle for the keys above and below its home. KeBe's keys sit in straight columns on an 18 by 17 mm grid, so each finger moves straight up and down its own.",
  },
  {
    label: "The letter order",
    title: "Letters kept apart",
    body: "Every typebar struck the same spot on the page. Hit two keys too close together and their bars could meet on the way up and jam, so QWERTY was laid out to keep common letter pairs apart: an order for the machine, not for your fingers. August Dvorak started from the hands instead, in the 1930s: the vowels under the left hand's resting fingers, the most-used consonants under the right's, and the rarest letters down on the bottom row. KeBe's letters are his.",
  },
] as const

// Dvorak's reasoning, one rule each (owner, 7 Oct 2026: "include more on
// Dvorak's reasoning ... stroking should go from the outside to the middle").
// The rules are Dvorak and Dealey's as their patent (US 2,040,248, 1936) and
// "Typewriting Behavior" (1936) set them out; every figure comes from
// scripts/layout-stats.py, which says how it counts. KeBe's letters and the
// finger on each column are Dvorak's, so his figures are KeBe's.
export const DVORAK = [
  {
    // 70.6% vs 34.0%: English letter frequencies (Lewand's table) summed over
    // each layout's home-row letters; the reel's figures come from the same
    // table (marketing/instagram/src-levers/README.md, "Claims, checked").
    title: "The home row does the work",
    body: "The row your fingers rest on reads A O E U I under the left hand and D H T N S under the right. Add up how often each letter turns up in English and about 71% of the letters you type land on that row. On QWERTY's A S D F G H J K L it is about 34%, so two letters in three are a reach.",
  },
  {
    // 70.3% of letter pairs inside words switch hands on KeBe, 52.2% on QWERTY.
    title: "Hands take turns",
    body: "Words tend to go consonant, vowel, consonant, vowel. With the vowels on one side and the consonants on the other, a word like HOME or TOMATO passes from hand to hand with every letter: one hand reaches while the other strikes, for a steadier rhythm and less work for any single finger. Seven in ten of the letter pairs inside English words switch hands, against about half on QWERTY.",
  },
  {
    // TH is the most common pair; it, ND, OU, NG and ST are the most used
    // inward rolls. 64% of one-hand, two-finger pairs roll inward on KeBe,
    // 53% on QWERTY. The desk drumming is the textbook illustration of the
    // rule ("inboard stroke flow").
    title: "Strokes roll inward",
    body: "When one hand has to type two letters in a row, Dvorak wanted the stroke to run from the edge of the board toward the middle, from the little finger toward the pointer. Drum your fingers on a desk and you will likely find that the easier way round. TH, the most common pair in English, rolls in from the middle finger to the pointer, and ND, OU, NG and ST roll in too. Nearly two in three of the pairs one hand types with two fingers roll inward, against about half on QWERTY.",
  },
  {
    // 2.6% of pairs (1 in 39) on KeBe, 6.8% (1 in 15) on QWERTY; over the
    // home row, 0.1% against 2.2%. ED and DE are QWERTY's left middle finger,
    // CE its middle finger and UN its right pointer, bottom row to top.
    title: "One finger, one key at a time",
    body: "Two different keys under the same finger, one straight after the other, are the slowest kind of pair to type, and worse still when the finger has to hurdle the home row between top and bottom. QWERTY asks for it in ED and DE, and makes you hurdle in CE and UN. Dvorak kept common pairs off a single finger: on KeBe that happens in about 1 pair in 40, against 1 in 15 on QWERTY.",
  },
  {
    // 8.5% vs 14.6% of letters on the bottom row. N is English's sixth most
    // common letter (Lewand). M and W outnumber P, Y, F and G a little, so the
    // copy says "rare", not "rarest".
    title: "Rare letters at the bottom",
    body: "The bottom row is the hardest to reach, so Dvorak sent the rare letters down there: Q J K X under the left hand and B M W V Z under the right. About 8% of the letters you type are on that row. QWERTY puts N, the sixth most common letter in English, on its bottom row and sends about 15% of the letters there.",
  },
  {
    // 56.8% right on KeBe; QWERTY's left hand 58.7%. was, were, after and
    // exaggerated are all QWERTY left-hand letters.
    title: "More for the right hand",
    body: "Most people are right-handed, so Dvorak gave the right hand the bigger share: about 57% of the letters you type. QWERTY leans the other way. Its left hand types about 59% of them, and whole words like was, were, after and exaggerated with no help from the right.",
  },
] as const

// What KeBe adds to Dvorak's letters, one reason each. Check against the caps
// before changing: the Fn arrows are on . O E U, the number pad on the right
// hand's G C R / H T N / M W V / B, F1-F10 on the number row, the media keys
// in the middle columns, and ctrl, alt, fn, the GUI diamond and shift on both
// sides.
export const WHY = [
  {
    // The owner's reasons (30 Sept 2026). 9 cm: the pointer fingers' home
    // keys U and H are 90 mm apart on the caps; a standard board's F-J is
    // 3 x 19.05 mm.
    title: "Symbols in the middle",
    body: "The - = [ ] / \\ keys a standard board leaves to your right pinky sit in the two middle columns, where your pointer fingers take them: far stronger fingers than your pinkies. They also set your hands further apart. KeBe's pointer-finger home keys are 9 cm apart, against 5.7 cm on a standard keyboard, so your wrists bend less.",
  },
  {
    title: "Both thumbs, both sides",
    body: "Two space bars sit under the thumbs, and Shift, Ctrl, Alt, Fn and the Super key are mirrored on each side, so a shortcut takes one key from each hand instead of a stretch with one.",
  },
  {
    title: "Sixty-eight keys, nothing missing",
    body: "Hold Fn and the left hand's home keys become arrows, the right hand's a number pad, and the number row F1 to F10. Media controls sit in the middle columns. Nothing is more than a finger's reach from home.",
  },
  {
    // QMK autocorrect in keyboards/kebe (its readme, "Autocorrect"): a typo
    // table of 1121 entries plus a corrector that knows words, judged when
    // Space ends a word; Backspace straight after a correction puts the word
    // back and remembers it; Fn + A toggles both. It corrects after the word
    // is typed, so it never claims the typo does not reach the computer.
    title: "Typos fixed in the keyboard",
    body: "The firmware carries a dictionary of common misspellings and corrects a word the moment you finish it, by itself, on any computer you plug into: accomodate becomes accommodate before you look up. There is nothing to install. If it was right the first time, Backspace straight after puts your word back and it is left alone from then on, and Fn + A switches the whole thing off.",
  },
] as const

// The presale board's subtitle on its product page, in place of the rest of
// its title ("68-Key Ortholinear Keyboard with USB Hub"): the reel opens on
// the columns and the letter order, and an ad's visitor checks the page
// against it within a second of landing. It replaces a line rather than
// adding one, and must stay within two lines at 320 px wide, or it pushes
// Pre-order off a phone's first screen (6 Oct 2026).
//
// Each board's line now leads with its kind (owner, 7 Oct 2026: v2 "mechanical", the Lite "slim, membrane"), in the
// same two lines.
export const BUYBOX_TAGLINE =
  "Mechanical keys in straight columns, with Dvorak's letter order."
export const BUYBOX_TAGLINE_LITE =
  "Slim membrane keys in straight columns, with Dvorak's letters."

// Entries are looked up by their label or title, never by position, and the
// literal types make a renamed one a type error here.
const habit = (label: (typeof HABITS)[number]["label"]) =>
  HABITS.find((h) => h.label === label)!
const dvorak = (title: (typeof DVORAK)[number]["title"]) =>
  DVORAK.find((d) => d.title === title)!
const why = (title: (typeof WHY)[number]["title"]) =>
  WHY.find((w) => w.title === title)!

// A body's sentences. Every sentence in HABITS, DVORAK and WHY ends in a full stop
// and a space before a capital; the one decimal ("5.7 cm") has no space.
const sentences = (text: string) =>
  text
    .split(/\.\s+(?=[A-Z])/)
    .map((s, i, all) => (i < all.length - 1 ? `${s}.` : s))

// The autocorrect reason keeps its off switch, as the homepage's does: an
// excerpt that dropped it would describe a corrector you cannot turn off.
const typos = why("Typos fixed in the keyboard")
const offSwitch = typos.body.match(/Fn \+ A [^.]*\./)?.[0]
if (!offSwitch) {
  throw new Error(
    "kebe-copy: the autocorrect reason no longer says how to switch it off"
  )
}

// The four reasons under the product page's button, in the reel's order.
// These are excerpts of HABITS, DVORAK and WHY above, word for word, and must change
// with them. The first is titled for the letters, so Dvorak is named next to
// the button; its body is the stagger's last sentence. No "type faster": that
// claim is the ad's alone (marketing/instagram/meta-campaign.md).
const stagger = sentences(habit("The stagger").body)
export const BUYBOX_REASONS: { title: string; body: string }[] = [
  {
    title: "Dvorak's letters, in straight columns",
    body: stagger[stagger.length - 1],
  },
  {
    title: dvorak("The home row does the work").title,
    body: dvorak("The home row does the work").body,
  },
  {
    title: why("Symbols in the middle").title,
    body: sentences(why("Symbols in the middle").body)[0],
  },
  {
    title: typos.title,
    body: `${sentences(typos.body)[0]} ${offSwitch}`,
  },
]
