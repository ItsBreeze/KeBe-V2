import { MetadataRoute } from "next"

import { listStoreProducts, storefrontCountries } from "@lib/data/seo"
import {
  absoluteUrl,
  languageAlternates,
  productImageUrls,
} from "@lib/util/seo"

// The pages anyone can land on, in every storefront country. Cart, checkout,
// account and order pages are left out (robots.ts disallows them).
const PAGES = ["", "/store", "/train", "/privacy"]

type ProductEntry = {
  countries: string[]
  lastModified?: string
  images: string[]
}

// Built on each request from data at most an hour old (lib/data/seo.ts).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const countries = await storefrontCountries()
  const listed = await Promise.all(
    countries.map(async (cc) => ({
      cc,
      products: await listStoreProducts(cc).catch(() => []),
    }))
  )

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
        images: productImageUrls(p),
      })
      entry.countries.push(cc)
      if (updated && (!latest || updated > latest)) latest = updated
    }
  }

  const pages = countries.flatMap((cc) =>
    PAGES.map((path) => ({
      url: absoluteUrl(`/${cc}${path}`),
      // The home page and the store show the products, so they change when
      // one does; the trainer and the privacy notice carry no date here.
      lastModified: path === "" || path === "/store" ? latest : undefined,
      alternates: { languages: languageAlternates(countries, path) },
    }))
  )

  const productPages = countries.flatMap((cc) =>
    Object.keys(products)
      .filter((handle) => products[handle].countries.includes(cc))
      .map((handle) => {
        const entry = products[handle]
        const path = `/products/${handle}`
        return {
          url: absoluteUrl(`/${cc}${path}`),
          lastModified: entry.lastModified,
          alternates: {
            languages: languageAlternates(entry.countries, path),
          },
          images: entry.images,
        }
      })
  )

  return [...pages, ...productPages]
}
