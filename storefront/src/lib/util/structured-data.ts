import { HttpTypes } from "@medusajs/types"
import { CONTACT_EMAIL } from "@lib/constants"
import { isAiGeneratedImage } from "@lib/util/image-alt"
import { presaleShipDate } from "@lib/util/presale"
import {
  Availability,
  BRAND,
  INSTAGRAM_URL,
  absoluteUrl,
  listingImageUrls,
  plainText,
  productImageUrls,
  productUrl,
  variantAvailability,
  variantColour,
  variantPrice,
} from "@lib/util/seo"
import { productSpecs } from "@lib/util/specs"

// schema.org entities for the pages' JSON-LD. Only what the pages themselves
// state (owner, 5 Oct 2026): no rating or review, no stock level, and the
// price is the region's calculated price, never the one after pre-orders
// close. No gtin or mpn either: a hand-assembled board has neither, and
// Google asks not to make one up (the feeds say identifier_exists no); the
// SKU is the shop's own. The return policy is the pre-order terms' since
// they were published (6 Oct 2026). Still no shippingDetails: the store API
// gives shipping rates only for a cart, and the pages name no amount.

const SCHEMA_AVAILABILITY: Record<Availability, string> = {
  preorder: "https://schema.org/PreOrder",
  backorder: "https://schema.org/BackOrder",
  in_stock: "https://schema.org/InStock",
  out_of_stock: "https://schema.org/OutOfStock",
}

const organizationId = () => absoluteUrl("/#organization")

// The seller, as each offer names it: the store the home page describes,
// by its @id, with its name for readers that do not follow the reference.
const seller = () => ({
  "@type": "OnlineStore",
  "@id": organizationId(),
  name: BRAND,
})

// The return policy, from the Returns section of the pre-order terms
// (app/[countryCode]/(main)/terms, 6 Oct 2026) and nothing else: "Return the
// board within 30 days of delivery, in its original condition, for a refund;
// buyer pays return shipping." So a 30-day window counted from delivery
// (merchantReturnDays is "from the delivery date" in Google's docs), sent
// back by mail, the buyer paying its shipping: Google's
// ReturnFeesCustomerResponsibility, which takes no amount. Left out because
// the terms do not settle them: itemCondition ("its original condition"
// reads as schema.org's New, or as Used for a board typed on), refundType
// ("a refund", where cancelling says "a full refund"), how soon a return is
// refunded (the "5 business days" is cancelling's), returnPolicyCountry (the
// return address is sent by email, not published), returnLabelSource and any
// restocking fee. One policy per storefront country, each linking that
// country's terms page; the @id lets an offer name the same policy the store
// does.
export const returnPolicyJsonLd = (countryCode: string) => {
  const terms = absoluteUrl(`/${countryCode}/terms`)
  return {
    "@type": "MerchantReturnPolicy",
    "@id": `${terms}#returns`,
    applicableCountry: countryCode.toUpperCase(),
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 30,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
    merchantReturnLink: terms,
  }
}

// OnlineStore: the Organization subtype Google's organization docs ask an
// online shop to use. Its return policy covers every storefront country;
// without the regions it is left out rather than guessed.
export const organizationJsonLd = (countries: string[]) => ({
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  "@id": organizationId(),
  name: BRAND,
  url: absoluteUrl("/"),
  // The site's own icon, 180 px square: Google wants at least 112.
  logo: absoluteUrl("/apple-icon.png"),
  // The privacy notice's own words.
  description: "A one-person keyboard workshop in Canada.",
  email: CONTACT_EMAIL,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: CONTACT_EMAIL,
  },
  sameAs: [INSTAGRAM_URL],
  ...(countries.length
    ? { hasMerchantReturnPolicy: countries.map((cc) => returnPolicyJsonLd(cc)) }
    : {}),
})

export const websiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": absoluteUrl("/#website"),
  name: BRAND,
  url: absoluteUrl("/"),
  inLanguage: "en",
  publisher: { "@id": organizationId() },
})

