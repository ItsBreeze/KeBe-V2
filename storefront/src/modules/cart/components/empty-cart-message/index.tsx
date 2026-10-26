import { Heading, Text } from "@medusajs/ui"

import { PRESALE_HANDLE } from "@lib/util/presale"
import InteractiveLink from "@modules/common/components/interactive-link"

// Most visitors come from an Instagram ad, in Instagram's own browser. A cart
// lives in that browser's cookies, so one opened elsewhere starts empty: the
// message says where the cart went, and the link goes back to the board on
// pre-order rather than the store's list (6 Oct 2026).
const EmptyCartMessage = () => {
  return (
    <div className="py-48 px-2 flex flex-col justify-center items-start" data-testid="empty-cart-message">
      <Heading
        level="h1"
        className="flex flex-row text-3xl-regular gap-x-2 items-baseline"
      >
        Cart
      </Heading>
      <Text className="text-base-regular mt-4 mb-6 max-w-[32rem]">
        Your cart is empty. If you started in Instagram&apos;s browser and
        opened this page somewhere else, your cart stayed there.
      </Text>
      <div>
        <InteractiveLink href={`/products/${PRESALE_HANDLE}`}>
          See KeBe v2
        </InteractiveLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage
