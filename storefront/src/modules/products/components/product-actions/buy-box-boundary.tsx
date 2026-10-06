"use client"

import { trackPixelCustom } from "@lib/util/meta-pixel"
import { Button } from "@medusajs/ui"
import { unstable_rethrow } from "next/navigation"
import { Component, ReactNode, useEffect, useRef } from "react"
import {
  addErrorText,
  wasPreorderSent,
} from "@modules/products/components/product-actions"

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
//
// The boundary also catches a buy box that failed to render, with no tap:
// ProductActionsWrapper's product read failing while the backend is down.
// That one says the button didn't load and sends nothing, so a PreorderError
// always follows a PreorderTap. Whether a Pre-order was sent is read here,
// while rendering, before the buy box it came from unmounts and resets it.
export default class BuyBoxBoundary extends Component<
  BuyBoxBoundaryProps,
  { failed: boolean; sent: boolean }
> {
  state = { failed: false, sent: false }

  static getDerivedStateFromError(error: unknown) {
    unstable_rethrow(error)
    return { failed: true, sent: wasPreorderSent() }
  }

  render() {
    if (this.state.failed) {
      return (
        <BuyBoxFailed
          productId={this.props.productId}
          preorder={this.props.preorder}
          sent={this.state.sent}
        />
      )
    }

    return this.props.children
  }
}

function BuyBoxFailed({
  productId,
  preorder,
  sent,
}: {
  productId: string
  preorder: boolean
  sent: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  // The product only, as the inline error sends it: never the error itself.
  // A Pre-order tapped in the sticky bar left the button far above the
  // screen, and the bar goes with the buy box, so the visitor watched the bar
  // vanish and nothing else (6 Oct 2026). The message and Try again are
  // brought into view, clear of the 64 px sticky nav (scroll-mt-20).
  useEffect(() => {
    if (sent) {
      trackPixelCustom("PreorderError", { content_ids: [productId] })
      ref.current?.scrollIntoView({ block: "nearest" })
    }
  }, [sent, productId])

  // A fresh load of the page rather than a reset: a page loaded before a
  // deploy keeps failing until it has the new deploy's script. assign, not
  // reload, so the page is fetched again and never re-posted.
  const retry = () => window.location.assign(window.location.href)

  return (
    <div ref={ref} className="flex flex-col gap-y-4 scroll-mt-20">
      <p
        role="alert"
        className="text-base text-rose-400"
        data-testid="buy-box-error"
      >
        {addErrorText(
          sent
            ? "We couldn't start your pre-order."
            : `The ${preorder ? "Pre-order" : "Add to cart"} button didn't load.`
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
