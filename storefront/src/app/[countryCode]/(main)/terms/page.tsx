import { Metadata } from "next"
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_TEL,
  SELLER_NAME,
  SELLER_PLACE,
} from "@lib/constants"
import { getRegion } from "@lib/data/regions"
import { pageAlternates } from "@lib/data/seo"
import { BRAND, socialMetadata } from "@lib/util/seo"

// "KeBe keyboard": the brand alone is easily read as "keeb" or Keebio.
const DESCRIPTION =
  "The terms of a KeBe keyboard pre-order: who sells it, the price, paying, shipping, cancelling, returns and the warranty."

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params
  return {
    // The root layout's template adds " | KeBe".
    title: "Pre-order terms",
    description: DESCRIPTION,
    alternates: await pageAlternates(countryCode, "/terms"),
    ...socialMetadata({
      title: `Pre-order terms | ${BRAND}`,
      description: DESCRIPTION,
      path: "/terms",
      countryCode,
    }),
  }
}

// Last substantive change to these terms. Update it whenever the content
// changes.
const LAST_UPDATED = "6 October 2026"

// The region's currency as a sentence says it. Read from the region, so
// /ca and /us each name their own; nothing when it is unknown.
const CURRENCY_NAMES: Record<string, string> = {
  cad: "Canadian dollars",
  usd: "US dollars",
}

// The owner's terms of 6 Oct 2026, in the owner's words where they exist:
// cancel before it ships, the late-delivery choice, returns and the
// warranty. Only what the owner decided is promised. Not decided, so not said: a reply time, who
// pays shipping on a warranty repair, a tracking email, French terms and any
// count of boards. No price amount either: the product page shows the
// region's pre-order price, and the later price is never named.
export default async function TermsPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const region = await getRegion(countryCode)
  const currency = region?.currency_code
    ? CURRENCY_NAMES[region.currency_code.toLowerCase()] ??
      region.currency_code.toUpperCase()
    : null

  const email = (
    <a className="underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
      {CONTACT_EMAIL}
    </a>
  )

  return (
    <div className="bg-ui-bg-base">
      <div className="mx-auto max-w-[760px] px-[6vw] py-20 small:px-[4vw]">
        <h1 className="font-display text-[clamp(2rem,5vw,2.8rem)] text-ui-fg-base">
          Pre-order terms
        </h1>
        <p className="mt-3 text-sm text-kebe-muted">
          Last updated {LAST_UPDATED}
        </p>

        <div className="mt-10 flex flex-col gap-8 text-base leading-relaxed text-kebe-text/80">
          <section>
            <h2 className="font-display text-2xl text-ui-fg-base">
              Who sells it
            </h2>
            <p className="mt-3">
              {BRAND} is sold by {SELLER_NAME}, {SELLER_PLACE}.
            </p>
            <p className="mt-3">
              Phone{" "}
              <a
                className="underline underline-offset-4"
                href={`tel:${CONTACT_PHONE_TEL}`}
              >
                {CONTACT_PHONE}
              </a>
              . Email {email}.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ui-fg-base">The price</h2>
            <p className="mt-3">
              You pay the pre-order price shown on the product page, plus the
              shipping you choose at checkout
              {currency ? `, in ${currency}` : ""}. Any tax is shown at
              checkout before you pay.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ui-fg-base">Paying</h2>
            <p className="mt-3">
              You pay in full when you order, by card through Stripe. We never
              see your card number.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ui-fg-base">
              When it ships
            </h2>
            {/* The second and third sentences are the product page's
                Shipping section (product-tabs), word for word. No "by": the
                shown date is not a deadline here, and "If it is late" is the
                only commitment about it (owner, 6 Oct 2026). */}
            <p className="mt-3">
              Before you order, the site shows the date your board ships.
              Shipping goes by Canada Post. US orders go by Canada Post with
              the US duties already paid, so there is nothing more to pay on
              delivery.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ui-fg-base">
              Changing your mind
            </h2>
            <p className="mt-3">
              Cancel any time before your board ships for a full refund within
              5 business days. To cancel, email {email} with your order number.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ui-fg-base">
              If it is late
            </h2>
            <p className="mt-3">
              If it hasn&apos;t shipped 30 days after the date shown when you
              ordered, we email you and you choose a full refund or keep
              waiting.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ui-fg-base">Returns</h2>
            {/* The first sentence is the owner's (6 Oct 2026). No address is
                published, so the second says where to get one; it is not a
                condition of the refund. */}
            <p className="mt-3">
              Return the board within 30 days of delivery, in its original
              condition, for a refund; buyer pays return shipping. For the
              return address, email {email} with your order number.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ui-fg-base">Warranty</h2>
            {/* The owner's words (6 Oct 2026), with no exclusion added. */}
            <p className="mt-3">Defects repaired or replaced for a year.</p>
          </section>

          <p>
            These terms add to the rights your province&apos;s or state&apos;s
            consumer law gives you; they do not replace them.
          </p>
        </div>
      </div>
    </div>
  )
}
