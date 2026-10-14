import { Text } from "@medusajs/ui"

import { CONTACT_EMAIL } from "@lib/constants"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Bear from "@modules/common/icons/bear"

export default async function Footer() {
  return (
    <footer className="w-full">
      <div className="content-container flex flex-col w-full">
        <div className="flex flex-col gap-y-6 xsmall:flex-row items-start justify-between py-16">
          <div>
            <LocalizedClientLink
              href="/"
              className="flex items-center gap-x-3 font-display text-2xl uppercase tracking-[0.25em] text-ui-fg-subtle hover:text-ui-fg-base"
            >
              <Bear height={22} />
              KeBe
            </LocalizedClientLink>
          </div>
        </div>
        <div className="flex w-full flex-col gap-y-2 mb-16 small:flex-row small:justify-between text-ui-fg-muted">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Text className="txt-compact-small">
              © {new Date().getFullYear()} KeBe. All rights reserved.
            </Text>
            {/* The one shop link: the starter's Categories and Collections
                columns listed "Keyboards" under a heading (design audit,
                14 Oct 2026). */}
            <LocalizedClientLink
              href="/store"
              className="txt-compact-small hover:text-ui-fg-base"
            >
              Keyboards
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/privacy"
              className="txt-compact-small hover:text-ui-fg-base"
            >
              Privacy
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/terms"
              className="txt-compact-small hover:text-ui-fg-base"
            >
              Pre-order terms
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/contact"
              className="txt-compact-small hover:text-ui-fg-base"
            >
              Contact
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/train"
              className="txt-compact-small hover:text-ui-fg-base"
            >
              Typing trainer
            </LocalizedClientLink>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="txt-compact-small hover:text-ui-fg-base"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
          <Text className="txt-compact-small">
            Designed and Assembled in Canada
          </Text>
        </div>
      </div>
    </footer>
  )
}
