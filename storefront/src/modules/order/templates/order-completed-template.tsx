import { Heading, Text } from "@medusajs/ui"
import { cookies as nextCookies } from "next/headers"

import { CONTACT_EMAIL, STATEMENT_DESCRIPTOR } from "@lib/constants"
import { convertToLocale } from "@lib/util/money"
import { fccNoticeBoardsIn } from "@lib/util/fcc"
import FccNotice from "@modules/common/components/fcc-notice"
import CartTotals from "@modules/common/components/cart-totals"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OnboardingCta from "@modules/order/components/onboarding-cta"
import OrderDetails from "@modules/order/components/order-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import PaymentDetails from "@modules/order/components/payment-details"
import { HttpTypes } from "@medusajs/types"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
  // The ship line recorded when the order was paid for
  // (retrieveOrderShipLine). Null for an order without one, and then the
  // paragraph under the details is left out.
  shipLine: string | null
}

export default async function OrderCompletedTemplate({
  order,
  shipLine,
}: OrderCompletedTemplateProps) {
  const cookies = await nextCookies()

  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true"

  return (
    <div className="py-6 min-h-[calc(100vh-64px)]">
      <div className="content-container flex flex-col justify-center items-center gap-y-10 max-w-4xl h-full w-full">
        {isOnboarding && <OnboardingCta orderId={order.id} />}
        <div
          className="flex flex-col gap-4 max-w-4xl h-full bg-ui-bg-base w-full py-10"
          data-testid="order-complete-container"
        >
          {/* A plain statement in the site's voice (6 Oct 2026). The order
              number stays in the details below, not in the heading. */}
          <Heading level="h1" className="text-ui-fg-base text-3xl mb-4">
            Your order is placed.
          </Heading>
          <OrderDetails order={order} receipt />
          {/* What happens next for a pre-order: when it ships, what has been
              charged and who to ask (6 Oct 2026). order.total includes
              shipping. */}
          {shipLine && (
            <Text data-testid="order-ship-line">
              {shipLine}. Your card has been charged{" "}
              {convertToLocale({
                amount: order.total,
                currency_code: order.currency_code,
              })}
              , in full; it shows on your statement as {STATEMENT_DESCRIPTOR}.
              Questions:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="underline underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>
              , quoting your order number.
            </Text>
          )}
          {/* The FCC notice for US orders, kept with the order it applies
              to: each board in it whose SDoC is pending, shipping to a US
              address (lib/util/fcc.ts, 7 Oct 2026). The shop sends no
              confirmation email of its own, so this page is the record. */}
          <FccNotice
            boards={fccNoticeBoardsIn(
              order.shipping_address?.country_code,
              order.items
            )}
            className="rounded-xl border border-ui-border-base p-4 txt-medium text-ui-fg-subtle"
          />
          <Heading level="h2" className="flex flex-row text-3xl-regular">
            Summary
          </Heading>
          <Items order={order} />
          <CartTotals totals={order} />
          <ShippingDetails order={order} />
          <PaymentDetails order={order} />
          <Help order={order} />
        </div>
      </div>
    </div>
  )
}
