// The FCC notice for US orders (6 Oct 2026). KeBe v2 and KeBe Lite are each
// a Class B digital device under FCC Part 15, and neither one's Supplier's
// Declaration of Conformity (SDoC) is done yet. Until a board's is, 47 CFR
// 2.803(c)(2)(i) (renumbered (d)(2)(i) on 13 Oct 2026) lets it be advertised
// and pre-ordered in the US only as a conditional sale, with a prominent
// notice of three things at the time of marketing: delivery waits on the
// authorization, the FCC's rules do not address other law, and what the
// buyer is owed if it is not completed. No board may be delivered to a US
// buyer before its own is.

// The boards the notice can be for, by handle (presale.ts's PRESALE_HANDLE
// and LITE_HANDLE, spelled out so the switch below reads as the handles Admin
// shows), and each one's name as the notice gives it: the name before the
// " — " in its product title, as the cart and checkout show it (7 Oct 2026).
const FCC_BOARD_NAMES = {
  "kebe-v2-keyboard": "KeBe v2",
  "kebe-lite": "KeBe Lite",
} as const

type FccBoard = keyof typeof FCC_BOARD_NAMES

// The one switch, a board at a time: the handles whose SDoC is still
// pending. Take a board's handle out once its SDoC is complete, and the
// notice stops naming it everywhere (components/fcc-notice); empty, the
// notice leaves every page. Each SDoC is its own, so KeBe v2 can come out
// while KeBe Lite stays in (7 Oct 2026).
export const FCC_SDOC_PENDING: readonly FccBoard[] = [
  "kebe-v2-keyboard",
  "kebe-lite",
]

// The names of the boards a page or an order for this country must give the
// notice for, out of the handles it offers or holds: each pending one once,
// in FCC_SDOC_PENDING's order, and none outside the US. Canada's rules
// (ICES-003) have no such notice to give, so /ca shows nothing, and a /ca
// cart cannot ship to a US address (the CA region holds Canada only).
export const fccNoticeBoards = (
  countryCode: string | null | undefined,
  handles: readonly (string | null | undefined)[]
): string[] =>
  countryCode?.toLowerCase() === "us"
    ? FCC_SDOC_PENDING.filter((h) => handles.includes(h)).map(
        (h) => FCC_BOARD_NAMES[h]
      )
    : []

// The same for a cart's or an order's lines, each found by its product's
// handle the way holdsPresaleBoard finds the pre-order boards.
export const fccNoticeBoardsIn = (
  countryCode: string | null | undefined,
  items:
    | {
        product_handle?: string | null
        product?: { handle?: string | null } | null
      }[]
    | null
    | undefined
): string[] =>
  fccNoticeBoards(
    countryCode,
    (items ?? []).map((i) => i.product_handle ?? i.product?.handle)
  )
