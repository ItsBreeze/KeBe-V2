import { HttpTypes } from "@medusajs/types"
import { getBaseURL } from "@lib/util/env"
import { presaleShipsBy, variantOpen } from "@lib/util/presale"

// Helpers for what the store tells machines: search engines, shopping feeds
// and AI answer engines. The rules the copy obeys hold here too (owner, 1 Oct
// 2026): never a count of boards, so no inventory figure leaves this file;
// a price is the region's calculated price, never the later one.

export const BRAND = "KeBe"
export const INSTAGRAM_URL = "https://www.instagram.com/kebe_keyboards/"

// Absolute, on the public base URL: crawlers and feeds resolve nothing.
export const absoluteUrl = (path: string) =>
  new URL(path, getBaseURL()).toString()

// The store's language is English everywhere; the country is the region.
export const localeFor = (countryCode: string) =>
  `en-${countryCode.toUpperCase()}`

// x-default is the store a visitor with no matching hreflang gets: the
// default region the middleware sends a bare "/" to (NEXT_PUBLIC_DEFAULT_REGION,
// "ca" in production, the shop's home market), with the middleware's own
// fallback. Not "/" itself, which is only a 307 to that store.
export const defaultCountry = (countries: string[]) => {
  const configured = (process.env.NEXT_PUBLIC_DEFAULT_REGION || "us").toLowerCase()
  return countries.includes(configured) ? configured : countries[0]
}

// The same page in every storefront country, keyed by hreflang.
export const languageAlternates = (countries: string[], path: string) => {
  const languages: Record<string, string> = {}
  for (const cc of countries) {
    languages[localeFor(cc)] = absoluteUrl(`/${cc}${path}`)
  }
  const fallback = defaultCountry(countries)
  if (fallback) {
    languages["x-default"] = absoluteUrl(`/${fallback}${path}`)
  }
  return languages
}

// Medusa's descriptions are plain text with blank lines between paragraphs;
// tags are stripped in case one ever arrives as HTML.
export const plainText = (text?: string | null) =>
  (text ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()

// Whole sentences up to max characters; a first sentence longer than that is
// cut at a word and marked with an ellipsis.
export const clipSentences = (text: string, max: number) => {
  const sentences = text
    .replace(/([.!?])\s+/g, "$1\n")
    .split("\n")
    .filter(Boolean)
  let out = ""
  for (const s of sentences) {
    const next = out ? `${out} ${s}` : s
    if (next.length > max) break
    out = next
  }
  if (out) return out
  const cut = text.slice(0, max - 1)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 0)) || cut}…`
}

// A product's name before the " — " in its title: "KeBe v2".
export const productName = (product: HttpTypes.StoreProduct) =>
  (product.title ?? "").split(" — ")[0]

export const productUrl = (countryCode: string, handle: string) =>
  absoluteUrl(`/${countryCode}/products/${handle}`)

// The product's pictures as absolute URLs, the thumbnail first if it is not
// among them, without repeats.
export const productImageUrls = (product: HttpTypes.StoreProduct) => {
  const urls = [
    ...(product.images ?? []).map((i) => i.url),
    product.thumbnail,
  ].filter((u): u is string => !!u)
  return Array.from(new Set(urls.map(absoluteUrl)))
}

// A variant's value for an option whose title is Colour or Color.
export const variantColour = (
  product: HttpTypes.StoreProduct,
  variant: HttpTypes.StoreProductVariant
) => {
  const option = product.options?.find((o) => /^colou?r$/i.test(o.title ?? ""))
  return (
    variant.options?.find((o) => o.option_id === option?.id)?.value ?? null
  )
}

export type Availability = "preorder" | "in_stock" | "out_of_stock"

// Whether a variant can be bought now, and how: a product on presale (a
// valid ships_by) takes pre-orders, anything else is in stock. Sold out is
// the Pre-order button's own rule (presale.ts variantOpen), never a number.
export const variantAvailability = (
  product: HttpTypes.StoreProduct,
  variant: HttpTypes.StoreProductVariant
): Availability => {
  if (!variantOpen(variant)) return "out_of_stock"
  return presaleShipsBy(product) ? "preorder" : "in_stock"
}

// The region's price for a variant: Medusa's calculated price (the pre-order
// sale price while one runs), in major units with the currency's own
// decimals. Null when the region has no price for it.
export const variantPrice = (variant: HttpTypes.StoreProductVariant) => {
  const price = variant.calculated_price
  const amount = price?.calculated_amount
  const currency = price?.currency_code?.toUpperCase()
  if (typeof amount !== "number" || !currency) return null
  const digits =
    new Intl.NumberFormat("en", { style: "currency", currency })
      .resolvedOptions().maximumFractionDigits ?? 2
  return { amount: amount.toFixed(digits), currency }
}
