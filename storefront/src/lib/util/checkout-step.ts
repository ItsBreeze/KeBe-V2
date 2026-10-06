import { HttpTypes } from "@medusajs/types"

// The checkout step a cart is at: the address and email first, then a
// shipping method, then payment. A cart read without its shipping_methods
// field is at delivery too: `length === 0` was false for it and sent it to
// payment. No directive, so the cart page and the server can both use it.
export function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (!cart.shipping_methods?.length) {
    return "delivery"
  } else {
    return "payment"
  }
}
