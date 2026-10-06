"use client"

import { trackPixelCustom } from "@lib/util/meta-pixel"
import { Button } from "@medusajs/ui"
import { unstable_rethrow } from "next/navigation"
import { Component, ReactNode, useEffect } from "react"
import { addErrorText } from "@modules/products/components/product-actions"

type BuyBoxBoundaryProps = {
  productId: string
  // Whether the buy box is the presale's Pre-order form.
  preorder: boolean
  children: ReactNode
}

// The buy box when its request itself fails (6 Oct 2026). Pre-order is
// useActionState's form action, and when the post never reaches
// preorderNow (no signal in Instagram's browser, a 502 while Railway
// restarts the server, or a page loaded before a deploy whose action the
// server no longer has), React throws that failure while rendering, since
// there is no { error } to return. With nothing to catch it, the visitor got
// Next's full-screen "Application error". This keeps the rest of the page,
// says what the inline error says, and counts the PreorderError the inline
// error would. A redirect is not a failure: unstable_rethrow hands it on to
// Next.
export default class BuyBoxBoundary extends Component<
  BuyBoxBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError(error: unknown) {
    unstable_rethrow(error)
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <BuyBoxFailed
          productId={this.props.productId}
          preorder={this.props.preorder}
        />
      )
    }

    return this.props.children
  }
}

function BuyBoxFailed({
  productId,
  preorder,
}: {
  productId: string
  preorder: boolean
}) {
  // The product only, as the inline error sends it: never the error itself.
  useEffect(() => {
    if (preorder) {
      trackPixelCustom("PreorderError", { content_ids: [productId] })
    }
  }, [preorder, productId])

  // A fresh load of the page rather than a reset: a page loaded before a
  // deploy keeps failing until it has the new deploy's script. assign, not
  // reload, so the page is fetched again and never re-posted.
  const retry = () => window.location.assign(window.location.href)

  return (
    <div className="flex flex-col gap-y-4">
      <p
        role="alert"
        className="text-base text-rose-400"
        data-testid="buy-box-error"
      >
        {addErrorText(
          preorder
            ? "We couldn't start your pre-order."
            : "We couldn't add it to your cart."
        )}
      </p>
      <Button
        variant="primary"
        className="w-full h-12 text-base"
        onClick={retry}
        data-testid="buy-box-retry"
      >
        Try again
      </Button>
    </div>
  )
}
