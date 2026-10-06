import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import { HttpTypes } from "@medusajs/types"
import { Text } from "@medusajs/ui"
import Addresses from "@modules/checkout/components/addresses"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"
import Shipping from "@modules/checkout/components/shipping"

export default async function CheckoutForm({
  cart,
  customer,
  shipLine,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  // The presale's ship line in force now, for Delivery and Review.
  shipLine: string | null
}) {
  if (!cart) {
    return null
  }

  const [shippingMethods, paymentMethods] = await Promise.all([
    listCartShippingMethods(cart.id),
    listCartPaymentMethods(cart.region?.id ?? ""),
  ])

  // Either list is null when its request failed. The form cannot work
  // without both, and an empty column said nothing about why.
  if (!shippingMethods || !paymentMethods) {
    return (
      <div className="w-full" data-testid="checkout-options-error">
        <Text className="txt-medium text-ui-fg-base">
          We could not load the delivery or payment options. Reload the page.
        </Text>
      </div>
    )
  }

  return (
    <div className="w-full grid grid-cols-1 gap-y-8">
      <Addresses cart={cart} customer={customer} />

      <Shipping
        cart={cart}
        availableShippingMethods={shippingMethods}
        shipLine={shipLine}
      />

      <Payment cart={cart} availablePaymentMethods={paymentMethods} />

      <Review cart={cart} shipLine={shipLine} />
    </div>
  )
}
