"use client"

import { trackPixel } from "@lib/util/meta-pixel"
import { useSearchParams } from "next/navigation"
import { useEffect } from "react"

// The AddToCart for a pre-order. Pre-order is a form the server answers by
// sending the visitor to checkout with ?added=1, so the event is counted on
// the page the tap lands on. It is sent once per cart line, under the line's
// id: a reload, or a second tap that only set the same line back to one
// board, is not a second add. Then ?added leaves the address, so a shared or
// reloaded link does not carry it.
export default function AddedToCart({
  lineId,
  productId,
  title,
  value,
  currency,
}: {
  lineId: string
  productId: string
  title?: string
  value?: number
  currency?: string
}) {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get("added") !== "1") return

    // In-app browsers can throw on storage: then it is sent, as a duplicate
    // beats a lost add.
    const key = `kebe_add_${lineId}`
    let sent = false
    try {
      sent = !!localStorage.getItem(key)
    } catch {}

    if (!sent) {
      trackPixel(
        "AddToCart",
        {
          content_ids: [productId],
          content_type: "product",
          content_name: title,
          value,
          currency,
        },
        `add-${lineId}`
      )
      try {
        localStorage.setItem(key, "1")
      } catch {}
    }

    const params = new URLSearchParams(window.location.search)
    params.delete("added")
    const query = params.toString()
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (query ? `?${query}` : "") + window.location.hash
    )
    // Once per landing, with the values the page rendered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return null
}
