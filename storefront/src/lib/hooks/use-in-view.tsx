import { RefObject, useEffect, useState } from "react"

// Whether the element is on screen. With `full`, only when all of it is (98%,
// which allows for sub-pixel rounding): any pixel counted as seen, so a
// button with a sliver showing at the bottom of a phone was "visible".
// `initial` is the value before the observer first reports, which is also
// what the server's HTML renders.
export const useIntersection = (
  element: RefObject<HTMLDivElement | null>,
  rootMargin: string,
  options?: { full?: boolean; initial?: boolean }
) => {
  // Read as primitives so the effect depends on values, not on the options
  // object: one written inline is new on every render and would rebuild the
  // observer each time.
  const full = !!options?.full
  const initial = !!options?.initial
  const [isVisible, setState] = useState(initial)

  useEffect(() => {
    if (!element.current) {
      return
    }

    const el = element.current

    const observer = new IntersectionObserver(
      ([entry]) => {
        setState(full ? entry.intersectionRatio >= 0.98 : entry.isIntersecting)
      },
      { rootMargin, threshold: full ? [0, 0.98] : 0 }
    )

    observer.observe(el)

    return () => observer.unobserve(el)
  }, [element, rootMargin, full])

  return isVisible
}
