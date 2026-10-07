import { HttpTypes } from "@medusajs/types"
import { presaleShipsBy } from "@lib/util/presale"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type BeforeYouPreorderProps = {
  product: HttpTypes.StoreProduct
  // Not read yet: the shipping row to come has a duties line for US orders
  // only.
  countryCode: string
}

// Short answers under the presale board's button to what a first-time buyer
// asks before paying: the learning curve, whether it works with their
// computer, how payment works and whether they can cancel. Before this they
// were several screens down, only on the homepage, or nowhere (6 Oct 2026).
// Native <details>
// open and close before the page's script has loaded, and at most four rows
// keep the section short on a phone. No counts, no prices and no pixel
// events.
//
// Rows 1 and 2 say only what holds whatever keymap a board ships with. The
// longer answers, that the Dvorak layout lives in the keyboard so the
// computer stays on English (US), and that Super works as Command on a Mac,
// waited until the shipped v2 keymap and a Mac had been checked. The keymap
// has been (6 Oct 2026), so the first is in the Questions under the
// specification (lib/util/faq.ts); the Mac one still waits for a Mac.
//
// The ship date is not a row: the eyebrow and the presale note above already
// say it. If it ever becomes one, it reads presaleShipLine(product) live,
// never a cart line's metadata.
const BeforeYouPreorder = ({ product }: BeforeYouPreorderProps) => {
  if (!presaleShipsBy(product)) {
    return null
  }

  return (
    <section aria-labelledby="byp" className="flex flex-col gap-4">
      <h2 id="byp" className="font-display text-xl text-ui-fg-base">
        Before you pre-order
      </h2>
      <div className="divide-y divide-ui-border-base border-y border-ui-border-base">
        <Row question="Will I have to relearn typing?">
          {/* The first two sentences after "Yes." are the homepage's
              learning paragraph, word for word. */}
          <p>
            Yes. Nothing sits where a standard keyboard puts it, so you learn
            KeBe as a new instrument instead of unpicking old habits one key
            at a time. Switching takes practice, and the first weeks are
            slower. The free typing trainer on this site teaches the layout
            one letter at a time, so you can start before your board arrives.
          </p>
          <p className="mt-3">
            <LocalizedClientLink
              href="/train"
              className="text-ui-fg-base underline underline-offset-4 hover:text-white"
            >
              Open the typing trainer
            </LocalizedClientLink>
          </p>
        </Row>
        <Row question="Does it work with my computer?">
          <p>
            It is a USB keyboard: plug it in by USB-C and it types, with
            nothing to install.
          </p>
        </Row>
        {/* What shipping costs goes here once its price is settled: the
            Canada Post services, their transit times and, for US orders,
            the duties line. */}
        {/* The cancel and late-delivery sentences are the owner's terms of
            6 Oct 2026, word for word, as the terms page has them. */}
        <Row question="How do I pay, and can I cancel?">
          <p>
            By card, in full at checkout, through Stripe. The card number goes
            to Stripe, not to us. You check out as a guest, with no account
            needed.
          </p>
          <p className="mt-3">
            Cancel any time before your board ships for a full refund within
            5 business days. If it hasn&apos;t shipped 30 days after the date
            shown when you ordered, we email you and you choose a full refund
            or keep waiting.
          </p>
          <p className="mt-3">
            <LocalizedClientLink
              href="/terms"
              className="text-ui-fg-base underline underline-offset-4 hover:text-white"
            >
              Pre-order terms
            </LocalizedClientLink>
          </p>
        </Row>
      </div>
    </section>
  )
}

// One question and its answer. Safari draws its own triangle on a flex
// <summary>, so it is hidden there too; the + turns to an × when open.
const Row = ({
  question,
  children,
}: {
  question: string
  children: React.ReactNode
}) => (
  <details className="group">
    <summary className="flex cursor-pointer list-none justify-between gap-4 py-3 text-base text-ui-fg-base [&::-webkit-details-marker]:hidden">
      {question}
      <span
        aria-hidden
        className="shrink-0 font-mono text-ui-fg-muted transition-transform group-open:rotate-45 motion-reduce:transition-none"
      >
        +
      </span>
    </summary>
    <div className="pb-4 text-base leading-relaxed text-ui-fg-subtle">
      {children}
    </div>
  </details>
)

export default BeforeYouPreorder
