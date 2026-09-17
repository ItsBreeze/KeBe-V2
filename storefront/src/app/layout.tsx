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
    <html
      lang="en"
      data-mode="light"
      className={`${display.variable} ${body.variable}`}
    >
      {/* No global colour here. The homepage sets its own dark palette per
          section; the product, cart and account pages are the starter's light
          theme and go unreadable if white text is forced on them. */}
      {/* Explicit white: the starter left body transparent and relied on the
          browser's default, which goes black in a dark-mode browser and hides
          the near-black product text. The homepage sets its own dark
          backgrounds per section, so this never shows through there. */}
      <body className="bg-white font-body antialiased">
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
