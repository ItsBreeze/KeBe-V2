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

// Whether this board's SDoC is still pending: what decides, on /ca as on
// /us, that US delivery may only be offered with the notice (review, 7 Oct
// 2026). The date difference (presale.ts usShipsLater) only picks the date.
export const fccPending = (handle: string | null | undefined) =>
  !!handle && (FCC_SDOC_PENDING as readonly string[]).includes(handle)

// The board's name as the notice gives it.
export const fccBoardName = (handle: string | null | undefined) =>
  fccPending(handle) ? FCC_BOARD_NAMES[handle as FccBoard] : null

// The notice in one paragraph for the surfaces with no room for the full
// text, a US feed's description and llms.txt: the compliance pack's ad
// version (Compliance/store-disclosure.md 2.2), all three notices in it.
// noticeUrl is /us/terms#fcc-notice, absolute (seo.ts imports this file).
export const fccShortNotice = (name: string, noticeUrl: string) =>
  `FCC notice for US orders: ${name}'s FCC authorization isn't complete yet, and no board ships to a US address until it is. The FCC's rules don't address consumer-protection, contract or other law. If authorization isn't completed, we cancel your order and refund it in full. Details: ${noticeUrl}`

// The ship date US orders get while a board's SDoC is pending (YYYY-MM-DD):
// no board may reach a US address before its authorization, and the FTC's
// Mail Order Rule (16 CFR 435.2(a)(1)) wants a shown date to have a
// reasonable basis, which means the EMC test booked. The owner chose 30
// November for KeBe v2 (7 Oct 2026); KeBe Lite's own date, 31 January 2027,
// is already later. presale.ts shows the later of this and the product's own
// date to US buyers only, and drops it with the board's handle above.
const US_SHIPS_BY: Partial<Record<FccBoard, string>> = {
  "kebe-v2-keyboard": "2026-11-30",
}

export const usShipFloor = (handle: string | null | undefined) =>
  fccPending(handle) ? US_SHIPS_BY[handle as FccBoard] ?? null : null

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
