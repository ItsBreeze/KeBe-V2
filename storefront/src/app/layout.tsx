import { getBaseURL } from "@lib/util/env"
import {
  MetaPixelNoscript,
  MetaPixelScript,
  PIXEL_ON,
} from "@modules/common/components/meta-pixel"
import PixelPageViews from "@modules/common/components/meta-pixel/page-views"
import { BRAND, SOCIAL_IMAGE } from "@lib/util/seo"
import { Metadata } from "next"
import { DM_Serif_Display, IBM_Plex_Mono, Inter } from "next/font/google"
import "styles/globals.css"

// The suite's faces (Grounders, ItsRadio and Offhand bundle the same files),
// self-hosted at build time.
const display = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
})

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: "600",
  variable: "--font-mono",
  display: "swap",
})

// Google Search Console and Bing Webmaster Tools check a site is the owner's
// by a meta tag on its pages. Each token is a server-only variable,
// GOOGLE_SITE_VERIFICATION and BING_SITE_VERIFICATION (.env.template), read
// when the server builds and starts, so a new one takes a redeploy; while
// one is unset its tag is left out, and with neither there is no tag at all
// (6 Oct 2026).
const siteVerification = (): Metadata["verification"] => {
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim()
  const bing = process.env.BING_SITE_VERIFICATION?.trim()
  if (!google && !bing) return undefined
  return {
    ...(google ? { google } : {}),
    ...(bing ? { other: { "msvalidate.01": bing } } : {}),
  }
}

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  verification: siteVerification(),
  // Every page's title ends with the brand; the home page sets its own whole.
  title: {
    default: "KeBe",
    template: "%s | KeBe",
  },
  // The link preview of any page without its own: v2's CAD render. Until 6
  // Oct 2026 the Medusa starter's opengraph-image.jpg and twitter-image.jpg,
  // a "Next.js Starter Template" card, stood in on every such page.
  openGraph: { type: "website", siteName: BRAND, images: [SOCIAL_IMAGE] },
  twitter: { card: "summary_large_image", images: [SOCIAL_IMAGE] },
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    // One dark theme for the whole store, the suite's night register: the
    // `dark` class switches Medusa UI to its dark tokens, which
    // styles/globals.css sets to the suite's neutrals.
    <html
      lang="en"
      data-mode="dark"
      className={`dark ${display.variable} ${body.variable} ${mono.variable}`}
      style={{ colorScheme: "dark" }}
    >
      <head>
        {/* Dark Reader repaints any page it doesn't take for dark; here it
            turned the white Pre-order button into a dark box on a dark card.
            The lock tells it the site handles its own colours. */}
        <meta name="darkreader-lock" />
        {PIXEL_ON && <MetaPixelScript />}
      </head>
      <body className="bg-ui-bg-base text-ui-fg-base font-body antialiased">
        {PIXEL_ON && <MetaPixelNoscript />}
        {PIXEL_ON && <PixelPageViews />}
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
