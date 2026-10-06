import type { Metadata } from "next"
import { HttpTypes } from "@medusajs/types"
import { getBaseURL } from "@lib/util/env"
import { isAiGeneratedImage } from "@lib/util/image-alt"
import {
  PRESALE_HANDLE,
  presaleAvailability,
  presaleShipLine,
  presaleShipsBy,
  variantOpen,
} from "@lib/util/presale"

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

// What a search result, a link preview and a shopping feed call a product,
// beyond its Medusa title, keyed by handle like specs.ts. Each is the live
// product page's own facts (6 Oct 2026), the most-searched first:
// ortholinear, Dvorak, USB hub, low-profile Choc, hot-swap, assembled in
// Canada. Never "wired" (the product page does not say it), nothing
// wireless, and no price or date: those are read from Medusa per request.
type ListingCopy = {
  // The <title>, at most 60 characters, the brand in it.
  title: string
  // The snippet's opening, at most 123 characters so the price sentence fits.
  lead: string
  // The feeds' g:title, at most 150.
  feedTitle: string
}

const LISTING_COPY: Record<string, ListingCopy> = {
  [PRESALE_HANDLE]: {
    title: "KeBe v2: Low-Profile Ortholinear Keyboard with USB Hub",
    lead: "Matrix-Dvorak layout, Kailh Choc hot-swap switches, per-key RGB, QMK and a 3-port USB 2.0 hub, assembled by hand in Canada.",
    feedTitle:
      "KeBe v2 68-Key Ortholinear Keyboard with USB Hub, Matrix-Dvorak Layout, Kailh Choc Low-Profile Hot-Swap, Per-Key RGB",
  },
}

// Google cuts a description at about 155 characters.
export const DESCRIPTION_MAX = 155

// Sentences in order of worth, each kept only while the whole still fits:
// the lead, then the price, then the ship date.
export const fitSentences = (
  sentences: (string | null | undefined)[],
  max = DESCRIPTION_MAX
) =>
  sentences.reduce<string>((out, s) => {
    if (!s) return out
    const next = out ? `${out} ${s}` : s
    return next.length <= max ? next : out
  }, "")

// A price as copy writes it: "CA$349", "US$249", with cents only when there
// are some. A bare "$" gets its country, since both stores price in dollars
// and a search result can be read on either side of the border.
export const priceForCopy = (price: { amount: string; currency: string }) => {
  const value = Number(price.amount)
  const whole = Number.isInteger(value)
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: price.currency,
    ...(whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}),
  })
    .formatToParts(value)
    .map((part) =>
      part.type === "currency" && part.value === "$"
        ? `${price.currency.slice(0, 2)}$`
        : part.value
    )
    .join("")
}

// "Pre-order CA$349 plus shipping." while a presale runs, "CA$349 plus
// shipping." after it, "from" when variants differ. A price in copy always
// says "plus shipping" (owner, 1 Oct 2026), and it is the region's
// calculated price, never the later one. Null when nothing can be bought.
export const productOfferSentence = (product: HttpTypes.StoreProduct) => {
  const prices = (product.variants ?? [])
    .filter(variantOpen)
    .map(variantPrice)
    .filter((p): p is NonNullable<typeof p> => !!p)
  if (!prices.length) return null
  const lowest = prices.reduce((a, b) =>
    Number(b.amount) < Number(a.amount) ? b : a
  )
  const varies = new Set(prices.map((p) => p.amount)).size > 1
  const price = `${varies ? "from " : ""}${priceForCopy(lowest)}`
  return presaleShipsBy(product)
    ? `Pre-order ${price} plus shipping.`
    : `${price.charAt(0).toUpperCase()}${price.slice(1)} plus shipping.`
}

// When an order placed now ships, in the ship line's own words.
const shipSentence = (product: HttpTypes.StoreProduct) => {
  const line = presaleShipLine(product)
  return line ? `${line}.` : null
}

// A product page's <title>: its listing copy, else its Medusa title, which
// starts with the brand ("KeBe v1: 68-Key Ortholinear Keyboard"), else that
// title and the brand.
export const productSeoTitle = (product: HttpTypes.StoreProduct) => {
  const own = product.handle ? LISTING_COPY[product.handle]?.title : undefined
  if (own) return own
  const title = (product.title ?? BRAND).replace(" — ", ": ")
  return title.startsWith(BRAND) ? title : `${title} | ${BRAND}`
}

