import { HttpTypes } from "@medusajs/types"
import { usShipFloor } from "@lib/util/fcc"

export const PRESALE_HANDLE = "kebe-v2-keyboard"
// KeBe Lite, the rubber-dome KeBe (the kebe repo's PCBs/lite), on pre-order since 6 Oct 2026.
export const LITE_HANDLE = "kebe-lite"
// Every board sold on pre-order. The pre-order terms' cancel promise, the cart's ship line, the Stripe
// description and the order page's help cover each one; PRESALE_HANDLE stays the flagship the homepage and the
// other pages' links lead to.
export const PRESALE_HANDLES: readonly string[] = [PRESALE_HANDLE, LITE_HANDLE]

export const isPresaleHandle = (handle: string | null | undefined) =>
  !!handle && PRESALE_HANDLES.includes(handle)

type LineLike = {
  product_handle?: string | null
  product?: { handle?: string | null } | null
}
const lineHandle = (i: LineLike) => i.product_handle ?? i.product?.handle

// The first line of a cart or an order that holds a pre-order board, and its product's handle.
export const presaleLineOf = <T extends LineLike>(
  items: T[] | null | undefined
): T | undefined => items?.find((i) => isPresaleHandle(lineHandle(i)))

export const presaleHandleOf = (items: LineLike[] | null | undefined) => {
  const line = presaleLineOf(items)
  return line ? lineHandle(line) ?? undefined : undefined
}

