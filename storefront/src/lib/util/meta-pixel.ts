// Meta Pixel (owner, 5 Oct 2026): measures which Meta ads lead to visits,
// pre-orders and waitlist sign-ups. The pixel is the one in the owner's Events
// Manager; the base code is in modules/common/components/meta-pixel and loads
// only in production builds. The privacy page describes what it sends.
export const META_PIXEL_ID = "1559052519240425"

type Fbq = (...args: unknown[]) => void

// Sends a standard event if the pixel is on the page; a no-op otherwise (dev
// builds, or a blocker removed it). Amounts are Medusa's, already in dollars.
export function trackPixel(
  event: string,
  params?: Record<string, unknown>,
  eventID?: string
) {
  if (typeof window === "undefined") return
  const fbq = (window as unknown as { fbq?: Fbq }).fbq
  if (!fbq) return
  if (eventID) fbq("track", event, params ?? {}, { eventID })
  else fbq("track", event, params ?? {})
}
