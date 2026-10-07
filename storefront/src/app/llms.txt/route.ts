import { HttpTypes } from "@medusajs/types"
import { CONTACT_EMAIL } from "@lib/constants"
import {
  listStorefront,
  storeUnavailable,
  storefrontCountryNames,
} from "@lib/data/seo"
import {
  isPreorderPrice,
  presaleAvailability,
  presaleShipDate,
  presaleShipLine,
  presaleShipsBy,
  variantOpen,
} from "@lib/util/presale"
import {
  BRAND,
  INSTAGRAM_URL,
  absoluteUrl,
  countryInSentence,
  defaultCountry,
  listInSentence,
  plainText,
  productUrl,
  variantPrice,
} from "@lib/util/seo"
import { productSpecs } from "@lib/util/specs"

// /llms.txt (llmstxt.org): what KeBe is, for AI answer engines, in plain
// Markdown built from the live store, so a price or ship date here is never
// staler than the product page. The owner's rules hold as on every page: a
// price always says "plus shipping", the only promise about supply is when
// an order placed now ships, never a count of boards, and nothing wireless.
// The data is at most an hour old (lib/data/seo.ts).

type Listing = { cc: string; product: HttpTypes.StoreProduct }

// "349.00 CAD", or "199.00 to 299.00 CAD" across variants, from the
// variants that can still be bought (all of them if none can).
const priceRange = (product: HttpTypes.StoreProduct) => {
  const variants = product.variants ?? []
  const open = variants.filter(variantOpen)
  const prices = (open.length ? open : variants)
    .map(variantPrice)
    .filter((p): p is NonNullable<typeof p> => !!p)
  if (!prices.length) return null
  const amounts = prices.map((p) => Number(p.amount)).sort((a, b) => a - b)
  const lo = prices.find((p) => Number(p.amount) === amounts[0])!.amount
  const hi = prices.find(
    (p) => Number(p.amount) === amounts[amounts.length - 1]
  )!.amount
  return `${lo === hi ? lo : `${lo} to ${hi}`} ${prices[0].currency}`
}

const statusLine = (product: HttpTypes.StoreProduct) => {
  if (!presaleAvailability(product).open) return "Status: sold out."
  if (!presaleShipsBy(product)) return "Status: in stock."
  const line = presaleShipLine(product)
  const iso = presaleShipDate(product)
  return `Status: pre-order, charged in full at checkout.${
    line ? ` ${line}${iso ? ` (${iso})` : ""}.` : ""
  }`
}

const productSection = (
  listings: Listing[],
  names: Record<string, string>
) => {
  const product = listings[0].product
  const open = presaleAvailability(product).open
  const lines = [`## ${product.title}`, "", `- ${statusLine(product)}`]

  for (const { cc, product: priced } of listings) {
    const url = productUrl(cc, priced.handle ?? "")
    const where = names[cc] ?? cc.toUpperCase()
    const range = open ? priceRange(priced) : null
    const preorder = (priced.variants ?? []).some((v) =>
      isPreorderPrice(priced, {
        price_type: v.calculated_price?.calculated_price?.price_list_type,
      })
    )
    lines.push(
      range
        ? `- [${where}](${url}): ${range} plus shipping${
            preorder ? " (the pre-order price)" : ""
          }`
        : `- [${where}](${url})`
    )
  }

  for (const spec of productSpecs(product)) {
    lines.push(`- ${spec.label}: ${spec.value}`)
  }

  const paragraphs = (product.description ?? "")
    .split(/\n\s*\n/)
    .map(plainText)
    .filter(Boolean)
  // A blank line between paragraphs, or Markdown runs them together.
  if (paragraphs.length) lines.push("", paragraphs.join("\n\n"))

  return lines.join("\n")
}

export async function GET() {
  // Without the store this would be a page with no products and no
  // countries, which an answer engine keeps until it next calls; a 503 asks
  // it to come back (review, 6 Oct 2026).
  const listed = await listStorefront()
  if (!listed) return storeUnavailable()
  const countries = listed.map(({ cc }) => cc)
  const names = await storefrontCountryNames()
  const home = defaultCountry(countries) ?? "ca"

  // Each product once, with its listing in every country that sells it;
  // the ones that can be bought first.
  const byHandle: Record<string, Listing[]> = {}
  const order: string[] = []
  for (const { cc, products } of listed) {
    for (const product of products) {
      if (!product.handle) continue
      if (!byHandle[product.handle]) {
        byHandle[product.handle] = []
        order.push(product.handle)
      }
      byHandle[product.handle].push({ cc, product })
    }
  }
  const handles = order.sort(
    (a, b) =>
      Number(presaleAvailability(byHandle[b][0].product).open) -
      Number(presaleAvailability(byHandle[a][0].product).open)
  )

  const shipsTo = listInSentence(
    countries.map((cc) => countryInSentence(names[cc] ?? cc.toUpperCase()))
  )

  const body = [
    `# ${BRAND}`,
    "",
    `> ${BRAND} is a one-person keyboard workshop in Canada. It makes 68-key ortholinear keyboards on the Matrix-Dvorak layout, a Dvorak-based layout on a straight grid of keys, assembled by hand in Canada and sold from this site${
      shipsTo ? `, which ships to ${shipsTo}` : ""
    }.`,
    "",
    "Everything below is read from the store's live product data. Prices are per country and do not include shipping, which is chosen at checkout. KeBe's keyboards are wired.",
    "",
    ...handles.map((h) => productSection(byHandle[h], names) + "\n"),
    "## Learn the layout",
    "",
    `- [Typing trainer](${absoluteUrl(
      `/${home}/train`
    )}): a free typing game in the browser that teaches the Matrix-Dvorak layout one letter at a time and then the symbols, numbers and Fn pad, with whole words from the thousand most common, a target speed to open each level and a 10-word speed test. It reads the letters the computer receives, so it works on a KeBe or on any keyboard with the computer set to Dvorak.`,
    "",
    "## More",
    "",
    ...countries.map(
      (cc) =>
        `- [Store, ${names[cc] ?? cc.toUpperCase()}](${absoluteUrl(
          `/${cc}/store`
        )})`
    ),
    `- [Privacy](${absoluteUrl(
      `/${home}/privacy`
    )}): what the site collects, why, where it is stored and how to have it deleted`,
    `- [Pre-order terms](${absoluteUrl(
      `/${home}/terms`
    )}): a pre-order can be cancelled for a full refund until it ships, defects are repaired or replaced for a year, and a board in its original condition can be returned for a refund within 30 days of delivery, the buyer paying return shipping`,
    `- [Instagram @kebe_keyboards](${INSTAGRAM_URL})`,
    `- Questions about an order: ${CONTACT_EMAIL}`,
    "",
  ].join("\n")

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
