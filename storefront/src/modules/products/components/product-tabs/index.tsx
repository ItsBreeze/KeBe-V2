import { HttpTypes } from "@medusajs/types"
import { productFaq } from "@lib/util/faq"
import { presaleShipLine, presaleShipsBy } from "@lib/util/presale"
import { productSpecs } from "@lib/util/specs"
import { CONTACT_EMAIL } from "@lib/constants"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

// The specification and shipping, set out in full rather than folded into
// the starter's accordions. Its shipping tab promised 3-5 day delivery, free
// exchanges and no-questions refunds, none of which KeBe offers: only what is
// true of the order is said here. Shipping is a set price for each Canada
// Post service, chosen at checkout, so it no longer says the cost is
// calculated from the address (6 Oct 2026).
const ProductTabs = ({ product }: ProductTabsProps) => {
  const specs = productSpecs(product)
  const faq = productFaq(product)
  const shipsBy = presaleShipsBy(product)
  const shipLine = presaleShipLine(product)

  return (
    <div className="flex flex-col gap-12">
      {/* The presale buy box's "Full specifications" link lands here;
          scroll-mt keeps the heading clear of the sticky nav (6 Oct 2026). */}
      {specs.length > 0 && (
        <div id="specifications" className="scroll-mt-20">
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
      {/* The questions a buyer asks of the hardware, answered from the site,
          the terms and the board's own source (lib/util/faq.ts), in the
          specification's rules and type: open text, not accordions, so
          every answer is on the page as it loads (6 Oct 2026). */}
      {faq.length > 0 && (
        <div id="questions" className="scroll-mt-20">
          <h2 className="font-display text-2xl text-ui-fg-base">Questions</h2>
          <dl className="mt-4 divide-y divide-ui-border-base border-y border-ui-border-base">
            {faq.map((f) => (
              <div key={f.question} className="py-3 text-base">
                <dt className="text-ui-fg-base">{f.question}</dt>
                {f.answer.map((p, i) => (
                  <dd
                    key={i}
                    className={`${
                      i ? "mt-3" : "mt-1"
                    } leading-relaxed text-ui-fg-subtle`}
                  >
                    {p}
                  </dd>
                ))}
                {f.link && (
                  <dd className="mt-3">
                    <LocalizedClientLink
                      href={f.link.href}
                      className="text-ui-fg-base underline underline-offset-4 hover:text-white"
                    >
                      {f.link.label}
                    </LocalizedClientLink>
                  </dd>
                )}
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
                Shipping goes by Canada Post. You choose the service at
                checkout, and it is added to the price.
              </p>
              <p>
                US orders go by Canada Post with the US duties already paid,
                so there is nothing more to pay on delivery.
              </p>
            </>
          ) : (
            <p>
              Ships to Canada and the United States by Canada Post. You choose
              the service at checkout.
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
