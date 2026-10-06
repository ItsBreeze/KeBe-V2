"use client"

import { CONTACT_EMAIL } from "@lib/constants"
import { Button, Heading, Text } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useRouter } from "next/navigation"
import { startTransition } from "react"

// What checkout shows when its page fails to render (6 Oct 2026), in place
// of Next's "Application error: a client-side exception has occurred". It
// never says that nothing was charged: the card can go through before the
// part that fails.
export default function CheckoutError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  // reset() alone renders the same failed page again. The refresh fetches it
  // from the server first.
  const reload = () => {
    startTransition(() => {
      router.refresh()
      reset()
    })
  }

  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)] content-container text-center">
      <Heading level="h1" className="text-2xl-semi text-ui-fg-base">
        Checkout hit a problem
      </Heading>
      <Text className="txt-medium text-ui-fg-subtle max-w-md">
        Reload the page to try again. If your bank or Stripe already confirmed a
        payment, do not pay again: email{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="underline underline-offset-4"
        >
          {CONTACT_EMAIL}
        </a>
        .
      </Text>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <Button size="large" onClick={reload} data-testid="checkout-reload">
          Reload
        </Button>
        <LocalizedClientLink
          href="/cart"
          className="txt-medium text-ui-fg-interactive hover:text-ui-fg-interactive-hover underline underline-offset-4"
          data-testid="checkout-error-back-to-cart"
        >
          Back to cart
        </LocalizedClientLink>
      </div>
    </div>
  )
}
