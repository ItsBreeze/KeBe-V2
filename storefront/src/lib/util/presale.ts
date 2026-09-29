import { HttpTypes } from "@medusajs/types"

export const PRESALE_HANDLE = "kebe-v2-keyboard"

// A product is on presale when the backend's start-presale script has put a
// ships_by date (YYYY-MM-DD) in its metadata. The date lives on the product,
// not here, so moving it is an Admin edit rather than a deploy. A date that
// does not exist (2026-13-01, or 2026-02-30 rolling into March) turns the
// presale off rather than promising "Invalid Date" or a different day.
export const presaleShipsBy = (
  product: HttpTypes.StoreProduct
): string | null => {
  const raw = product.metadata?.ships_by
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
    year: "numeric",
    timeZone: "UTC",
  })
}

// The Pre-order button's own rule (product-actions inStock): a variant that
// is not inventory-managed, or takes backorders, has no limit. Medusa leaves
// inventory_quantity out for unmanaged variants, so counting it alone would
// call those sold out.
const unlimited = (v: HttpTypes.StoreProductVariant) =>
  !v.manage_inventory || !!v.allow_backorder

// open: whether any variant can still be bought. left: boards remaining, or
// null when some variant has no limit (then there is no count to show).
export const presaleAvailability = (product: HttpTypes.StoreProduct) => {
  const variants = product.variants ?? []
  const limitless = variants.some(unlimited)
  return {
    open: variants.some((v) => unlimited(v) || (v.inventory_quantity ?? 0) > 0),
    left: limitless
      ? null
      : variants.reduce((n, v) => n + Math.max(0, v.inventory_quantity ?? 0), 0),
  }
}
