"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

import { Heading, Text, clx } from "@medusajs/ui"

import { convertToLocale } from "@lib/util/money"
import { cartItemsLabel, holdsPresaleBoard } from "@lib/util/presale"
import { fccNoticeApplies } from "@lib/util/fcc"
import FccNotice from "@modules/common/components/fcc-notice"
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

  // The presale board's cart: the pre-order terms' cancel promise and the
  // link to them join the line.
  const preorder = holdsPresaleBoard(cart.items)

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
                card now, in full.{shipLine ? ` ${shipLine}.` : ""}
                {/* The terms link sits in the cancel sentence it belongs to,
                    a sentence apart from the privacy link, and neither link
                    breaks across lines: on a phone the two used to sit 8 px
                    apart on one line. */}
                {preorder && (
                  <>
                    {" "}
                    You can cancel for a full refund until it ships; see the{" "}
                    <LocalizedClientLink
                      href="/terms"
                      className="underline whitespace-nowrap"
                      data-testid="review-terms-link"
                    >
                      pre-order terms
                    </LocalizedClientLink>
                    .
                  </>
                )}{" "}
                How we handle your details is set out in our{" "}
                <LocalizedClientLink
                  href="/privacy"
                  className="underline whitespace-nowrap"
                >
                  privacy notice
                </LocalizedClientLink>
                .
              </Text>
              {/* The FCC notice for US orders, once more before the card is
                  charged, for a cart holding the board that ships to a US
                  address, while the SDoC is pending (lib/util/fcc.ts, 6 Oct
                  2026). */}
              {preorder &&
                fccNoticeApplies(cart.shipping_address?.country_code) && (
                  <FccNotice className="mt-4 rounded-xl border border-ui-border-base p-4 txt-medium text-ui-fg-subtle" />
                )}
            </div>
          </div>
          <PaymentButton cart={cart} data-testid="submit-order-button" />
        </>
      )}
    </div>
  )
}

export default Review
