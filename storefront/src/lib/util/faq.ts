import { HttpTypes } from "@medusajs/types"
import { PRESALE_HANDLE } from "@lib/util/presale"

// A product's questions and answers, keyed by handle like specs.ts: shown
// under its specification on the product page (product-tabs) and in
// llms.txt. Each answer says only what the live site, the pre-order terms or
// the kebe repo's committed source states, and the comment above it names
// where (6 Oct 2026). "kebe repo" is ItsBreeze/KeBe at efeb2156ac on
// kebe-v2, the firmware the boards ship with; its "v3" is the board sold as
// KeBe v2, and its own "v2" is the wireless design, which is not for sale.
// Plain text on the page, never FAQPage markup: Google shows FAQ results only
// for government and health sites.
//
// Not answered until they are checked: whether it works on a Mac with Super
// as Command and Alt as Option (no Mac has been tried; before-you-preorder
// waits on the same check), and naming Windows, macOS or Linux at all, which
// nothing on the site does. Not answered because nothing states it: high
// speed (480 Mbit/s) on the hub's ports (PCBs/v3/README.md lists it as a
// first-article check), and how much power a port gives.
export type FaqLink = { href: string; label: string }

export type Faq = {
  question: string
  // Paragraphs of plain text.
  answer: string[]
  // A page on this site, without the country: "/terms".
  link?: FaqLink
}

const BY_HANDLE: Record<string, Faq[]> = {
  [PRESALE_HANDLE]: [
    {
      // The product page's subtitle, "68 keys in straight columns, with
      // August Dvorak's letter order", and its reasons "The home row does
      // the work" and "Symbols in the middle" (lib/util/kebe-copy.ts); the
      // kebe repo's keymap.c, whose base layer has A O E U I and D H T N S
      // on the home row and - = [ ] / \ in the two middle columns.
      question: "What is Matrix-Dvorak?",
      answer: [
        "KeBe's layout: 68 keys in straight columns, with August Dvorak's letter order. The row your fingers rest on reads A O E U I under the left hand and D H T N S under the right, and the - = [ ] / \\ keys sit in the two middle columns, where your pointer fingers take them. The free typing trainer on this site teaches it one letter at a time.",
      ],
      link: { href: "/train", label: "Open the typing trainer" },
    },
    {
      // The kebe repo's keymap.c: the base layer sends the US keycodes for
      // Dvorak's characters (KC_QUOT, KC_COMM, KC_DOT, KC_P, KC_Y ...), so
      // the computer has to read them as US English; Keycaps/README.md,
      // "the host's US layout already types these on Shift". The product
      // page's "plug it in by USB-C and it types, with nothing to install".
      question: "Do I set my computer to Dvorak?",
      answer: [
        "No. Set it to, or leave it on, US English (QWERTY): KeBe makes the Dvorak letters itself, so a computer set to Dvorak would move them a second time. There is nothing to install: plug it in by USB-C and it types.",
      ],
    },
    {
      // The kebe repo's PCBs/v3/README.md: "Kailh Choc v1 hot-swap", the
      // sockets Kailh CPG135001S30 (sections 4 and 6); Case_Files/v3/README.md,
      // the plate's "Choc v1 apertures 13.95 R0.5"; specs.ts, the Switches
      // and Sockets rows.
      question: "Which switches fit?",
      answer: [
        "Kailh Choc v1 low-profile switches, the kind it comes with (Choc v1 Brown). The sockets are Kailh's Choc v1 hot-swap sockets and the plate is cut for Choc v1, so you change a switch without solder.",
      ],
    },
    {
      // The kebe repo's Keycaps/README.md: the key pitch is 18.000 x 17.000
      // mm, "a cap deeper than ~16.8 mm will not fit the row pitch", Kailh
      // caps sold 18.0 and 17.95 mm deep do not fit, and the two 2U thumb
      // keys each sit on a switch and a stabiliser; Case_Files/v3/README.md,
      // the 2U stabilisers hang from the plate; the homepage's "18 by 17 mm
      // grid".
      question: "Which keycaps fit?",
      answer: [
        "Keycaps made for Kailh Choc v1 switches, no deeper than about 16.8 mm front to back. The keys sit 18 mm apart across and 17 mm apart from row to row, and some Choc caps are about 18 mm deep, too deep for these rows. The two space bars are 2U, on stabilisers.",
      ],
    },
    {
      // The kebe repo's keyboards/kebe/rules.mk and keymaps/default/rules.mk:
      // no VIA_ENABLE, no Vial; specs.ts, "STM32F072, running QMK"; the
      // homepage's "Still yours to change". How to build and flash a keymap
      // (hold Esc while plugging in, which also clears the saved settings)
      // waits until KeBe's QMK folder is public, with a link to it: until
      // then a buyer has nothing to build from (review, 6 Oct 2026).
      question: "Can I change the keymap?",
      answer: [
        "It runs QMK, the open-source keyboard firmware, and every key and the Fn layer are set in it. There is no VIA or Vial.",
      ],
    },
    {
      // The product page's "About the board": "one goes to your computer,
      // and the other three are a USB 2.0 hub for a mouse receiver, a flash
      // drive or anything else that draws little power". The kebe repo's
      // PCBs/v3/README.md, section 1: the host port feeds the hub's upstream
      // port, and the three ports take their power from the host's.
      question: "What do the three extra USB-C ports do?",
      answer: [
        "They are a USB 2.0 hub inside the board, for a mouse receiver, a flash drive or anything else that draws little power. The keyboard and everything plugged into it reach your computer through the one cable, and take their power from it.",
      ],
    },
    {
      // The pre-order terms (app/[countryCode]/(main)/terms), word for word
      // but for "are": "Changing your mind", "Returns" and "Warranty". When
      // it ships is the Shipping section's, just below.
      question: "Can I cancel, or return it?",
      answer: [
        "Cancel any time before your board ships for a full refund within 5 business days. Return the board within 30 days of delivery, in its original condition, for a refund; buyer pays return shipping. Defects are repaired or replaced for a year.",
      ],
      link: { href: "/terms", label: "Pre-order terms" },
    },
  ],
}

export const productFaq = (product: HttpTypes.StoreProduct): Faq[] =>
  (product.handle && BY_HANDLE[product.handle]) || []
