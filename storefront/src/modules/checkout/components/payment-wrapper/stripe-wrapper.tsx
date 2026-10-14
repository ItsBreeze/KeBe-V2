"use client"

import { Stripe, StripeElementsOptions } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"
import { HttpTypes } from "@medusajs/types"
import { createContext } from "react"

type StripeWrapperProps = {
  paymentSession: HttpTypes.StorePaymentSession
  stripeKey?: string
  stripePromise: Promise<Stripe | null> | null
  children: React.ReactNode
}

export const StripeContext = createContext(false)

// Stripe draws its payment field in its own iframe, so the store's dark theme
// has to be passed in: bone text on the field colour, as the other fields.
// 16px text, as the other fields too: iOS zooms in on a smaller field when it
// is focused, and stays zoomed.
export const appearance: StripeElementsOptions["appearance"] = {
  theme: "night",
  variables: {
    fontFamily: "Inter, sans-serif",
    fontSizeBase: "16px",
    colorPrimary: "#f5f1ea",
    colorBackground: "#1c1a17",
    colorText: "#f5f1ea",
    colorTextPlaceholder: "#9b948a",
    colorDanger: "#fb7185",
  },
  rules: {
    ".Input": { borderColor: "#2e2b26" },
    ".Tab": { borderColor: "#2e2b26" },
  },
}

const StripeWrapper: React.FC<StripeWrapperProps> = ({
  paymentSession,
  stripeKey,
  stripePromise,
  children,
}) => {
  const options: StripeElementsOptions = {
    clientSecret: paymentSession!.data?.client_secret as string | undefined,
    appearance,
  }

  if (!stripeKey) {
    throw new Error(
      "Stripe key is missing. Set NEXT_PUBLIC_STRIPE_KEY environment variable."
    )
  }

  if (!stripePromise) {
    throw new Error(
      "Stripe promise is missing. Make sure you have provided a valid Stripe key."
    )
  }

  if (!paymentSession?.data?.client_secret) {
    throw new Error(
      "Stripe client secret is missing. Cannot initialize Stripe."
    )
  }

  return (
    <StripeContext.Provider value={true}>
      <Elements options={options} stripe={stripePromise}>
        {children}
      </Elements>
    </StripeContext.Provider>
  )
}

export default StripeWrapper
