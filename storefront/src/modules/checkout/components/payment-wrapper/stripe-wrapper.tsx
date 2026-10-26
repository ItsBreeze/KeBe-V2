"use client"

import { Stripe, StripeElementsOptions } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"
import { HttpTypes } from "@medusajs/types"
import { createContext, useSyncExternalStore } from "react"

type StripeWrapperProps = {
  paymentSession: HttpTypes.StorePaymentSession
  stripeKey?: string
  stripePromise: Promise<Stripe | null> | null
  children: React.ReactNode
}

export const StripeContext = createContext(false)

// Stripe draws its payment field in its own iframe, so the store's colours
// have to be passed in: the text colour on the field colour, as the other
// fields, light or dark as the system is set (styles/globals.css). 16px text,
// as the other fields too: iOS zooms in on a smaller field when it is
// focused, and stays zoomed.
const look = (night: boolean): StripeElementsOptions["appearance"] => ({
  theme: night ? "night" : "stripe",
  variables: {
    fontFamily: "Inter, sans-serif",
    fontSizeBase: "16px",
    colorPrimary: night ? "#f5f1ea" : "#1c1a17",
    colorBackground: night ? "#1c1a17" : "#e6e3dc",
    colorText: night ? "#f5f1ea" : "#1c1a17",
    colorTextPlaceholder: night ? "#9b948a" : "#5f584e",
    colorDanger: night ? "#fb7185" : "#a93c2a",
  },
  rules: {
    ".Input": { borderColor: night ? "#2e2b26" : "#cfc7b8" },
    ".Tab": { borderColor: night ? "#2e2b26" : "#cfc7b8" },
  },
})
const NIGHT = look(true)
const DAY = look(false)

const DARK = "(prefers-color-scheme: dark)"
const onSchemeChange = (on: () => void) => {
  const m = window.matchMedia(DARK)
  m.addEventListener("change", on)
  return () => m.removeEventListener("change", on)
}

// Elements passes a changed appearance on to its iframes (elements.update).
export const useAppearance = () =>
  useSyncExternalStore(
    onSchemeChange,
    () => window.matchMedia(DARK).matches,
    () => true
  )
    ? NIGHT
    : DAY

const StripeWrapper: React.FC<StripeWrapperProps> = ({
  paymentSession,
  stripeKey,
  stripePromise,
  children,
}) => {
  const options: StripeElementsOptions = {
    clientSecret: paymentSession!.data?.client_secret as string | undefined,
    appearance: useAppearance(),
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
