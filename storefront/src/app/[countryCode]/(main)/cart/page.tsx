import { retrieveCart } from "@lib/data/cart"
import { listCartShippingMethods } from "@lib/data/fulfillment"
import { getCartPresaleShipInfo } from "@lib/data/products"
import { convertToLocale } from "@lib/util/money"
import { presaleLineOf } from "@lib/util/presale"
import { PRIVATE_PAGE_ROBOTS } from "@lib/util/seo"
import { HttpTypes } from "@medusajs/types"
import CartTemplate from "@modules/cart/templates"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Cart",
  description: "View your cart",
  robots: PRIVATE_PAGE_ROBOTS,
}

// The Shipping row's line before a delivery is chosen (6 Oct 2026), from the
// amounts the options are set to now: "From CA$20.00, chosen at checkout".
// Without an address Medusa lists every zone's options, with no amount in
// this cart's currency, so only options with an amount count, and pickup is
// left out. When the cheapest costs nothing, the row names it as included and
// never says "Free". No line when no option counts or the read fails, and the
// row then says "Chosen at checkout".
const getShippingNote = async (
  cart: HttpTypes.StoreCart
): Promise<string | undefined> => {
  const options = await listCartShippingMethods(cart.id).catch(() => null)

  const priced = (options ?? [])
    .filter(
      (option) =>
        typeof option.amount === "number" &&
        option.service_zone?.fulfillment_set?.type !== "pickup"
    )
    .sort((a, b) => a.amount - b.amount)

  const money = (amount: number) =>
    convertToLocale({ amount, currency_code: cart.currency_code })

  const cheapest = priced[0]

  if (!cheapest) {
    return undefined
  }

  if (cheapest.amount > 0) {
    return `From ${money(cheapest.amount)}, chosen at checkout`
  }

  const next = priced.find((option) => option.amount > 0)

  return next
    ? `${cheapest.name} included; ${next.name} +${money(
        next.amount
      )}, chosen at checkout`
    : `${cheapest.name} included`
}

export default async function Cart() {
  const cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  const items = cart?.items ?? []

  const presaleLine = presaleLineOf(items)

  // The ship line the product page shows now, under the board's row. It is
  // the cached product read, as on checkout: the line on the cart item is from
  // when the board was added.
  const [shipLine, shippingNote] = await Promise.all([
    presaleLine && cart?.region_id
      ? getCartPresaleShipInfo({ regionId: cart.region_id, items }).then(
          (info) => info?.shipLine ?? null
        )
      : null,
    cart && items.length && !cart.shipping_methods?.length
      ? getShippingNote(cart)
      : undefined,
  ])

  return (
    <CartTemplate cart={cart} shipLine={shipLine} shippingNote={shippingNote} />
  )
}
