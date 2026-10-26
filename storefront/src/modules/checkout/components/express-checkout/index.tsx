"use client"

import { expressCheckout, placeOrder } from "@lib/data/cart"
import { fccNoticeBoardsIn } from "@lib/util/fcc"
import { convertToLocale } from "@lib/util/money"
import { holdsOnHoldBoard, holdsPresaleBoard } from "@lib/util/presale"
import { HttpTypes } from "@medusajs/types"
import { Text } from "@medusajs/ui"
import ErrorMessage from "@modules/checkout/components/error-message"
import { paidButNotPlaced } from "@modules/checkout/components/payment-button"
import { stripePromise } from "@modules/checkout/components/payment-wrapper"
import { useAppearance } from "@modules/checkout/components/payment-wrapper/stripe-wrapper"
import FccNotice from "@modules/common/components/fcc-notice"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  Elements,
  ExpressCheckoutElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"
import { StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js"
import { unstable_rethrow, useParams } from "next/navigation"
import { useState } from "react"

type Rate = { id: string; displayName: string; amount: number }

const cents = (amount: number) => Math.round(amount * 100)

// Apple Pay, Google Pay and Link at the top of checkout (14 Oct 2026): the
// wallet hands over the name, email, phone and address, the buyer picks the
// delivery in its sheet, and one tap pays, so nothing is typed. The form
// below stays for everyone else. Only buttons the phone or browser has show,
// and none when it has none: Instagram's own browser usually shows only Link.
const ExpressCheckout = ({
  cart,
  shippingOptions,
  shipLine,
}: {
  cart: HttpTypes.StoreCart
  shippingOptions: HttpTypes.StoreCartShippingOptionWithServiceZone[]
  shipLine: string | null
}) => {
  // The options this cart can be sent with, cheapest first, as Addresses
  // picks them: without an address Medusa lists every zone's, and only those
  // with an amount in this cart's currency count.
  const rates: Rate[] = shippingOptions
    .filter(
      (o) =>
        typeof o.amount === "number" &&
        o.service_zone?.fulfillment_set?.type !== "pickup"
    )
    .sort((a, b) => a.amount - b.amount)
    .map((o) => ({ id: o.id, displayName: o.name, amount: cents(o.amount) }))
  const appearance = useAppearance()

  if (!stripePromise || !rates.length || holdsOnHoldBoard(cart.items)) {
    return null
  }

  // The lines without any delivery already chosen; the wallet adds its own.
  const base = cents((cart.total ?? 0) - (cart.shipping_total ?? 0))

  return (
    <Elements
      stripe={stripePromise}
      options={{
        mode: "payment",
        amount: base + rates[0].amount,
        currency: cart.currency_code,
        appearance,
      }}
    >
      <ExpressButtons cart={cart} rates={rates} base={base} shipLine={shipLine} />
    </Elements>
  )
}

const ExpressButtons = ({
  cart,
  rates,
  base,
  shipLine,
}: {
  cart: HttpTypes.StoreCart
  rates: Rate[]
  base: number
  shipLine: string | null
}) => {
  const stripe = useStripe()
  const elements = useElements()
  const { countryCode } = useParams<{ countryCode: string }>()
  const [shown, setShown] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The region's countries: an address elsewhere has no delivery here.
  const regionCountries = (cart.region?.countries ?? [])
    .map((c) => c.iso_2?.toUpperCase())
    .filter((c): c is string => !!c)
  const countries = regionCountries.length
    ? regionCountries
    : [countryCode.toUpperCase()]

  const money = (amount: number) =>
    convertToLocale({ amount: amount / 100, currency_code: cart.currency_code })

  const onConfirm = async (event: StripeExpressCheckoutElementConfirmEvent) => {
    if (!stripe || !elements) {
      return
    }
    setError(null)

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message ?? "The payment did not go through.")
      return
    }

    const contact = event.billingDetails
    const ship = event.shippingAddress
    const rate = rates.find((r) => r.id === event.shippingRate?.id) ?? rates[0]

    const email = contact?.email
    const res =
      ship?.address && email
        ? await expressCheckout({
            email,
            phone: contact?.phone ?? null,
            name: ship.name,
            address: ship.address,
            shippingOptionId: rate.id,
          })
        : { error: "The wallet did not give an email and an address." }

    // The charge has to be the total the sheet showed.
    if (!("error" in res) && res.amount !== base + rate.amount) {
      event.paymentFailed({ reason: "fail" })
      setError(
        `The total came to ${money(res.amount)}, not ${money(base + rate.amount)}. Nothing was charged; check your order below.`
      )
      return
    }

    if ("error" in res) {
      event.paymentFailed({ reason: "fail" })
      setError(`${res.error} Nothing was charged.`)
      return
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret: res.clientSecret,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/api/stripe-return?cart_id=${cart.id}&country_code=${countryCode}`,
        receipt_email: email,
      },
    })

    const paid =
      paymentIntent?.status === "succeeded" ||
      paymentIntent?.status === "requires_capture" ||
      error?.payment_intent?.status === "succeeded" ||
      error?.payment_intent?.status === "requires_capture"

    if (!paid) {
      setError(
        `${error?.message ?? "The payment did not go through."} Nothing was charged.`
      )
      return
    }

    // Paid: placeOrder redirects to the order, or says what went wrong.
    try {
      const placed = await placeOrder(cart.id)
      if (placed?.error) {
        setError(paidButNotPlaced(cart.id))
      }
    } catch (e) {
      unstable_rethrow(e)
      setError(paidButNotPlaced(cart.id))
    }
  }

  const preorder = holdsPresaleBoard(cart.items)

  return (
    <div className={shown ? "flex flex-col gap-y-3" : "hidden"}>
      <ExpressCheckoutElement
        options={{ buttonHeight: 48 }}
        onReady={({ availablePaymentMethods }) =>
          setShown(!!availablePaymentMethods)
        }
        onClick={({ resolve }) =>
          resolve({
            emailRequired: true,
            phoneNumberRequired: true,
            shippingAddressRequired: true,
            allowedShippingCountries: countries,
            shippingRates: rates,
          })
        }
        onShippingRateChange={({ shippingRate, resolve }) => {
          elements?.update({ amount: base + shippingRate.amount })
          resolve()
        }}
        onConfirm={onConfirm}
      />
      <Text className="txt-small text-ui-fg-subtle">
        Your wallet fills in your name, email, phone and address, and you pick
        the delivery in it. Paying charges the total, delivery included, now,
        in full.{shipLine ? " Built and shipped in the order received." : ""}
        {preorder && (
          <>
            {" "}
            You can cancel for a full refund until it ships; see the{" "}
            <LocalizedClientLink
              href="/terms"
              className="underline whitespace-nowrap"
            >
              order terms
            </LocalizedClientLink>
            .
          </>
        )}
      </Text>
      {/* The FCC notice before a US card is charged, as Review shows it. */}
      <FccNotice
        boards={fccNoticeBoardsIn(countryCode, cart.items)}
        className="rounded-xl border border-ui-border-base p-4 txt-small text-ui-fg-subtle"
      />
      <ErrorMessage error={error} data-testid="express-checkout-error" />
      <div className="flex items-center gap-x-3 txt-small text-ui-fg-muted">
        <span className="h-px flex-1 bg-ui-border-base" />
        or fill in your details
        <span className="h-px flex-1 bg-ui-border-base" />
      </div>
    </div>
  )
}

export default ExpressCheckout
