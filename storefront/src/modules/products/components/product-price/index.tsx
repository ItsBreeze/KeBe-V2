import { getProductPrice } from "@lib/util/get-product-price"
import { isPreorderPrice } from "@lib/util/presale"
import { HttpTypes } from "@medusajs/types"

export default function ProductPrice({
  product,
  variant,
}: {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
}) {
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  })

  const selectedPrice = variant ? variantPrice : cheapestPrice

  // A variant with no price is not a price still loading -- KeBe products are
  // seeded unpriced on purpose. The starter's pulsing skeleton never resolves
  // and reads as a broken page, so render nothing instead.
  if (!selectedPrice) {
    return null
  }

  // The price always says "plus shipping" (PRESALE.md). The starter's sale
  // display went on 6 Oct 2026: KeBe never strikes through a price or shows
  // a percent off (presale.ts), and a cleared ships_by under the still-active
  // pre-order price list would have brought both back.
  return (
    <div className="flex flex-col text-ui-fg-base">
      <span className="font-display text-[2rem] leading-none">
        {!variant && "From "}
        <span
          data-testid="product-price"
          data-value={selectedPrice.calculated_price_number}
        >
          {selectedPrice.calculated_price}
        </span>
      </span>
      {isPreorderPrice(product, selectedPrice) ? (
        <p className="mt-2 text-ui-fg-subtle" data-testid="preorder-price-note">
          Pre-order price, plus shipping.
        </p>
      ) : (
        <p className="mt-2 text-ui-fg-subtle" data-testid="shipping-price-note">
          Plus shipping.
        </p>
      )}
    </div>
  )
}
