import { Text, clx } from "@medusajs/ui"
import { VariantPrice } from "types/global"

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
    <>
      {preorder ? (
        <Text className="text-ui-fg-muted" data-testid="preorder-label">
          Pre-order
        </Text>
      ) : price.price_type === "sale" && (
        <Text
          className="line-through text-ui-fg-muted"
          data-testid="original-price"
        >
          {price.original_price}
        </Text>
      )}
      <Text
        className={clx("text-ui-fg-muted", {
          "text-ui-fg-interactive": price.price_type === "sale",
        })}
        data-testid="price"
      >
        {price.calculated_price}
      </Text>
    </>
  )
}
