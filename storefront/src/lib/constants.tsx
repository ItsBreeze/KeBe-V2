import React from "react"
import { CreditCard } from "@medusajs/icons"

import Ideal from "@modules/common/icons/ideal"
import Bancontact from "@modules/common/icons/bancontact"
import PayPal from "@modules/common/icons/paypal"

/* Map of payment provider_id to their title and icon. Add in any payment providers you want to use. */
export const paymentInfoMap: Record<
  string,
  { title: string; icon: React.JSX.Element }
> = {
  pp_stripe_stripe: {
    title: "Card or wallet",
    icon: <CreditCard />,
  },
  "pp_medusa-payments_default": {
    title: "Credit card",
    icon: <CreditCard />,
  },
  "pp_stripe-ideal_stripe": {
    title: "iDeal",
    icon: <Ideal />,
  },
  "pp_stripe-bancontact_stripe": {
    title: "Bancontact",
    icon: <Bancontact />,
  },
  pp_paypal_paypal: {
    title: "PayPal",
    icon: <PayPal />,
  },
  pp_system_default: {
    title: "Manual Payment",
    icon: <CreditCard />,
  },
  // Add more payment providers here
}

// This only checks if it is native stripe or medusa payments for card payments, it ignores the other stripe-based providers
export const isStripeLike = (providerId?: string) => {
  return (
    providerId?.startsWith("pp_stripe_") || providerId?.startsWith("pp_medusa-")
  )
}

export const isPaypal = (providerId?: string) => {
  return providerId?.startsWith("pp_paypal")
}
export const isManual = (providerId?: string) => {
  return providerId?.startsWith("pp_system_default")
}

// Add currencies that don't need to be divided by 100
export const noDivisionCurrencies = [
  "krw",
  "jpy",
  "vnd",
  "clp",
  "pyg",
  "xaf",
  "xof",
  "bif",
  "djf",
  "gnf",
  "kmf",
  "mga",
  "rwf",
  "xpf",
  "htg",
  "vuv",
  "xag",
  "xdr",
  "xau",
]

// Where buyers and the privacy notice send people. Porkbun email forwarding
// delivers it to the owner's inbox (22 Oct 2026; the old support@grounders.app
// still forwards too). (support@keberds.ca is dead: the .ca domain lapsed.)
export const CONTACT_EMAIL = "support@brisebois.xyz"

// Who sells KeBe, as the pre-order terms and the contact page name it (owner,
// 6 Oct 2026; province corrected 18 Oct 2026: "It can say bc but Vancouver
// and the address no"). KEBERDS is a BC sole proprietorship (FM1049069). No
// city, street address or personal name is published; BC's distance-sales
// rules (BPCPA s.46) list the seller's name, address and phone among what a
// buyer is told before ordering, so the address stays the owner's open
// decision. (Not legal advice.)
export const SELLER_NAME = "KEBERDS"
export const SELLER_PLACE = "British Columbia, Canada"
export const CONTACT_PHONE = "780-901-1304"
// The same number for a tel: link.
export const CONTACT_PHONE_TEL = "+17809011304"

// What a KeBe charge is called on the buyer's card statement: the Stripe
// account's statement descriptor, checked in its Public details on 6 Oct 2026.
// The account is shared with Offhand, so it is not renamed for KeBe; the site
// says what the charge will be called instead, so a buyer recognises it.
// Change this if the descriptor changes in Stripe.
export const STATEMENT_DESCRIPTOR = "GROUNDERS.APP"
