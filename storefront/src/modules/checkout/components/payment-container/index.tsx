import { Radio as RadioGroupOption } from "@headlessui/react"
import { Text, clx } from "@medusajs/ui"
import React, { useContext, type JSX } from "react"

import Radio from "@modules/common/components/radio"

import { isManual } from "@lib/constants"
import SkeletonCardDetails from "@modules/skeletons/components/skeleton-card-details"
import { PaymentElement } from "@stripe/react-stripe-js"
import { StripePaymentElementOptions } from "@stripe/stripe-js"
import PaymentTest from "../payment-test"
import { StripeContext } from "../payment-wrapper/stripe-wrapper"

type PaymentContainerProps = {
  paymentProviderId: string
  selectedPaymentOptionId: string | null
  disabled?: boolean
  paymentInfoMap: Record<string, { title: string; icon: JSX.Element }>
  children?: React.ReactNode
}

const PaymentContainer: React.FC<PaymentContainerProps> = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
  children,
}) => {
  const isDevelopment = process.env.NODE_ENV === "development"

  return (
    <RadioGroupOption
      key={paymentProviderId}
      value={paymentProviderId}
      disabled={disabled}
      className={clx(
        "flex flex-col gap-y-2 text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
        {
          "border-ui-border-interactive":
            selectedPaymentOptionId === paymentProviderId,
        }
      )}
    >
      <div className="flex items-center justify-between ">
        <div className="flex items-center gap-x-4">
          <Radio checked={selectedPaymentOptionId === paymentProviderId} />
          <Text className="text-base-regular">
            {paymentInfoMap[paymentProviderId]?.title || paymentProviderId}
          </Text>
          {isManual(paymentProviderId) && isDevelopment && (
            <PaymentTest className="hidden small:block" />
          )}
        </div>
        <span className="justify-self-end text-ui-fg-base">
          {paymentInfoMap[paymentProviderId]?.icon}
        </span>
      </div>
      {isManual(paymentProviderId) && isDevelopment && (
        <PaymentTest className="small:hidden text-[10px]" />
      )}
      {children}
    </RadioGroupOption>
  )
}

export default PaymentContainer

export const StripeCardContainer = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
  setCardBrand,
  setError,
  setCardComplete,
}: Omit<PaymentContainerProps, "children"> & {
  setCardBrand: (brand: string) => void
  setError: (error: string | null) => void
  setCardComplete: (complete: boolean) => void
}) => {
  return (
    <PaymentContainer
      paymentProviderId={paymentProviderId}
      selectedPaymentOptionId={selectedPaymentOptionId}
      paymentInfoMap={paymentInfoMap}
      disabled={disabled}
    >
      {selectedPaymentOptionId === paymentProviderId && (
        <StripeCardField
          label="Enter your card details:"
          setCardBrand={setCardBrand}
          setError={setError}
          setCardComplete={setCardComplete}
        />
      )}
    </PaymentContainer>
  )
}

// What the Payment summary calls the way to pay picked in Stripe's field.
const METHOD_NAMES: Record<string, string> = {
  card: "Card",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  link: "Link",
  klarna: "Klarna",
  afterpay_clearpay: "Afterpay",
  affirm: "Affirm",
}

const paymentElementOptions: StripePaymentElementOptions = {
  layout: "tabs",
  // The billing address already is on the cart, and the payment button
  // sends it to Stripe, so the field does not ask for it a second time.
  fields: { billingDetails: { address: "never" } },
}

// Stripe's payment field on its own, so Payment can show it without a radio
// when Stripe is the only way to pay. It offers a card, plus Apple Pay,
// Google Pay and Link where the phone or browser has them, and whatever else
// the Stripe Dashboard turns on. A grey placeholder until the payment session
// has loaded Stripe.
export const StripeCardField = ({
  label,
  setCardBrand,
  setError,
  setCardComplete,
}: {
  label: string
  setCardBrand: (brand: string) => void
  setError: (error: string | null) => void
  setCardComplete: (complete: boolean) => void
}) => {
  const stripeReady = useContext(StripeContext)

  // Stripe shows its own messages for a mistyped card inside the field.
  return stripeReady ? (
    <div className="my-4 transition-all duration-150 ease-in-out">
      <Text className="txt-medium-plus text-ui-fg-base mb-1">{label}</Text>
      <PaymentElement
        options={paymentElementOptions}
        onChange={(e) => {
          setCardBrand(METHOD_NAMES[e.value.type] ?? e.value.type)
          setError(null)
          setCardComplete(e.complete)
        }}
        onLoadError={() =>
          setError(
            "Could not load the payment form. Reload the page to try again."
          )
        }
      />
    </div>
  ) : (
    <SkeletonCardDetails />
  )
}
