"use client"

import { convertToLocale } from "@lib/util/money"
import React from "react"

type CartTotalsProps = {
  totals: {
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    currency_code: string
    item_subtotal?: number | null
    shipping_subtotal?: number | null
    discount_subtotal?: number | null
    shipping_methods?: { id: string }[] | null
  }
  // The cart page's line for the Shipping row before a delivery is chosen,
  // such as "From CA$20.00, chosen at checkout". Checkout passes nothing.
  shippingNote?: string
}

const CartTotals: React.FC<CartTotalsProps> = ({ totals, shippingNote }) => {
  const {
    currency_code,
    total,
    tax_total,
    item_subtotal,
    shipping_subtotal,
    discount_subtotal,
    shipping_methods,
  } = totals

  // Until a delivery is chosen the cart holds no shipping, and "Shipping
  // CA$0.00 … Total CA$349.00" read as if shipping were free (6 Oct 2026).
  // The price is plus shipping wherever it appears, so the row says shipping
  // is still to come and the total says what it leaves out. An order always
  // has its delivery, so the order pages read as before.
  const shippingChosen = !!shipping_methods?.length

  return (
    <div>
      <div className="flex flex-col gap-y-2 txt-medium text-ui-fg-subtle ">
        <div className="flex items-center justify-between">
          <span>Subtotal (excl. shipping and taxes)</span>
          <span data-testid="cart-subtotal" data-value={item_subtotal || 0}>
            {convertToLocale({ amount: item_subtotal ?? 0, currency_code })}
          </span>
        </div>
        <div className="flex items-center justify-between gap-x-4">
          <span>Shipping</span>
          <span
            className="text-right"
            data-testid="cart-shipping"
            data-value={shipping_subtotal || 0}
          >
            {shippingChosen
              ? convertToLocale({
                  amount: shipping_subtotal ?? 0,
                  currency_code,
                })
              : shippingNote ?? "Chosen at checkout"}
          </span>
        </div>
        {!!discount_subtotal && (
          <div className="flex items-center justify-between">
            <span>Discount</span>
            <span
              className="text-ui-fg-interactive"
              data-testid="cart-discount"
              data-value={discount_subtotal || 0}
            >
              -{" "}
              {convertToLocale({
                amount: discount_subtotal ?? 0,
                currency_code,
              })}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="flex gap-x-1 items-center ">Taxes</span>
          <span data-testid="cart-taxes" data-value={tax_total || 0}>
            {convertToLocale({ amount: tax_total ?? 0, currency_code })}
          </span>
        </div>
      </div>
      <div className="h-px w-full border-b border-ui-border-base my-4" />
      <div className="flex items-center justify-between text-ui-fg-base mb-2 txt-medium ">
        <span>{shippingChosen ? "Total" : "Total before shipping"}</span>
        <span
          className="txt-xlarge-plus"
          data-testid="cart-total"
          data-value={total || 0}
        >
          {convertToLocale({ amount: total ?? 0, currency_code })}
        </span>
      </div>
      <div className="h-px w-full border-b border-ui-border-base mt-4" />
    </div>
  )
}

export default CartTotals
