import { HttpTypes } from "@medusajs/types"
import {
  LITE_HANDLE,
  isOnHold,
  presaleShipLine,
  presaleShipsBy,
} from "@lib/util/presale"
import { BUYBOX_TAGLINE, BUYBOX_TAGLINE_LITE } from "@lib/util/kebe-copy"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
  // a US buyer sees the FCC date (presale.ts)
  countryCode?: string
}

// The buy box's heading. Titles read "KeBe v2 — 68-Key Ortholinear Keyboard
// with USB Hub": the name goes large, the rest under it. The description is
// set in full further down the page (templates/index.tsx).
const ProductInfo = ({ product, countryCode }: ProductInfoProps) => {
  const [name, ...rest] = (product.title ?? "").split(" — ")
  const kind = rest.join(" — ")
  const shipsBy = presaleShipsBy(product)
  const shipLine = presaleShipLine(product, countryCode)
  // KeBe Lite, planned, keeps its tagline, under "Planned, with a free waitlist."
  const onHold = isOnHold(product.handle)
  // On the presale board the line under the name continues the reel's
  // argument instead (kebe-copy.ts). Only this line changes: the title, and
  // with it the cart, link previews, feeds and Admin, stays as it is
  // (6 Oct 2026).
  const subtitle = shipsBy || onHold
    ? product.handle === LITE_HANDLE
      ? BUYBOX_TAGLINE_LITE
      : BUYBOX_TAGLINE
    : kind

  return (
    <div id="product-info" className="flex flex-col gap-y-3">
      {!shipsBy && !onHold && product.collection && (
        <LocalizedClientLink
          href={`/collections/${product.collection.handle}`}
          className="text-sm text-ui-fg-muted hover:text-ui-fg-subtle"
        >
          {product.collection.title}
        </LocalizedClientLink>
      )}
      <h1
        className="font-display text-[clamp(2.5rem,6vw,3.75rem)] leading-[1.05] text-ui-fg-base"
        data-testid="product-title"
      >
        {name}
      </h1>
      {subtitle && (
        <p className="text-[clamp(1.05rem,2vw,1.25rem)] leading-snug text-ui-fg-subtle">
          {subtitle}
        </p>
      )}
      {/* The ship date, or the Lite's hold, under the name in sentence
          case: each was a monospace caps label over it until the design
          audit (14 Oct 2026). */}
      {onHold ? (
        <p className="text-base text-ui-fg-muted">Planned, with a free waitlist.</p>
      ) : (
        shipsBy && (
          <p className="text-base text-ui-fg-muted">
            {shipLine ? `For sale now. ${shipLine}.` : "For sale now."}
          </p>
        )
      )}
    </div>
  )
}

export default ProductInfo
