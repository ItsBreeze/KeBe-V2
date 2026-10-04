import { HttpTypes } from "@medusajs/types"

export const PRESALE_HANDLE = "kebe-v2-keyboard"

// A YYYY-MM-DD date from the product's metadata, written the one way the site
// writes a ship date ("October 31": the owner's wording, no year), or null. A date that does not
// exist (2026-13-01, or 2026-02-30 rolling into March) reads as null rather
// than promising "Invalid Date" or a different day.
const metadataDate = (
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
  return d.toLocaleDateString("en-CA", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  })
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

// open: whether any variant can still be bought. fromStock: whether a counted
// board is still unsold, so an order placed now is one of them. Neither is a
// count: the site never says how many boards there are (owner, 1 Oct 2026).
export const presaleAvailability = (product: HttpTypes.StoreProduct) => {
  const variants = product.variants ?? []
  return {
    open: variants.some((v) => unlimited(v) || (v.inventory_quantity ?? 0) > 0),
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
