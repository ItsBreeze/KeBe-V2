import { listProducts } from "@lib/data/products"
import { getProductPrice } from "@lib/util/get-product-price"
import {
  isOnHold,
  isPreorderPrice,
  litePlannedPrice,
  presaleAvailability,
} from "@lib/util/presale"
import { productImageAlt } from "@lib/util/image-alt"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

export default async function ProductPreview({
  product,
  isFeatured,
  region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  // const pricedProduct = await listProducts({
  //   regionId: region.id,
  //   queryParams: { id: [product.id!] },
  // }).then(({ response }) => response.products[0])

  // if (!pricedProduct) {
  //   return null
  // }

  const { cheapestPrice } = getProductPrice({
    product,
  })
  // "KeBe v2 — Mechanical 68-Key …": the name large, the kind under it and
  // the price under that, as the product page sets them; side by side, the
  // title wrapped to three lines beside the price (design audit, 14 Oct 2026).
  const [name, ...rest] = (product.title ?? "").split(" — ")

  return (
    <LocalizedClientLink href={`/products/${product.handle}`} className="group">
      <div data-testid="product-wrapper">
        <Thumbnail
          thumbnail={product.thumbnail}
          images={product.images}
          alt={productImageAlt(
            {
              url: product.thumbnail || product.images?.[0]?.url || "",
              metadata: product.thumbnail ? null : product.images?.[0]?.metadata,
            },
            product.title ?? "",
            0
          )}
          size="full"
          isFeatured={isFeatured}
        />
        <div className="mt-4 flex flex-col gap-y-1 text-base">
          <h2
            className="font-display text-2xl text-ui-fg-base"
            data-testid="product-title"
          >
            {name}
          </h2>
          {rest.length > 0 && (
            <p className="text-ui-fg-subtle">{rest.join(" — ")}</p>
          )}
          {/* KeBe Lite, planned: its planned price, never one that reads as buyable. A board
              nobody can buy says so, as its page does (v1, 14 Oct 2026): the
              card showed its old price as if it were on sale. */}
          {isOnHold(product.handle) ? (
            <p className="text-ui-fg-muted" data-testid="on-hold-label">
              {/* The region's own planned price: the US store is the one in USD. */}
              Planned price{" "}
              <span className="text-ui-fg-base">
                {litePlannedPrice(region.currency_code === "usd" ? "us" : "ca")}
              </span>
              , free waitlist
            </p>
          ) : !presaleAvailability(product).open ? (
            <p className="text-ui-fg-muted" data-testid="sold-out">
              Sold out
            </p>
          ) : (
            cheapestPrice && (
              <PreviewPrice
                price={cheapestPrice}
                preorder={isPreorderPrice(product, cheapestPrice)}
              />
            )
          )}
        </div>
      </div>
    </LocalizedClientLink>
  )
}
