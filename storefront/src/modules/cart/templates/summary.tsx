"use client"

import { Button, Heading } from "@medusajs/ui"

import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"
import DiscountCode from "@modules/checkout/components/discount-code"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getCheckoutStep } from "@lib/util/checkout-step"
import { HttpTypes } from "@medusajs/types"

type SummaryProps = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[]
  }
  shippingNote?: string
}

const Summary = ({ cart, shippingNote }: SummaryProps) => {
  const step = getCheckoutStep(cart)

  return (
    <div className="flex flex-col gap-y-4">
      <Heading level="h2" className="text-[2rem] leading-[2.75rem]">
        Summary
      </Heading>
      {/* The promotion code field shows only on a cart that already has a
          promotion (6 Oct 2026): KeBe runs none, and the field sent buyers
          looking for a code that does not exist. */}
      {!!cart.promotions?.length && <DiscountCode cart={cart} />}
      <Divider />
      <CartTotals totals={cart} shippingNote={shippingNote} />
      <LocalizedClientLink
        href={"/checkout?step=" + step}
        data-testid="checkout-button"
      >
        <Button className="w-full h-10">Go to checkout</Button>
      </LocalizedClientLink>
    </div>
  )
}

export default Summary
