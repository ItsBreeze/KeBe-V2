import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import AddedToCart from "@modules/common/components/meta-pixel/added-to-cart"
import { PRESALE_HANDLE } from "@lib/util/presale"
import { HttpTypes } from "@medusajs/types"
import { Suspense } from "react"

const CartTemplate = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  // The pre-order's line: the Pre-order form lands here with ?added=1, and
  // this page counts its AddToCart.
  const presaleLine = cart?.items?.find(
    (i) => (i.product_handle ?? i.product?.handle) === PRESALE_HANDLE
  )

  return (
    <div className="py-12">
      {presaleLine?.product_id && (
        <Suspense fallback={null}>
          <AddedToCart
            lineId={presaleLine.id}
            productId={presaleLine.product_id}
            title={presaleLine.product_title ?? presaleLine.title}
            value={presaleLine.unit_price}
            currency={cart?.currency_code?.toUpperCase()}
          />
        </Suspense>
      )}
      <div className="content-container" data-testid="cart-container">
        {cart?.items?.length ? (
          <div className="grid grid-cols-1 small:grid-cols-[1fr_360px] gap-x-40">
            <div className="flex flex-col bg-ui-bg-base py-6 gap-y-6">
              {!customer && (
                <>
                  <SignInPrompt />
                  <Divider />
                </>
              )}
              <ItemsTemplate cart={cart} />
            </div>
            <div className="relative">
              <div className="flex flex-col gap-y-8 sticky top-12">
                {cart && cart.region && (
                  <>
                    <div className="bg-ui-bg-base py-6">
                      <Summary cart={cart as any} />
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
