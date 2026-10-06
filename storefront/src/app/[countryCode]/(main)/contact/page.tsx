import { Metadata } from "next"
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_TEL,
  SELLER_NAME,
  SELLER_PLACE,
} from "@lib/constants"
import { pageAlternates } from "@lib/data/seo"
import { BRAND, socialMetadata } from "@lib/util/seo"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const DESCRIPTION = `${BRAND} keyboards are sold by ${SELLER_NAME}, ${SELLER_PLACE}. How to reach us by email or phone.`

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params
  return {
    // The root layout's template adds " | KeBe".
    title: "Contact",
    description: DESCRIPTION,
    alternates: await pageAlternates(countryCode, "/contact"),
    ...socialMetadata({
      title: `Contact | ${BRAND}`,
      description: DESCRIPTION,
      path: "/contact",
      countryCode,
    }),
  }
}

// The seller's details as the owner gave them (6 Oct 2026): no street
// address and no personal name, and no reply time, which is not decided.
export default function ContactPage() {
  return (
    <div className="bg-ui-bg-base">
      <div className="mx-auto max-w-[760px] px-[6vw] py-20 small:px-[4vw]">
        <h1 className="font-display text-[clamp(2rem,5vw,2.8rem)] text-ui-fg-base">
          Contact
        </h1>

        <div className="mt-10 flex flex-col gap-3 text-base leading-relaxed text-kebe-text/80">
          <p>
            {SELLER_NAME}, {SELLER_PLACE}.
          </p>
          <p>
            Email{" "}
            <a
              className="underline underline-offset-4"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>
          </p>
          <p>
            Phone{" "}
            <a
              className="underline underline-offset-4"
              href={`tel:${CONTACT_PHONE_TEL}`}
            >
              {CONTACT_PHONE}
            </a>
          </p>
          <p>For orders, quote your order number.</p>
          <p className="mt-5">
            <LocalizedClientLink
              href="/terms"
              className="text-ui-fg-base underline underline-offset-4"
            >
              Pre-order terms
            </LocalizedClientLink>
          </p>
        </div>
      </div>
    </div>
  )
}
