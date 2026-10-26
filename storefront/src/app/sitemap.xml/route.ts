import { listStorefront, storeUnavailable } from "@lib/data/seo"
import {
  absoluteUrl,
  languageAlternates,
  listingImageUrls,
  xmlText,
} from "@lib/util/seo"

// /sitemap.xml. A route handler, not Next's sitemap.ts, which can only answer
// 200: without the store it served an empty urlset, which a crawler takes
// for a site with no pages. This one answers 503 then, as the feeds do
// (review, 6 Oct 2026). The XML is the one sitemap.ts made.

// The pages anyone can land on, in every storefront country. Cart, checkout,
// account and order pages are left out (robots.ts disallows them).
const PAGES = ["", "/store", "/train", "/privacy", "/terms", "/contact"]

type ProductEntry = {
  countries: string[]
  lastModified?: string
  images: string[]
}

type SitemapUrl = {
  url: string
  lastModified?: string
  languages: Record<string, string>
  images?: string[]
}

const urlXml = ({ url, lastModified, languages, images = [] }: SitemapUrl) =>
  [
    "<url>",
    `<loc>${xmlText(url)}</loc>`,
    ...Object.entries(languages).map(
      ([lang, href]) =>
        `<xhtml:link rel="alternate" hreflang="${xmlText(
          lang
        )}" href="${xmlText(href)}" />`
    ),
    ...images.map(
      (src) =>
        `<image:image>\n<image:loc>${xmlText(src)}</image:loc>\n</image:image>`
    ),
    lastModified ? `<lastmod>${xmlText(lastModified)}</lastmod>` : null,
    "</url>",
  ]
    .filter(Boolean)
    .join("\n")

// Built on each request from data at most an hour old (lib/data/seo.ts).
export async function GET() {
  const listed = await listStorefront()
  if (!listed) return storeUnavailable()
  const countries = listed.map(({ cc }) => cc)

  // A product is listed in each country whose store returns it.
  const products: Record<string, ProductEntry> = {}
  let latest: string | undefined
  for (const { cc, products: list } of listed) {
    for (const p of list) {
      if (!p.handle) continue
      const updated = p.updated_at ? String(p.updated_at) : undefined
      const entry = (products[p.handle] ??= {
        countries: [],
        lastModified: updated,
        images: listingImageUrls(p),
      })
      entry.countries.push(cc)
      if (updated && (!latest || updated > latest)) latest = updated
    }
  }

  const pages: SitemapUrl[] = countries.flatMap((cc) =>
    PAGES.map((path) => ({
      url: absoluteUrl(`/${cc}${path}`),
      // The home page and the store show the products, so they change when
      // one does; the trainer, the privacy notice, the pre-order terms and
      // the contact page carry no date here.
      lastModified: path === "" || path === "/store" ? latest : undefined,
      languages: languageAlternates(countries, path),
    }))
  )

  const productPages: SitemapUrl[] = countries.flatMap((cc) =>
    Object.keys(products)
      .filter((handle) => products[handle].countries.includes(cc))
      .map((handle) => {
        const entry = products[handle]
        const path = `/products/${handle}`
        return {
          url: absoluteUrl(`/${cc}${path}`),
          lastModified: entry.lastModified,
          languages: languageAlternates(entry.countries, path),
          images: entry.images,
        }
      })
  )

  const body = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
    ...[...pages, ...productPages].map(urlXml),
    "</urlset>",
    "",
  ].join("\n")

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml",
      // What Next's sitemap.ts sent: a crawler asks again each time.
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  })
}
