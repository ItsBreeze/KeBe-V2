"use client"

import { trackPixel } from "@lib/util/meta-pixel"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

// A PageView for each page reached by a link inside the store. The base code
// already counted the landing page, and a query change (?step= at checkout,
// ?v_id= on a product) is the same page.
export default function PixelPageViews() {
  const pathname = usePathname()
  const last = useRef(pathname)

  useEffect(() => {
    if (pathname === last.current) return
    last.current = pathname
    trackPixel("PageView")
  }, [pathname])

  return null
}
