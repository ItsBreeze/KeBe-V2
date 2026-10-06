import { Text } from "@medusajs/ui"
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
    <div className="flex flex-wrap items-baseline gap-x-1">
      {preorder && (
        <Text className="text-ui-fg-muted" data-testid="preorder-label">
          Pre-order
        </Text>
      )}
      <Text className="text-ui-fg-muted" data-testid="price">
        {price.calculated_price}
      </Text>
      <Text className="text-ui-fg-muted" data-testid="price-shipping">
        plus shipping
      </Text>
    </div>
  )
}