// One variant's offer in this country. A pre-order or backorder says when an
// order placed now ships (availabilityStarts), the date the page's ship line
// gives; no variant without a price in the region gets an offer. The return
// policy repeats the store's for this country, in full: the home page that
// carries the store's markup may not be read with the product page, and
// Google takes an offer's own policy first.
const offerFor = (
  product: HttpTypes.StoreProduct,
  variant: HttpTypes.StoreProductVariant,
  url: string,
  countryCode: string
) => {
  const price = variantPrice(variant)
  if (!price) return null
  const availability = variantAvailability(product, variant)
  const startsAt =
    availability === "preorder" || availability === "backorder"
      ? presaleShipDate(product)
      : null
  return {
    "@type": "Offer",
    url,
    ...(variant.sku ? { sku: variant.sku } : {}),
    price: price.amount,
    priceCurrency: price.currency,
    availability: SCHEMA_AVAILABILITY[availability],
    ...(startsAt ? { availabilityStarts: startsAt } : {}),
    itemCondition: "https://schema.org/NewCondition",
    seller: seller(),
    hasMerchantReturnPolicy: returnPolicyJsonLd(countryCode),
  }
}

// A product page's entity: a Product for a product with one variant (KeBe
// v2), a ProductGroup of variant Products for one with several (v1's colours
// and keycaps). The specification is the list the page shows. Its pictures
// leave out the AI scenes, as the feeds do, unless there is nothing else.
export const productJsonLd = (
  product: HttpTypes.StoreProduct,
  countryCode: string
) => {
  const url = productUrl(countryCode, product.handle ?? "")
  const listed = listingImageUrls(product)
  const images = listed.length ? listed : productImageUrls(product)
  const variants = product.variants ?? []
  const common = {
    name: product.title,
    description: plainText(product.description) || undefined,
    image: images,
    brand: { "@type": "Brand", name: BRAND },
    url,
    ...(product.material ? { material: product.material } : {}),
    additionalProperty: productSpecs(product).map((s) => ({
      "@type": "PropertyValue",
      name: s.label,
      value: s.value,
    })),
  }

  const identity = (variant: HttpTypes.StoreProductVariant) => {
    const colour = variantColour(product, variant)
    return {
      ...(variant.sku ? { sku: variant.sku } : {}),
      ...(colour ? { color: colour } : {}),
    }
  }

  if (variants.length <= 1) {
    const variant = variants[0]
    const offer = variant ? offerFor(product, variant, url, countryCode) : null
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${url}#product`,
      ...common,
      ...(variant ? identity(variant) : {}),
      ...(offer ? { offers: offer } : {}),
    }
  }

  const hasColour = !!product.options?.some((o) =>
    /^colou?r$/i.test(o.title ?? "")
  )
  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    "@id": `${url}#product`,
    ...common,
    productGroupID: product.handle,
    ...(hasColour ? { variesBy: ["https://schema.org/color"] } : {}),
    hasVariant: variants.map((variant) => {
      const offer = offerFor(product, variant, url, countryCode)
      const own = (variant.images ?? [])
        .filter((i) => !!i.url && !isAiGeneratedImage(i))
        .map((i) => absoluteUrl(i.url))
      return {
        "@type": "Product",
        name: variant.title
          ? `${product.title} (${variant.title})`
          : product.title,
        ...identity(variant),
        image: own.length ? own : images.slice(0, 1),
        ...(offer ? { offers: offer } : {}),
      }
    }),
  }
}

// Home > Store > the product. The site has no breadcrumb trail on the page;
// this is the path a visitor takes to it.
export const breadcrumbJsonLd = (
  countryCode: string,
  product: HttpTypes.StoreProduct
) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: BRAND,
      item: absoluteUrl(`/${countryCode}`),
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Store",
      item: absoluteUrl(`/${countryCode}/store`),
    },
    {
      "@type": "ListItem",
      position: 3,
      name: product.title,
      item: productUrl(countryCode, product.handle ?? ""),
    },
  ],
})
