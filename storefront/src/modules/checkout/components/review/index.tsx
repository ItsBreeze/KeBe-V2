"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

import { Heading, Text, clx } from "@medusajs/ui"

import { convertToLocale } from "@lib/util/money"
import { cartItemsLabel } from "@lib/util/presale"
import PaymentButton from "../payment-button"
import { useSearchParams } from "next/navigation"

const Review = ({
  cart,
  shipLine,
}: {
  cart: any
  // The presale's ship line in force now, read from the product by the page.
  // Null for any other cart, and then the sentence is left out.
  shipLine: string | null
}) => {
  const searchParams = useSearchParams()

  const isOpen = searchParams.get("step") === "review"

  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0

  const shippingMethod = cart.shipping_methods?.at(-1)

  const previousStepsCompleted =
    cart.shipping_address &&
    !!shippingMethod &&
    (cart.payment_collection || paidByGiftcard)

  const money = (amount?: number | null) =>
    convertToLocale({ amount: amount ?? 0, currency_code: cart.currency_code })

  // "KeBe v2 pre-order CA$349.00 + Canada Post Expedited Parcel CA$20.00 =
  // CA$369.00". Taxes join the sum only when the cart has them, as in the
  // phone's order bar, so it still adds up.
  const sum = [
    `${cartItemsLabel(cart.items ?? [])} ${money(cart.item_subtotal)}`,
    `+ ${shippingMethod?.name} ${money(cart.shipping_subtotal)}`,
    cart.tax_total ? `+ ${money(cart.tax_total)} taxes` : "",
    `= ${money(cart.total)}`,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="bg-ui-bg-base">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row text-3xl-regular gap-x-2 items-baseline",
            {
              "opacity-50 pointer-events-none select-none": !isOpen,
            }
          )}
        >
          Review
        </Heading>
      </div>
      {isOpen && !shippingMethod && (
        <Text
          className="txt-medium text-ui-fg-base"
          data-testid="review-no-delivery"
        >
          <LocalizedClientLink
            href="/checkout?step=delivery"
            className="underline"
          >
            Choose a delivery option
          </LocalizedClientLink>{" "}
          first.
        </Text>
      )}
      {isOpen && previousStepsCompleted && (
        <>
          <div className="flex items-start gap-x-1 w-full mb-6">
            <div className="w-full">
              {/* The starter's line had buyers accept a Terms of Use, Terms
                  of Sale and Returns Policy that do not exist, and "Medusa
                  Store's" privacy policy. Only what is true is said here.
                  The amounts are written out (6 Oct 2026): on a phone the
                  order summary comes after this step, so "the total above"
                  pointed at nothing. */}
              <Text
                className="txt-medium-plus text-ui-fg-base mb-1"
                data-testid="review-order-line"
              >
                {sum}. Placing the order charges {money(cart.total)} to your
                card now, in full.{shipLine ? ` ${shipLine}.` : ""} How we
                handle your details is set out in our{" "}
                <LocalizedClientLink href="/privacy" className="underline">
                  privacy notice
                </LocalizedClientLink>
                .
              </Text>
            </div>
          </div>
          <PaymentButton cart={cart} data-testid="submit-order-button" />
        </>
      )}
    </div>
  )
}

export default Review
