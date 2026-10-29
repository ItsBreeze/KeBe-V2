import { Text } from "@medusajs/ui"

import { CONTACT_EMAIL } from "@lib/constants"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Bear from "@modules/common/icons/bear"

// The owner's Instagram accounts, same order on every site
const INSTAGRAM_HANDLES = [
  "brisebois.boards",
  "unslip.app",
  "offhand.app",
  "grounders.app",
  "itsradio.app",
  "hub.ai.app",
]

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
              Brisebois&apos; Boards
            </LocalizedClientLink>
          </div>
        </div>
        <div className="flex w-full flex-col gap-y-2 mb-2 small:flex-row small:justify-between text-ui-fg-muted">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Text className="txt-compact-small">
              © {new Date().getFullYear()} Brisebois&apos; Boards. All rights reserved.
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
              Order terms
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
            {/* The BabyLoveGrowth-hosted blog: this is its one inbound link */}
            <a
              href="https://blog.kebe.grounders.app/blog"
              className="txt-compact-small hover:text-ui-fg-base"
            >
              Blog
            </a>
            {/* KeBe's free autocorrect app; its site links back here */}
            <a
              href="https://unslip.brisebois.xyz"
              className="txt-compact-small hover:text-ui-fg-base"
            >
              Unslip autocorrect
            </a>
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
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-16 text-ui-fg-muted">
          <Text className="txt-compact-small">Instagram</Text>
          {INSTAGRAM_HANDLES.map((handle) => (
            <a
              key={handle}
              href={`https://www.instagram.com/${handle}/`}
              className="txt-compact-small hover:text-ui-fg-base"
            >
              @{handle}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