// A YYYY-MM-DD date from the product's metadata, or null. A date that does
// not exist (2026-13-01, or 2026-02-30 rolling into March) reads as null
// rather than promising "Invalid Date" or a different day.
const metadataIsoDate = (
  product: HttpTypes.StoreProduct,
  key: "ships_by" | "ships_by_next"
): string | null => {
  const raw = product.metadata?.[key]
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return null
  }
  const d = new Date(`${raw}T12:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw) {
    return null
  }
  return raw
}

// A YYYY-MM-DD date written the one way the site writes a ship date
// ("October 31": the owner's wording, no year).
const shipDateWords = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-CA", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  })

// The same date from the product's metadata.
const metadataDate = (
  product: HttpTypes.StoreProduct,
  key: "ships_by" | "ships_by_next"
): string | null => {
  const iso = metadataIsoDate(product, key)
  return iso ? shipDateWords(iso) : null
}

// The later US date while the board's FCC authorization is pending (fcc.ts
// usShipFloor, owner 7 Oct 2026), when it is later than the date the product
// gives: for country "us" only, so /ca keeps the product's own date.
const usLaterDate = (
  product: HttpTypes.StoreProduct,
  countryCode: string | null | undefined,
  iso: string | null
): string | null => {
  if (countryCode?.toLowerCase() !== "us") return null
  const floor = usShipFloor(product.handle)
  return floor && (!iso || floor > iso) ? floor : null
}

// Whether US buyers get a later date than Canada's for this board now: the
// product page and the home page then say which country ships when.
export const usShipsLater = (product: HttpTypes.StoreProduct) =>
  !!usLaterDate(product, "us", presaleShipDate(product))

// A product is on presale when the backend's start-presale script has put a
// ships_by date in its metadata. The date lives on the product, not here, so
// moving it is an Admin edit rather than a deploy, and an invalid one turns
// the presale off.
export const presaleShipsBy = (
  product: HttpTypes.StoreProduct
): string | null => metadataDate(product, "ships_by")

// The pre-order price is a Medusa "sale" price list (the backend's
// preorder-sale.ts) over the product's own price, which it keeps charging
// after pre-orders close. The site only calls it the pre-order price and never
// names the later one (owner, 30 Sept 2026); nor is the later price struck
// through: the board was never sold at it, so a "was" price and a percentage
// off would be a false ordinary-price claim.
export const isPreorderPrice = (
  product: HttpTypes.StoreProduct,
  price: { price_type?: string | null } | null | undefined
) => price?.price_type === "sale" && presaleShipsBy(product) !== null

// The Pre-order button's own rule (product-actions inStock): a variant that
// is not inventory-managed, or takes backorders, has no limit. Medusa leaves
// inventory_quantity out for unmanaged variants, so counting it alone would
// call those sold out. The backend's ship-dates.ts turns backorders on, so
// the board stays on sale once its counted stock is gone.
const unlimited = (v: HttpTypes.StoreProductVariant) =>
  !v.manage_inventory || !!v.allow_backorder

// Whether this one variant can still be bought: the Pre-order button's rule.
export const variantOpen = (v: HttpTypes.StoreProductVariant) =>
  unlimited(v) || (v.inventory_quantity ?? 0) > 0

// open: whether any variant can still be bought. fromStock: whether a counted
// board is still unsold, so an order placed now is one of them. Neither is a
// count: the site never says how many boards there are (owner, 1 Oct 2026).
export const presaleAvailability = (product: HttpTypes.StoreProduct) => {
  const variants = product.variants ?? []
  return {
    open: variants.some(variantOpen),
    fromStock: variants.some(
      (v) => !!v.manage_inventory && (v.inventory_quantity ?? 0) > 0
    ),
  }
}

// When an order placed now ships (owner, 1 Oct 2026). While counted boards
// are unsold: "Currently shipping <ships_by>". Once they are gone the board
// stays on sale as a backorder: "Ships <ships_by_next>", a second date the
// owner sets in Admin. Without a valid ships_by_next it says nothing rather
// than invent a date, and nothing either when the board cannot be bought.
// Stock moving revalidates the cached pages (the backend's
// revalidate-storefront subscriber), so the line flips on its own.
// For a US buyer the line gives the FCC date instead when it is later
// (usLaterDate): "Ships November 30".
export const presaleShipLine = (
  product: HttpTypes.StoreProduct,
  countryCode?: string | null
): string | null => {
  const shipsBy = presaleShipsBy(product)
  const { open, fromStock } = presaleAvailability(product)
  if (!shipsBy || !open) {
    return null
  }
  const later = usLaterDate(product, countryCode, presaleShipDate(product))
  if (later) {
    return `Ships ${shipDateWords(later)}`
  }
  if (fromStock) {
    return `Currently shipping ${shipsBy}`
  }
  const next = metadataDate(product, "ships_by_next")
  return next ? `Ships ${next}` : null
}

// The YYYY-MM-DD behind presaleShipLine, for machines: the product feeds'
// availability_date, the product page's JSON-LD and llms.txt. Null exactly
// when the line says nothing, so no feed promises a date the page does not.
export const presaleShipDate = (
  product: HttpTypes.StoreProduct,
  countryCode?: string | null
): string | null => {
  const { open, fromStock } = presaleAvailability(product)
  if (!presaleShipsBy(product) || !open) {
    return null
  }
  const own = fromStock
    ? metadataIsoDate(product, "ships_by")
    : metadataIsoDate(product, "ships_by_next")
  return usLaterDate(product, countryCode, own) ?? own
}

// Whether a cart's or an order's lines hold the presale board, found by its
// handle the way the checkout page finds it. The pre-order terms' cancel
// promise and the Stripe description follow it.
export const holdsPresaleBoard = (
  items:
    | {
        product_handle?: string | null
        product?: { handle?: string | null } | null
      }[]
    | null
    | undefined
) =>
  !!items?.some((i) => isPresaleHandle(lineHandle(i)))

// What a payment is for, on Stripe's record of it: "KeBe v2 pre-order", "KeBe Lite pre-order", from the first
// pre-order line's title (the name before " — "); null for a cart without one.
export const presalePaymentLabel = (
  items:
    | (LineLike & { product_title?: string | null; title?: string | null })[]
    | null
    | undefined
): string | null => {
  const line = presaleLineOf(items)
  if (!line) return null
  return `${(line.product_title ?? line.title ?? "KeBe").split(" — ")[0] || "KeBe"} pre-order`
}

// What a cart holds, in a few words, for checkout's order lines: the name
// before the " — " in the title ("KeBe v2"), as the product page's sticky
// bar shows it, and "pre-order" for the presale board; "3 items" for more
// than one line. The phone's order bar and the Review step both say it.
export const cartItemsLabel = (
  items: HttpTypes.StoreCartLineItem[]
): string => {
  const only = items.length === 1 ? items[0] : undefined

  return only
    ? `${only.quantity > 1 ? `${only.quantity} × ` : ""}${
        (only.product_title ?? only.title ?? "").split(" — ")[0]
      }${
        isPresaleHandle(lineHandle(only))
          ? " pre-order"
          : ""
      }`
    : `${items.reduce((n, i) => n + i.quantity, 0)} items`
}
