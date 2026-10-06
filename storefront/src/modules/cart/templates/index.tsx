import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import { HttpTypes } from "@medusajs/types"

// No "Already have an account? Sign in" above the items (6 Oct 2026): nearly
// every buyer is a first-time guest, and checkout never asks for an account.
// The columns sit 40px apart below 1280px, where 160px pushed the summary
// past the edge of a 1024px screen.
const CartTemplate = ({
  cart,
  shipLine,
  shippingNote,
}: {
  cart: HttpTypes.StoreCart | null
  shipLine: string | null
  shippingNote?: string
}) => {
  return (
    <div className="py-12">
      <div className="content-container" data-testid="cart-container">
        {cart?.items?.length ? (
          <div className="grid grid-cols-1 small:grid-cols-[1fr_360px] gap-x-10 medium:gap-x-40">
            <div className="flex flex-col bg-ui-bg-base py-6 gap-y-6">
              <ItemsTemplate cart={cart} shipLine={shipLine} />
            </div>
            <div className="relative">
              <div className="flex flex-col gap-y-8 sticky top-12">
                {cart && cart.region && (
                  <>
                    <div className="bg-ui-bg-base py-6">
                      <Summary cart={cart as any} shippingNote={shippingNote} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <EmptyCartMessage />
          </div>
        )}
      </div>
    </div>
  )
}

export default CartTemplate
