"use client"

import { trackPixel } from "@lib/util/meta-pixel"
import { useEffect } from "react"

// Tracks one pixel event when a server-rendered page shows. With `once`, the
// event is sent once per browser under that key: reloading an order's
// confirmation page must not count a second purchase.
export default function PixelEvent({
  event,
  params,
  eventID,
  once,
}: {
  event: string
  params?: Record<string, unknown>
  eventID?: string
  once?: string
}) {
  useEffect(() => {
    if (once) {
      try {
        if (localStorage.getItem(once)) return
        localStorage.setItem(once, "1")
      } catch {
        // Storage blocked: send it anyway, a duplicate beats a lost purchase.
      }
    }
    trackPixel(event, params, eventID)
    // Once per mount, with the values the page rendered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
