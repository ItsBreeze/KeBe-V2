import { MetadataRoute } from "next"

import { storefrontCountries } from "@lib/data/seo"
import { absoluteUrl } from "@lib/util/seo"

// A visitor's own cart, checkout, account and orders: nothing in them for a
// search engine. Each is noindex in its own metadata as well.
const PRIVATE = ["/cart", "/checkout", "/account", "/order/"]

// Every crawler is welcome everywhere else, AI search and training crawlers
// included: the owner wants KeBe found wherever people ask (5 Oct 2026). So
// no bot gets a group of its own; one named there would follow only that
// group and skip the disallows below.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const countries = await storefrontCountries()
  // Without the regions, the same paths under any first segment.
  const prefixes = countries.length ? countries.map((cc) => `/${cc}`) : ["/*"]

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: prefixes.flatMap((prefix) =>
          PRIVATE.map((path) => `${prefix}${path}`)
        ),
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  }
}
