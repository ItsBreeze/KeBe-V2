import "server-only"

import { Metadata } from "next"
import { HttpTypes } from "@medusajs/types"
import { listProducts } from "@lib/data/products"
import { listRegions } from "@lib/data/regions"
import { absoluteUrl, languageAlternates } from "@lib/util/seo"

// What search engines, feeds and AI crawlers read is at most an hour old; the
// backend's revalidate call (api/revalidate) refreshes it sooner, along with
// every page. Without it the store's cached answers expire on that call
// alone: a local build's .next/cache still answered with the regions of 30
// Sept, before the US one (5 Oct 2026).
const SEO_REVALIDATE = 3600

// Every country in a Medusa region is a storefront: the middleware sends
// /<iso_2>/... to that region. Sorted, so the sitemap and the hreflang links
// come out in the same order every time. Empty when the backend cannot be
// read; callers treat that as "unknown", never as "no such country".
export const storefrontCountries = async (): Promise<string[]> => {
  try {
    const regions = await listRegions({ revalidate: SEO_REVALIDATE })
    const codes = (regions ?? []).flatMap(
      (r) => r.countries?.map((c) => c.iso_2?.toLowerCase() ?? "") ?? []
    )
    return Array.from(new Set(codes.filter(Boolean))).sort()
  } catch {
    return []
  }
}

// The countries a storefront ships to, by name, from the regions themselves
// ("Canada", "United States").
export const storefrontCountryNames = async (): Promise<
  Record<string, string>
> => {
  try {
    const regions = await listRegions({ revalidate: SEO_REVALIDATE })
    const names: Record<string, string> = {}
    for (const r of regions ?? []) {
      for (const c of r.countries ?? []) {
        if (c.iso_2) {
          names[c.iso_2.toLowerCase()] =
            c.display_name ?? c.name ?? c.iso_2.toUpperCase()
        }
      }
    }
    return names
  } catch {
    return {}
  }
}

// A page's self-canonical in this country and the same page in every other
// one. Without the regions it keeps the canonical and drops the languages
// rather than guess them.
export const pageAlternates = async (
  countryCode: string,
  path = ""
): Promise<NonNullable<Metadata["alternates"]>> => {
  const countries = await storefrontCountries()
  return {
    canonical: absoluteUrl(`/${countryCode}${path}`),
    languages: languageAlternates(countries, path),
  }
}

// Every published product, priced in this country's region. Medusa's store
// API pages at 100; the shop has a handful.
export const listStoreProducts = async (
  countryCode: string
): Promise<HttpTypes.StoreProduct[]> => {
  const { response } = await listProducts({
    countryCode,
    queryParams: { limit: 100 },
    revalidate: SEO_REVALIDATE,
  })
  return response.products
}

// Every storefront country with its products, or null when the store cannot
// be read: no regions, or a country whose products would not load. The
// sitemap and llms.txt then answer storeUnavailable() rather than a list
// with the products missing, which a crawler would keep until it next came
// (review, 6 Oct 2026).
export const listStorefront = async (): Promise<
  { cc: string; products: HttpTypes.StoreProduct[] }[] | null
> => {
  const countries = await storefrontCountries()
  if (!countries.length) return null
  try {
    return await Promise.all(
      countries.map(async (cc) => ({
        cc,
        products: await listStoreProducts(cc),
      }))
    )
  } catch {
    return null
  }
}

// What a machine route answers when the store cannot be read: a crawler or
// feed reader retries a 503 after Retry-After, where it would drop the
// products on a 404 or take an empty 200 for a store with none.
export const storeUnavailable = () =>
  new Response("Store unavailable", {
    status: 503,
    headers: { "Retry-After": "600" },
  })
