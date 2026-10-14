import { VariantPrice } from "types/global"

// The card's price says "plus shipping", as every price does (PRESALE.md),
// and the words wrap under the price in a narrow card: the two-column grids
// at phone width. The starter's struck-through "was" price went on 6 Oct
// 2026, since KeBe never shows one (presale.ts).
export default async function PreviewPrice({
  price,
  preorder = false,
}: {
  price: VariantPrice
  preorder?: boolean
}) {
  if (!price) {
    return null
  }

  return (
    // Spans at the card's 16 px: Text set it at 14 (design audit, 14 Oct 2026).
    <div className="flex flex-wrap items-baseline gap-x-1 text-ui-fg-muted">
      {preorder && <span data-testid="preorder-label">Pre-order</span>}
      <span className="text-ui-fg-base" data-testid="price">
        {price.calculated_price}
      </span>
      <span data-testid="price-shipping">plus shipping</span>
    </div>
  )
}
