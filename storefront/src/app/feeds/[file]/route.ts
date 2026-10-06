import { HttpTypes } from "@medusajs/types"
import {
  listStoreProducts,
  storefrontCountries,
  storefrontCountryNames,
} from "@lib/data/seo"
import { presaleShipDate } from "@lib/util/presale"
import {
  BRAND,
  absoluteUrl,
  countryInSentence,
  plainText,
  productImageUrls,
  productUrl,
  variantAvailability,
  variantColour,
  variantPrice,
} from "@lib/util/seo"

// Product feeds for Google Merchant Center, and the Microsoft Merchant
// Center, Meta catalogue and Pinterest, which all read the same RSS 2.0 with
// Google's g: namespace: one per storefront country, at
// /feeds/google-<country>.xml (the ".xml" lets the middleware pass it).
// Built from the live store on each request, from data at most an hour old
// (lib/data/seo.ts): the region's calculated price, a pre-order's ship
// date, never a stock count (owner, 1 Oct 2026).

// Google's product taxonomy, by name, which every one of those readers
// accepts. Every KeBe product so far is a keyboard.
const GOOGLE_CATEGORY =
  "Electronics > Electronics Accessories > Computer Components > Input Devices > Keyboards"
const PRODUCT_TYPE = "Keyboards > Ortholinear keyboards"

// Text for an XML element: the five entities escaped, and the characters
// XML 1.0 does not allow at all dropped.
const xml = (value: string) =>
  value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")

const tag = (name: string, value: string | null | undefined) =>
  value ? `      <${name}>${xml(value)}</${name}>` : null

// Google's feed wants the date with a time and offset; the ship date is a
// day, so it starts at midnight UTC.
const availabilityDate = (iso: string) => `${iso}T00:00+0000`

const item = (
  product: HttpTypes.StoreProduct,
  variant: HttpTypes.StoreProductVariant,
  countryCode: string
) => {
  const price = variantPrice(variant)
  // A variant with no price in this region cannot be listed.
  if (!price || !product.handle) return null

  const variants = product.variants ?? []
  const availability = variantAvailability(product, variant)
  const shipDate =
    availability === "preorder" ? presaleShipDate(product) : null
  const [image, ...more] = [
    ...(variant.images ?? []).map((i) => i.url).filter((u): u is string => !!u).map(absoluteUrl),
    ...productImageUrls(product),
  ].filter((url, i, all) => all.indexOf(url) === i)

  return [
    "    <item>",
    // Stable per variant and country: the SKU, else Medusa's variant id.
    tag("g:id", `${variant.sku || variant.id}-${countryCode.toUpperCase()}`),
    tag(
      "g:title",
      variants.length > 1 && variant.title
        ? `${product.title} (${variant.title})`
        : product.title
    ),
    tag("g:description", plainText(product.description) || product.title),
    tag("g:link", productUrl(countryCode, product.handle)),
    tag("g:image_link", image),
    // Google takes up to ten more.
    ...more.slice(0, 10).map((url) => tag("g:additional_image_link", url)),
    tag("g:price", `${price.amount} ${price.currency}`),
    tag("g:availability", availability),
    shipDate ? tag("g:availability_date", availabilityDate(shipDate)) : null,
    tag("g:condition", "new"),
    tag("g:brand", BRAND),
    tag("g:mpn", variant.sku),
    // Hand-built: no GTIN exists for it.
    tag("g:identifier_exists", "no"),
    tag("g:google_product_category", GOOGLE_CATEGORY),
    tag("g:product_type", PRODUCT_TYPE),
    tag("g:color", variantColour(product, variant)),
    variants.length > 1 ? tag("g:item_group_id", product.handle) : null,
    "    </item>",
  ]
    .filter(Boolean)
    .join("\n")
}

export async function GET(
  _request: Request,
  props: { params: Promise<{ file: string }> }
) {
  const { file } = await props.params
  const countryCode = /^google-([a-z]{2})\.xml$/.exec(file)?.[1]
  if (!countryCode) {
    return new Response("Not found", { status: 404 })
  }

  const countries = await storefrontCountries()
  // Without the regions there is no telling a real country from a typo: a
  // feed reader retries a 503, and drops products on a 404.
  if (!countries.length) {
    return new Response("Store unavailable", {
      status: 503,
      headers: { "Retry-After": "600" },
    })
  }
  if (!countries.includes(countryCode)) {
    return new Response("Not found", { status: 404 })
  }

  let products: HttpTypes.StoreProduct[]
  try {
    products = await listStoreProducts(countryCode)
  } catch {
    return new Response("Store unavailable", {
      status: 503,
      headers: { "Retry-After": "600" },
    })
  }

  const names = await storefrontCountryNames()
  const where = names[countryCode] ?? countryCode.toUpperCase()
  const items = products
    .flatMap((p) => (p.variants ?? []).map((v) => item(p, v, countryCode)))
    .filter(Boolean)

  const body = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">`,
    "  <channel>",
    `    <title>${xml(`${BRAND} (${where})`)}</title>`,
    `    <link>${xml(absoluteUrl(`/${countryCode}`))}</link>`,
    `    <description>${xml(
      `${BRAND} keyboards, priced for ${countryInSentence(where)}.`
    )}</description>`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n")

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  })
}
