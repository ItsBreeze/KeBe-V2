import { HttpTypes } from "@medusajs/types"
import { presaleShipLine, presaleShipsBy } from "@lib/util/presale"
import { productSpecs } from "@lib/util/specs"
import { CONTACT_EMAIL } from "@lib/constants"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

// The specification and shipping, set out in full rather than folded into
// the starter's accordions. Its shipping tab promised 3-5 day delivery, free
// exchanges and no-questions refunds, none of which KeBe offers: only what is
// true of the order is said here.
const ProductTabs = ({ product }: ProductTabsProps) => {
  const specs = productSpecs(product)
  const shipsBy = presaleShipsBy(product)
  const shipLine = presaleShipLine(product)

  return (
    <div className="flex flex-col gap-12">
      {specs.length > 0 && (
        <div>
          <h2 className="font-display text-2xl text-ui-fg-base">
            Specifications
          </h2>
          <dl className="mt-4 divide-y divide-ui-border-base border-y border-ui-border-base">
            {specs.map((s) => (
              <div
                key={s.label}
                className="grid grid-cols-[8rem_1fr] gap-4 py-3 text-base"
              >
                <dt className="text-ui-fg-muted">{s.label}</dt>
                <dd className="text-ui-fg-subtle">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <div>
        <h2 className="font-display text-2xl text-ui-fg-base">Shipping</h2>
        <div className="mt-4 flex flex-col gap-3 text-base leading-relaxed text-ui-fg-subtle">
          {shipsBy ? (
            <>
              <p>
                A pre-order, charged in full at checkout and shipped to
                Canada and the United States.{shipLine && ` ${shipLine}.`}
              </p>
              <p>
                Shipping is calculated at checkout from your address and added
                to the price.
              </p>
              <p>
                US orders go by Canada Post with the US duties already paid,
                so there is nothing more to pay on delivery.
              </p>
            </>
          ) : (
            <p>
              Ships to Canada and the United States. Shipping is calculated at
              checkout from your address.
            </p>
          )}
          <p>
            Questions about an order:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ProductTabs
