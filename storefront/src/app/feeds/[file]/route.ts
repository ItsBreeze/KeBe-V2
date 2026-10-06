import { HttpTypes } from "@medusajs/types"
import {
  listStoreProducts,
  storeUnavailable,
  storefrontCountries,
  storefrontCountryNames,
} from "@lib/data/seo"
import { presaleAvailability, presaleShipDate } from "@lib/util/presale"
import {
  BRAND,
  absoluteUrl,
  countryInSentence,
  listingImageUrls,
  plainText,
  productFeedTitle,
  productUrl,
  variantAvailability,
  variantColour,
  variantPrice,
  xmlText,
} from "@lib/util/seo"
import { productSpecs } from "@lib/util/specs"

// Product feeds for Google Merchant Center, and the Microsoft Merchant
// Center, Meta catalogue and Pinterest, which all read the same RSS 2.0 with
// Google's g: namespace: one per storefront country, at
// /feeds/google-<country>.xml (outside the middleware: see its matcher).
// Built from the live store on each request, from data at most an hour old
// (lib/data/seo.ts): the region's calculated price, a pre-order's ship
// date, never a stock count (owner, 1 Oct 2026). The attributes follow the
// fact-checked research of 5-6 Oct 2026; no g:shipping, since the store API
// gives shipping rates only for a cart, so Merchant Center's own shipping
// settings carry them.

// Google's product taxonomy by its ID (Google takes the ID or the path, not
// both, and the ID does not hang on the taxonomy's wording): 303 is
// Electronics > Electronics Accessories > Computer Components > Input
// Devices > Keyboards. Every KeBe product so far is a keyboard.
const GOOGLE_CATEGORY = "303"

// Every board leaves from the workshop in Canada: the product page says
// US orders go by Canada Post.
const SHIPS_FROM = "CA"

// The shop's own category path, most general first.
const productType = (product: HttpTypes.StoreProduct) => {
  const lowProfile = productSpecs(product).some(
    (s) => s.label === "Switches" && /low-profile/i.test(s.value)
  )
  return ["Keyboards", "Ortholinear", lowProfile ? "Low-profile" : null]
    .filter(Boolean)
    .join(" > ")
}

const tag = (name: string, value: string | null | undefined) =>
  value ? `      <${name}>${xmlText(value)}</${name}>` : null

// Google's feed wants the date with a time and offset; the ship date is a
// day. Midnight UTC, as it was, is the evening before across North America,
// a day earlier than the page's "October 31" (fact check, 6 Oct 2026). At
// noon UTC it is that same date on every clock from Newfoundland to Hawaii,
// wherever the store ships.
const availabilityDate = (iso: string) => `${iso}T12:00:00Z`

const item = (
  product: HttpTypes.StoreProduct,
  variant: HttpTypes.StoreProductVariant,
  countryCode: string
) => {
  const price = variantPrice(variant)
  // A variant with no price in this region cannot be listed.
  if (!price || !product.handle) return null

  const variants = product.variants ?? []
  const single = variants.length <= 1
  const availability = variantAvailability(product, variant)
  const presale = availability === "preorder" || availability === "backorder"
  const shipDate = presale ? presaleShipDate(product) : null
  // Merchant Center turns down a pre-order or backorder without its
  // availability_date. Once the counted boards are gone that date is
  // ships_by_next, and with it unset or mistyped in Admin the page names no
  // date either: the item stays out until the owner sets one, rather than go
  // in to be rejected (review, 6 Oct 2026).
  if (presale && !shipDate) return null
  // The CAD renders and photographs, never an AI scene. Google turns down
  // an item without an image, which is right for a product with no other.
  const [image, ...more] = listingImageUrls(product, variant)
  if (!image) return null

  return [
    "    <item>",
    // A one-variant product is its Medusa product id, the id the Meta pixel
    // already sends as content_ids, so a catalogue matches its events, and
    // the same in every country's feed (feed labels in Google, a country
    // feed in Meta). A variant of a product with several is its variant id,
    // grouped under the product's.
    tag("g:id", single ? product.id : variant.id),
    single ? null : tag("g:item_group_id", product.id),
    tag(
      "g:title",
      single || !variant.title
        ? productFeedTitle(product)
        : `${productFeedTitle(product)} (${variant.title})`
    ),
    tag("g:description", plainText(product.description) || product.title),
    tag("g:link", productUrl(countryCode, product.handle)),
    tag("g:image_link", image),
    // Google takes up to ten more.
    ...more.slice(0, 10).map((url) => tag("g:additional_image_link", url)),
    // The region's price, without tax or shipping, as Google wants it.
    tag("g:price", `${price.amount} ${price.currency}`),
    tag("g:availability", availability),
    shipDate ? tag("g:availability_date", availabilityDate(shipDate)) : null,
    tag("g:condition", "new"),
    tag("g:brand", BRAND),
    // Hand-assembled: no GTIN exists, and Google asks for no MPN rather than
    // a made-up one; the SKU is the shop's own.
    tag("g:identifier_exists", "no"),
    tag("g:google_product_category", GOOGLE_CATEGORY),
    tag("g:product_type", productType(product)),
    tag("g:color", variantColour(product, variant)),
    tag("g:ships_from_country", SHIPS_FROM),
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
  if (!countries.length) return storeUnavailable()
  if (!countries.includes(countryCode)) {
    return new Response("Not found", { status: 404 })
  }

  let products: HttpTypes.StoreProduct[]
  try {
    products = await listStoreProducts(countryCode)
  } catch {
    return storeUnavailable()
  }

  const names = await storefrontCountryNames()
  const where = names[countryCode] ?? countryCode.toUpperCase()
  // Only products that can be bought. A sold-out one (v1) can serve no
  // listing, and its variants' different prices on the one page would only
  // draw Merchant Center price-mismatch warnings.
  const items = products
    .filter((p) => presaleAvailability(p).open)
    .flatMap((p) => (p.variants ?? []).map((v) => item(p, v, countryCode)))
    .filter(Boolean)

  const body = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">`,
    "  <channel>",
    `    <title>${xmlText(`${BRAND} (${where})`)}</title>`,
    `    <link>${xmlText(absoluteUrl(`/${countryCode}`))}</link>`,
    `    <description>${xmlText(
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