// The feeds' g:title.
export const productFeedTitle = (product: HttpTypes.StoreProduct) =>
  (product.handle && LISTING_COPY[product.handle]?.feedTitle) ||
  product.title ||
  BRAND

// A search result's snippet for a product: its listing copy's lead, else its
// subtitle or the opening sentences of its description; then, while they
// fit in 155 characters, the price this country pays and when an order
// placed now ships. Never a count.
export const productMetaDescription = (product: HttpTypes.StoreProduct) => {
  const lead =
    (product.handle && LISTING_COPY[product.handle]?.lead) ||
    clipSentences(
      plainText(product.subtitle) ||
        plainText(product.description) ||
        product.title ||
        BRAND,
      DESCRIPTION_MAX
    )
  return fitSentences([
    lead,
    productOfferSentence(product),
    shipSentence(product),
  ])
}

// The link preview a page shows unless it has its own: v2's CAD render cut
// to 1200 x 630. Until 6 Oct 2026 the Medusa starter's "Next.js Starter
// Template" card stood in for it on every page without one, and the home
// page's was an AI scene.
export const SOCIAL_IMAGE = {
  url: "/products/kebe-v2-social.jpg",
  width: 1200,
  height: 630,
  alt: "KeBe v2, rendered from its CAD: a 68-key ortholinear keyboard, black keycaps with white legends on a low black case.",
}

type SocialImage = {
  url: string
  width?: number
  height?: number
  alt?: string
}

// A page's Open Graph and X card tags: the same title and description as its
// <title> and meta description, so a shared link reads like the search
// result. Spelled out on every page, because a page's openGraph replaces
// the layout's whole.
export const socialMetadata = ({
  title,
  description,
  path,
  countryCode,
  images = [SOCIAL_IMAGE],
}: {
  title: string
  description: string
  path: string
  countryCode: string
  images?: SocialImage[]
}): Pick<Metadata, "openGraph" | "twitter"> => ({
  openGraph: {
    type: "website",
    siteName: BRAND,
    title,
    description,
    url: absoluteUrl(`/${countryCode}${path}`),
    locale: localeFor(countryCode).replace("-", "_"),
    images,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images,
  },
})

// Cart, checkout, account and order pages: a visitor's own, never a search
// result. robots.txt keeps crawlers out of them as well.
export const PRIVATE_PAGE_ROBOTS = { index: false, follow: false }

// A country's name as a sentence needs it: "the United States", "Canada".
export const countryInSentence = (name: string) =>
  /^(United|Netherlands|Philippines|Czech Republic)\b/.test(name)
    ? `the ${name}`
    : name

// "Canada and the United States"; "A, B and C".
export const listInSentence = (names: string[]) =>
  names.length > 1
    ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
    : names[0] ?? ""

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

// The pictures a shopping feed, the structured data and a link preview may
// show: a variant's own first, then the product's and its thumbnail, never
// an AI-generated scene (image-alt.ts). Empty when every one is a scene.
export const listingImageUrls = (
  product: HttpTypes.StoreProduct,
  variant?: HttpTypes.StoreProductVariant
) => {
  const images = [
    ...(variant?.images ?? []),
    ...(product.images ?? []),
    ...(product.thumbnail ? [{ url: product.thumbnail }] : []),
  ].filter((i) => !!i.url && !isAiGeneratedImage(i))
  return Array.from(new Set(images.map((i) => absoluteUrl(i.url!))))
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

export type Availability =
  | "preorder"
  | "backorder"
  | "in_stock"
  | "out_of_stock"

// Whether a variant can be bought now, and how. On presale (a valid
// ships_by) Google keeps "preorder" for a product not yet released and
// "backorder" for one taken now to ship later: so an order for one of the
// first, counted boards is a pre-order, and once they are gone the board,
// which stays on sale with backorders on, is a backorder that ships by
// ships_by_next. It is the switch the page's ship line makes, from
// "Currently shipping" to "Ships". Without a presale it is in stock. Sold
// out is the Pre-order button's own rule (presale.ts variantOpen), never a
// number.
export const variantAvailability = (
  product: HttpTypes.StoreProduct,
  variant: HttpTypes.StoreProductVariant
): Availability => {
  if (!variantOpen(variant)) return "out_of_stock"
  if (!presaleShipsBy(product)) return "in_stock"
  return presaleAvailability(product).fromStock ? "preorder" : "backorder"
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
