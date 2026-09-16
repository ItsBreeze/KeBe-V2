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
      <body className="bg-black font-body text-white antialiased">
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
