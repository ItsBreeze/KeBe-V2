import { HttpTypes } from "@medusajs/types"
import { presaleShipsBy } from "@lib/util/presale"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
}

// The buy box's heading. Titles read "KeBe v2 — 68-Key Ortholinear Keyboard
// with USB Hub": the name goes large, the rest under it. The description is
// set in full further down the page (templates/index.tsx).
const ProductInfo = ({ product }: ProductInfoProps) => {
  const [name, ...rest] = (product.title ?? "").split(" — ")
  const kind = rest.join(" — ")
  const shipsBy = presaleShipsBy(product)

  return (
    <div id="product-info" className="flex flex-col gap-y-3">
      {shipsBy ? (
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ui-fg-muted">
          Pre-order · ships by {shipsBy}
        </p>
      ) : (
        product.collection && (
          <LocalizedClientLink
            href={`/collections/${product.collection.handle}`}
            className="font-mono text-xs uppercase tracking-[0.2em] text-ui-fg-muted hover:text-ui-fg-subtle"
          >
            {product.collection.title}
          </LocalizedClientLink>
        )
      )}
      <h1
        className="font-display text-[clamp(2.5rem,6vw,3.75rem)] leading-[1.05] text-ui-fg-base"
        data-testid="product-title"
      >
        {name}
      </h1>
      {kind && (
        <p className="text-[clamp(1.05rem,2vw,1.25rem)] leading-snug text-ui-fg-subtle">
          {kind}
        </p>
      )}
    </div>
  )
}

export default ProductInfo
