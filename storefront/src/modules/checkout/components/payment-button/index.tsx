"use client"

import { CONTACT_EMAIL, isManual, isStripeLike } from "@lib/constants"
import { placeOrder } from "@lib/data/cart"
import { subdivisionCode } from "@lib/util/subdivisions"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import { unstable_rethrow, useParams } from "next/navigation"
import React, { useState } from "react"
import ErrorMessage from "../error-message"

// What the buyer reads when the card has gone through but placeOrder could
// not make the order. They must not pay a second time, and the cart's id is
// the reference that leads to their payment.
export const paidButNotPlaced = (cartId: string) =>
  `Your payment went through, but the order did not finish saving. Please do not pay again. Email ${CONTACT_EMAIL} and quote ${cartId}.`

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart
  "data-testid": string
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  "data-testid": dataTestId,
}) => {
  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    (cart.shipping_methods?.length ?? 0) < 1

  const paymentSession = cart.payment_collection?.payment_sessions?.[0]

  switch (true) {
    case isStripeLike(paymentSession?.provider_id):
      return (
        <StripePaymentButton
          notReady={notReady}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    case isManual(paymentSession?.provider_id):
      return (
        <ManualTestPaymentButton
          cart={cart}
          notReady={notReady}
          data-testid={dataTestId}
        />
      )
    default:
      return <Button disabled>Select a payment method</Button>
  }
}

const StripePaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // placeOrder returns its failure. A placed order redirects instead, which
  // reaches this catch as NEXT_REDIRECT and must be thrown on to Next.
  const onPaymentCompleted = async () => {
    try {
      const res = await placeOrder()

      if (res?.error) {
        setErrorMessage(paidButNotPlaced(cart.id))
      }
    } catch (e) {
      unstable_rethrow(e)
      setErrorMessage(paidButNotPlaced(cart.id))
    }
  }

  const stripe = useStripe()
  const elements = useElements()
  const { countryCode } = useParams<{ countryCode: string }>()

  const disabled = !stripe || !elements ? true : false

  const handlePayment = async () => {
    if (!stripe || !elements || !cart) {
      return
    }

    setErrorMessage(null)
    setSubmitting(true)

    // Set once the card has gone through. The button then stays disabled,
    // through the move to the confirmation page, and for good if the order
    // failed, since the card must not be charged twice.
    let completing = false

    try {
      // Read on the tap, not during render: the payment field is created
      // after this button first renders, so a value read then can still be
      // null.
      if (!elements.getElement("payment")) {
        setErrorMessage(
          "The payment form isn't ready yet. Wait a moment and tap Place order again."
        )
        return
      }

      const billing = cart.billing_address
      const shipping = cart.shipping_address

      // Cards, Apple Pay, Google Pay and Link finish here, with no redirect.
      // A way to pay that leaves the site (Klarna, Afterpay) comes back to
      // return_url, which places the order.
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/api/stripe-return?cart_id=${cart.id}&country_code=${countryCode}`,
          payment_method_data: {
            billing_details: {
              name: billing?.first_name + " " + billing?.last_name,
              // The payment field leaves the address out, so every part of it
              // has to be passed, if only as "".
              address: {
                city: billing?.city ?? "",
                country: billing?.country_code ?? "",
                line1: billing?.address_1 ?? "",
                line2: billing?.address_2 ?? "",
                postal_code: billing?.postal_code ?? "",
                // The cart stores the province as its tax code, "ca-on";
                // the card's billing state is the two letters, "ON".
                state: subdivisionCode(billing?.province) ?? "",
              },
              email: cart.email,
              phone: billing?.phone ?? undefined,
            },
          },
          shipping: shipping
            ? {
                name: shipping.first_name + " " + shipping.last_name,
                address: {
                  city: shipping.city ?? undefined,
                  country: shipping.country_code ?? undefined,
                  line1: shipping.address_1 ?? "",
                  line2: shipping.address_2 ?? undefined,
                  postal_code: shipping.postal_code ?? undefined,
                  state: subdivisionCode(shipping.province),
                },
              }
            : undefined,
          // Stripe's receipt is the one email the buyer gets (6 Oct 2026):
          // the order mail reaches only KeBe's own inbox. In live mode Stripe
          // sends it whenever this is set; test mode sends none.
          receipt_email: cart.email ?? undefined,
        },
      })

      if (error) {
        const pi = error.payment_intent

        // The card has already gone through, on an earlier tap or before a
        // reload, so this is not a decline: finish the order.
        if (pi?.status === "succeeded" || pi?.status === "requires_capture") {
          completing = true
          await onPaymentCompleted()
          return
        }

        // A decline or a card number Stripe rejects: its own message, which
        // Stripe writes for buyers, and the button back for another try. At
        // Review the card field is closed, so the way back to it is named:
        // Payment's Change.
        if (error.type === "card_error" || error.type === "validation_error") {
          setErrorMessage(
            [
              error.message,
              "Tap Change under Payment to check the card or use another one.",
            ]
              .filter(Boolean)
              .join(" ")
          )
          return
        }

        setErrorMessage(
          `The payment did not go through. Try again, or email ${CONTACT_EMAIL}.`
        )
        return
      }

      if (
        paymentIntent.status === "requires_capture" ||
        paymentIntent.status === "succeeded"
      ) {
        completing = true
        await onPaymentCompleted()
      }
    } catch (e) {
      unstable_rethrow(e)
      setErrorMessage(
        "We could not reach the payment service. Check your connection and tap Place order again."
      )
    } finally {
      if (!completing) {
        setSubmitting(false)
      }
    }
  }

  return (
    <>
      <Button
        disabled={disabled || notReady}
        onClick={handlePayment}
        size="large"
        isLoading={submitting}
        data-testid={dataTestId}
      >
        Place order
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="stripe-payment-error-message"
      />
    </>
  )
}

// Local testing only: production has Stripe alone. It fails as the card
// button does, so a test shows what a buyer would read.
const ManualTestPaymentButton = ({
  cart,
  notReady,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handlePayment = async () => {
    setErrorMessage(null)
    setSubmitting(true)

    try {
      const res = await placeOrder()

      if (res?.error) {
        setErrorMessage(paidButNotPlaced(cart.id))
      }
    } catch (e) {
      unstable_rethrow(e)
      setErrorMessage(paidButNotPlaced(cart.id))
    }
  }

  return (
    <>
      <Button
        disabled={notReady}
        isLoading={submitting}
        onClick={handlePayment}
        size="large"
        data-testid="submit-order-button"
      >
        Place order
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="manual-payment-error-message"
      />
    </>
  )
}

export default PaymentButton
