import { HttpTypes } from "@medusajs/types"
import { litePlannedPrice } from "@lib/util/presale"
import { fccNoticeBoards } from "@lib/util/fcc"
import FccNotice from "@modules/common/components/fcc-notice"
import WaitlistForm from "@modules/home/components/waitlist-form"

// KeBe Lite's buy box while it is on hold (owner, 14 Oct 2026): no variant
// picker, price, Pre-order button or phone bar, so nothing on its page can put
// it in a cart; an email-only waitlist measures who wants one. The planned
// price is this store's, never a ship date. /us keeps the FCC notice the page
// gave before: the page still advertises the board.
export default function LiteWaitlist({
  product,
  countryCode,
}: {
  product: HttpTypes.StoreProduct
  countryCode: string
}) {
  return (
    <section className="flex flex-col gap-y-4" data-testid="lite-waitlist">
      <p className="text-xl text-ui-fg-base">
        Planned price {litePlannedPrice(countryCode)} plus shipping
      </p>
      <p className="text-base leading-relaxed text-ui-fg-subtle">
        KeBe Lite is on hold. Its keypad needs moulds that don&apos;t pay off
        until enough people want one. Join the waitlist: no payment, and
        we&apos;ll email you once if it goes ahead.
      </p>
      <WaitlistForm source="lite" />
      <FccNotice
        boards={fccNoticeBoards(countryCode, [product.handle])}
        className="rounded-xl border border-ui-border-base bg-kebe-raised p-4 text-base leading-relaxed text-ui-fg-subtle"
      />
    </section>
  )
}
