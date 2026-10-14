import { HttpTypes } from "@medusajs/types"
import { litePlannedPrice } from "@lib/util/presale"
import { FCC_NOT_FOR_SALE, fccPending } from "@lib/util/fcc"
import WaitlistForm from "@modules/home/components/waitlist-form"

// KeBe Lite's buy box while it is on hold (owner, 14 Oct 2026): no variant
// picker, price, Pre-order button or phone bar, so nothing on its page can put
// it in a cart; an email-only waitlist measures who wants one. The planned
// price is this store's, never a ship date. /us still shows the board, so it
// gives the FCC's notice for a device not offered for sale while its SDoC is
// pending, not the conditional-sale one: there is no order.
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
        KeBe Lite is planned, not made yet. Its keypad needs moulds that don&apos;t pay off
        until enough people want one. Join the waitlist: no payment, and
        we&apos;ll email you once if it goes ahead.
      </p>
      <WaitlistForm source="lite" />
      {countryCode === "us" && fccPending(product.handle) && (
        <p
          className="rounded-xl bg-kebe-raised p-4 text-base leading-relaxed text-ui-fg-subtle"
          data-testid="fcc-not-for-sale"
        >
          <strong className="font-medium text-ui-fg-base">
            FCC notice for KeBe Lite.
          </strong>{" "}
          {FCC_NOT_FOR_SALE}
        </p>
      )}
    </section>
  )
}
