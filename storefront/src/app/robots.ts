import { MetadataRoute } from "next"

import { storefrontCountries } from "@lib/data/seo"
import { absoluteUrl } from "@lib/util/seo"

// A visitor's own cart, checkout, account and orders: nothing in them for a
// search engine. Each is noindex in its own metadata as well.
const PRIVATE = ["/cart", "/checkout", "/account", "/order/"]

// The search, shopping and AI crawlers and tokens the research of 5 Oct 2026
// names, each welcome by name. AI search and training alike: the owner wants
// KeBe found wherever people ask (5 Oct 2026). Google-Extended and
// Applebot-Extended are tokens, not crawlers; naming them with Allow says
// outright that Gemini and Apple's models may use the pages.
const NAMED_CRAWLERS = [
  "Googlebot",
  "Storebot-Google",
  "Google-Extended",
  "Bingbot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  "PerplexityBot",
  "Perplexity-User",
  "Applebot",
  "Applebot-Extended",
  "CCBot",
]

// A crawler follows the one group that names it and ignores the "*" group,
// so the named group repeats the same rules: everything allowed except a
// visitor's own pages.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const countries = await storefrontCountries()
  // Without the regions, the same paths under any first segment.
  const prefixes = countries.length ? countries.map((cc) => `/${cc}`) : ["/*"]
  const disallow = prefixes.flatMap((prefix) =>
    PRIVATE.map((path) => `${prefix}${path}`)
  )

  return {
    rules: [
      { userAgent: NAMED_CRAWLERS, allow: "/", disallow },
      { userAgent: "*", allow: "/", disallow },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  }
}
