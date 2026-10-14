import { placeOrder } from "@lib/data/cart"
import { unstable_rethrow } from "next/navigation"
import { NextRequest, NextResponse } from "next/server"

// Stripe sends the buyer here after a way to pay that leaves the site, such
// as Klarna or Afterpay; cards and wallets finish on the checkout page. The
// cart id comes in the URL, not the cookie, because the buyer can come back
// in another browser than Instagram's. placeOrder redirects to the order
// once it exists; completing an unpaid cart fails, so a forged link places
// nothing.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const cartId = q.get("cart_id")
  const paid = !!cartId && q.get("redirect_status") === "succeeded"

  // Only a two-letter code: the value goes into a redirect path.
  const cc = q.get("country_code") ?? ""
  const countryCode = /^[a-z]{2}$/.test(cc) ? cc : "ca"

  if (cartId && paid) {
    try {
      await placeOrder(cartId)
    } catch (e) {
      unstable_rethrow(e)
    }
  }

  // Not paid: back to Payment to try again. Paid but not placed: Payment
  // says not to pay twice, and the Stripe webhook still completes the cart.
  const step = new URL(`/${countryCode}/checkout`, req.url)
  step.searchParams.set("step", "payment")
  step.searchParams.set(paid ? "paid" : "payment_failed", "1")

  return NextResponse.redirect(step)
}
