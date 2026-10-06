import { getBaseURL } from "@lib/util/env"
import {
  MetaPixelNoscript,
  MetaPixelScript,
  PIXEL_ON,
} from "@modules/common/components/meta-pixel"
import PixelPageViews from "@modules/common/components/meta-pixel/page-views"
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

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  // Every page's title ends with the brand; the home page sets its own whole.
  title: {
    default: "KeBe",
    template: "%s | KeBe",
  },
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
