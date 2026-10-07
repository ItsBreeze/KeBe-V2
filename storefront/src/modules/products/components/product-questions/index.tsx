import { HttpTypes } from "@medusajs/types"
import { isExternalLink, productFaq } from "@lib/util/faq"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

// The questions a buyer asks of the hardware, answered from the site, the
// terms and the board's own source (lib/util/faq.ts): open text, not
// accordions, so every answer is on the page as it loads. A section of its
// own across the page, two columns wide, rather than a long single column
// under the specification that left the page's left half empty (owner,
// 6 Oct 2026).
const ProductQuestions = ({ product }: { product: HttpTypes.StoreProduct }) => {
  const faq = productFaq(product)
  if (!faq.length) return null

  return (
    <section className="border-t border-ui-border-base">
      <div
        id="questions"
        className="content-container scroll-mt-20 py-16 small:py-24"
      >
        <h2 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] text-ui-fg-base">
          Questions
        </h2>
        <dl className="mt-8 grid grid-cols-1 gap-x-16 small:grid-cols-2">
          {faq.map((f) => (
            <div
              key={f.question}
              className="border-t border-ui-border-base py-5 text-base"
            >
              <dt className="text-ui-fg-base">{f.question}</dt>
              {f.answer.map((p, i) => (
                <dd
                  key={i}
                  className={`${i ? "mt-3" : "mt-2"} leading-relaxed text-ui-fg-subtle`}
                >
                  {p}
                </dd>
              ))}
              {f.link && (
                <dd className="mt-3">
                  {isExternalLink(f.link) ? (
                    <a
                      href={f.link.href}
                      className="text-ui-fg-base underline underline-offset-4 hover:text-white"
                    >
                      {f.link.label}
                    </a>
                  ) : (
                    <LocalizedClientLink
                      href={f.link.href}
                      className="text-ui-fg-base underline underline-offset-4 hover:text-white"
                    >
                      {f.link.label}
                    </LocalizedClientLink>
                  )}
                </dd>
              )}
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

export default ProductQuestions
