import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { Cormorant_Garamond, EB_Garamond } from "next/font/google"
import "styles/globals.css"

// The original site used Adobe Fonts (orpheus-pro / adobe-garamond-pro), which
// cannot be self-hosted without a Creative Cloud web project. These are the
// closest Google equivalents and self-host at build time.
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-display",
  display: "swap",
})

const body = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    // One dark theme for the whole store, in the homepage's palette: the
    // `dark` class switches Medusa UI to its dark tokens, which
    // styles/globals.css sets to KeBe's ink and bone. The starter's light
    // product, cart and account pages sat oddly under the dark homepage.
    <html
      lang="en"
      data-mode="dark"
      className={`dark ${display.variable} ${body.variable}`}
      style={{ colorScheme: "dark" }}
    >
      <head>
        {/* Dark Reader repaints any page it doesn't take for dark; here it
            turned the white Pre-order button into a dark box on a dark card.
            The lock tells it the site handles its own colours. */}
        <meta name="darkreader-lock" />
      </head>
      <body className="bg-ui-bg-base text-ui-fg-base font-body antialiased">
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
