import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getCartPresaleShipInfo } from "@lib/data/products"
import { presaleLineOf } from "@lib/util/presale"
import MobileOrderBar from "@modules/checkout/components/mobile-order-bar"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import AddedToCart from "@modules/common/components/meta-pixel/added-to-cart"
import PixelEvent from "@modules/common/components/meta-pixel/pixel-event"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Checkout",
}

export default async function Checkout(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const cart = await retrieveCart()

  // No cart: the cookie is not there (a page moved from Instagram's browser
  // to the phone's own, or Back after an order) or the cart could not be
  // read. The cart page says what to do next, where a 404 said only "Page
  // not found".
  if (!cart) {
    redirect(`/${countryCode}/cart`)
  }

  const customer = await retrieveCustomer()
  const items = cart.items ?? []

  // The pre-order's line: the Pre-order form lands here with ?added=1, and
  // this page counts its AddToCart.
  const presaleLine = presaleLineOf(items)

  // The ship line the product page shows now, for the phone's order bar,
  // Delivery and Review. It is the cached product read: the line on the cart
  // item is from when the board was added, and placeOrder records the line
  // in force at payment.
  const shipLine =
    presaleLine && cart.region_id
      ? (
          await getCartPresaleShipInfo({
            regionId: cart.region_id,
            items,
            countryCode: cart.shipping_address?.country_code ?? countryCode,
          })
        )
          ?.shipLine ??
        null
      : null

  return (
    <div className="grid grid-cols-1 small:grid-cols-[1fr_416px] content-container gap-x-40 py-12">
      <MobileOrderBar cart={cart} shipLine={shipLine} />
      {presaleLine?.product_id && (
        <Suspense fallback={null}>
          <AddedToCart
            lineId={presaleLine.id}
            productId={presaleLine.product_id}
            title={presaleLine.product_title ?? presaleLine.title}
            value={presaleLine.unit_price}
            currency={cart.currency_code.toUpperCase()}
          />
        </Suspense>
      )}
      <PixelEvent
        event="InitiateCheckout"
        params={{
          value: cart.total,
          currency: cart.currency_code.toUpperCase(),
          content_ids: items.map((i) => i.product_id).filter(Boolean),
          content_type: "product",
          num_items: items.reduce((n, i) => n + i.quantity, 0),
        }}
      />
      <PaymentWrapper cart={cart}>
        <CheckoutForm cart={cart} customer={customer} shipLine={shipLine} />
      </PaymentWrapper>
      <CheckoutSummary cart={cart} />
    </div>
  )
}
