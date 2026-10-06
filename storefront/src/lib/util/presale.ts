import { HttpTypes } from "@medusajs/types"

export const PRESALE_HANDLE = "kebe-v2-keyboard"

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

// The same date, written the one way the site writes a ship date ("October
// 31": the owner's wording, no year).
const metadataDate = (
  product: HttpTypes.StoreProduct,
  key: "ships_by" | "ships_by_next"
): string | null => {
  const iso = metadataIsoDate(product, key)
  return iso
    ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-CA", {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      })
    : null
}

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
export const presaleShipLine = (
  product: HttpTypes.StoreProduct
): string | null => {
  const shipsBy = presaleShipsBy(product)
  const { open, fromStock } = presaleAvailability(product)
  if (!shipsBy || !open) {
    return null
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
  product: HttpTypes.StoreProduct
): string | null => {
  const { open, fromStock } = presaleAvailability(product)
  if (!presaleShipsBy(product) || !open) {
    return null
  }
  return fromStock
    ? metadataIsoDate(product, "ships_by")
    : metadataIsoDate(product, "ships_by_next")
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
        (only.product_handle ?? only.product?.handle) === PRESALE_HANDLE
          ? " pre-order"
          : ""
      }`
    : `${items.reduce((n, i) => n + i.quantity, 0)} items`
}
