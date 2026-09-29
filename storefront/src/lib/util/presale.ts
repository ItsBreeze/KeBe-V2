import { HttpTypes } from "@medusajs/types"

export const PRESALE_HANDLE = "kebe-v2-keyboard"

// A product is on presale when the backend's start-presale script has put a
// ships_by date (YYYY-MM-DD) in its metadata. The date lives on the product,
// not here, so moving it is an Admin edit rather than a deploy.
export const presaleShipsBy = (
  product: HttpTypes.StoreProduct
): string | null => {
  const raw = product.metadata?.ships_by
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return null
  }
  return new Date(`${raw}T12:00:00Z`).toLocaleDateString("en-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}

// Boards left to pre-order: the sum of what each variant can still sell.
export const unitsLeft = (product: HttpTypes.StoreProduct): number =>
  (product.variants ?? []).reduce(
    (n, v) => n + Math.max(0, v.inventory_quantity ?? 0),
    0
  )
