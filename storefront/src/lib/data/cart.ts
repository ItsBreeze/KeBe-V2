"use server"

import { sdk } from "@lib/config"
import { getCheckoutStep } from "@lib/util/checkout-step"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { cookies as nextCookies } from "next/headers"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeCartId,
  setCartId,
} from "./cookies"
import { getPresaleShipInfo } from "./products"
import { getRegion } from "./regions"
import { getLocale } from "@lib/data/locale-actions"

// The ad that brought this visitor, if any: the utm_* tags middleware.ts
// keeps in _kebe_utm. Put on the cart when it is made and again at checkout
// (the latest tagged visit wins); Medusa copies cart metadata to the order.
async function utmMetadata(): Promise<Record<string, string> | undefined> {
  try {
    const raw = (await nextCookies()).get("_kebe_utm")?.value
    if (!raw) return undefined
    const tags = JSON.parse(raw)
    if (!tags || typeof tags !== "object") return undefined
    const metadata = Object.fromEntries(
      Object.entries(tags).filter(
        ([key, value]) =>
          (key.startsWith("utm_") || key === "fbclid") &&
          typeof value === "string"
      )
    ) as Record<string, string>
    return Object.keys(metadata).length ? metadata : undefined
  } catch {
    return undefined
  }
}

// A ship line as metadata: only the values there are, since Medusa's
// mergeMetadata deletes a key set to "".
function shipMetadata(
  info: { shipLine: string | null; shipDate: string | null } | null
): Record<string, string> {
  return Object.fromEntries(
    Object.entries({
      ship_line: info?.shipLine,
      ships_by_date: info?.shipDate,
    }).filter(([, value]) => !!value)
  ) as Record<string, string>
}

// The ship line in force as the buyer pays, when the cart holds the presale
// board. The cart and the product are both read past the cache: stock may
// have run out since the board was added, and then the line is the backorder
// date. Empty for any other cart and on any failure.
async function shipMetadataAtPayment(
  cartId: string
): Promise<Record<string, string>> {
  try {
    const headers = {
      ...(await getAuthHeaders()),
    }

    const cart = await sdk.client
      .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${cartId}`, {
        method: "GET",
        query: {
          fields: "id,region_id,items.id,items.product_id",
        },
        headers,
        cache: "no-store",
      })
      .then(({ cart }: { cart: HttpTypes.StoreCart }) => cart)

    if (!cart.region_id) {
      return {}
    }

    const info = await getPresaleShipInfo({
      regionId: cart.region_id,
      fresh: true,
    })

    if (!info || !cart.items?.some((i) => i.product_id === info.productId)) {
      return {}
    }

    return shipMetadata(info)
  } catch {
    return {}
  }
}

// An error's message, for an action's { error } result.
function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Retrieves a cart by its ID. If no ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to retrieve.
 * @returns The cart object if found, or null if not found.
 */
export async function retrieveCart(cartId?: string, fields?: string) {
  const id = cartId || (await getCartId())
  fields ??=
    "*items, *region, *items.product, *items.variant, *items.thumbnail, *items.metadata, +items.total, *promotions, +shipping_methods.name"

  if (!id) {
    return null
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("carts")),
  }

  return await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${id}`, {
      method: "GET",
      query: {
        fields,
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ cart }: { cart: HttpTypes.StoreCart }) => cart)
    .catch(() => null)
}

export async function getOrSetCart(countryCode: string) {
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  // The cookie's cart, read past the cache. Medusa still returns a cart once
  // its order is placed, and the Stripe webhook that completes it never
  // revalidates the cache here, so a cached read kept adding to a placed
  // order and every add failed.
  const cartId = await getCartId()
  let cart: HttpTypes.StoreCart | null = cartId
    ? await sdk.client
        .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${cartId}`, {
          method: "GET",
          query: {
            fields: "id,region_id,completed_at",
          },
          headers,
          cache: "no-store",
        })
        .then(({ cart }: { cart: HttpTypes.StoreCart }) => cart)
        .catch(() => null)
    : null

  // A placed order's cart is finished: start a new one, as for a visitor
  // without a cart.
  if (cart?.completed_at) {
    await removeCartId()
    cart = null
  }

  if (!cart) {
    const locale = await getLocale()
    const cartResp = await sdk.store.cart.create(
      {
        region_id: region.id,
        locale: locale || undefined,
        metadata: await utmMetadata(),
      },
      {},
      headers
    )
    cart = cartResp.cart

    await setCartId(cart.id)

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  if (cart && cart?.region_id !== region.id) {
    await sdk.store.cart.update(cart.id, { region_id: region.id }, {}, headers)
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  return cart
}

export async function updateCart(data: HttpTypes.StoreUpdateCart) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found, please create one before updating")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, data, {}, headers)
    .then(async ({ cart }: { cart: HttpTypes.StoreCart }) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)

      return cart
    })
    .catch(medusaError)
}

export async function addToCart({
  variantId,
  quantity,
  countryCode,
}: {
  variantId: string
  quantity: number
  countryCode: string
}) {
  if (!variantId) {
    throw new Error("Missing variant ID when adding to cart")
  }

  const cart = await getOrSetCart(countryCode)

  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .createLineItem(
      cart.id,
      {
        variant_id: variantId,
        quantity,
      },
      {},
      headers
    )
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

// The presale's Pre-order button. It is a form, so a tap made before the
// page's script has loaded still posts here, and every tap shows in the
// server log as a POST to the product page. A pre-order is one board: a
// second tap sets the cart's line back to one rather than adding another.
// Then the visitor goes straight to checkout, at the step the cart is at.
// The line carries the ship line in force when the tap is made, worked out
// here from the product and never taken from the form. That value is a
// record for Admin only: the cart and checkout show the line worked out from
// the product (getPresaleShipInfo), and placeOrder puts the line in force at
// payment on the order. A failure returns an error for the page to show, so
// the button can be tapped again.
export async function preorderNow(
  _prev: { error?: boolean } | null,
  formData: FormData
): Promise<{ error?: boolean }> {
  const variantId = formData.get("variant_id")
  const countryCode = formData.get("country_code")

  if (
    typeof variantId !== "string" ||
    !variantId ||
    typeof countryCode !== "string" ||
    !countryCode
  ) {
    return { error: true }
  }

  let step: ReturnType<typeof getCheckoutStep> = "address"

  try {
    const cart = await getOrSetCart(countryCode)

    if (!cart) {
      throw new Error("Error retrieving or creating cart")
    }

    const headers = {
      ...(await getAuthHeaders()),
    }

    // Read past the cache, so a line added a moment ago is found.
    const full = await sdk.client
      .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${cart.id}`, {
        method: "GET",
        query: {
          fields:
            "id,region_id,email,*items,shipping_address.address_1,shipping_methods.id",
        },
        headers,
        cache: "no-store",
      })
      .then(({ cart }: { cart: HttpTypes.StoreCart }) => cart)

    // A visitor who has already given an address or chosen a delivery goes
    // on from there.
    step = getCheckoutStep(full)

    const info = full.region_id
      ? await getPresaleShipInfo({ regionId: full.region_id, fresh: true })
      : null

    const metadata = shipMetadata(info)

    const line = full.items?.find((i) => i.variant_id === variantId)

    if (line) {
      await sdk.store.cart.updateLineItem(
        cart.id,
        line.id,
        { quantity: 1, metadata },
        {},
        headers
      )
    } else {
      const { cart: added } = await sdk.store.cart.createLineItem(
        cart.id,
        { variant_id: variantId, quantity: 1, metadata },
        {},
        headers
      )

      // Two taps close together, before the page's script has loaded, can
      // both get here before either has added the board. Medusa then adds
      // the second to the first's line, or gives it a line of its own, and
      // the cart holds two boards (6 Oct 2026). Whichever add runs second
      // sees that and puts the cart back to one.
      const [first, ...extra] = (added.items ?? []).filter(
        (i) => i.variant_id === variantId
      )

      if (first && first.quantity > 1) {
        await sdk.store.cart.updateLineItem(
          cart.id,
          first.id,
          { quantity: 1 },
          {},
          headers
        )
      }

      for (const twin of extra) {
        await sdk.store.cart.deleteLineItem(cart.id, twin.id, {}, headers)
      }
    }

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)

    const fulfillmentCacheTag = await getCacheTag("fulfillment")
    revalidateTag(fulfillmentCacheTag)
  } catch (error) {
    console.error("Pre-order failed:", error)
    return { error: true }
  }

  // Outside the try: redirect() works by throwing. ?added=1 has the checkout
  // page count the AddToCart. This action must not be awaited by client code.
  // If it ever is, the caller's catch must call unstable_rethrow(e) first,
  // because Next rejects a redirecting action's promise with NEXT_REDIRECT.
  redirect(`/${countryCode}/checkout?step=${step}&added=1`)
}

// The four actions below return { error } rather than throw. A thrown
// server-action error reaches a production page as React's "An error
// occurred in the Server Components render" text, never its own message, so
// each caller shows its own plain sentence instead.
export async function updateLineItem({
  lineId,
  quantity,
}: {
  lineId: string
  quantity: number
}): Promise<{ error: string } | undefined> {
  try {
    if (!lineId) {
      throw new Error("Missing lineItem ID when updating line item")
    }

    const cartId = await getCartId()

    if (!cartId) {
      throw new Error("Missing cart ID when updating line item")
    }

    const headers = {
      ...(await getAuthHeaders()),
    }

    await sdk.store.cart.updateLineItem(
      cartId,
      lineId,
      { quantity },
      {},
      headers
    )

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)

    const fulfillmentCacheTag = await getCacheTag("fulfillment")
    revalidateTag(fulfillmentCacheTag)
  } catch (error) {
    console.error("Changing a line's quantity failed:", error)
    return { error: errorText(error) }
  }
}

export async function deleteLineItem(
  lineId: string
): Promise<{ error: string } | undefined> {
  try {
    if (!lineId) {
      throw new Error("Missing lineItem ID when deleting line item")
    }

    const cartId = await getCartId()

    if (!cartId) {
      throw new Error("Missing cart ID when deleting line item")
    }

    const headers = {
      ...(await getAuthHeaders()),
    }

    await sdk.store.cart.deleteLineItem(cartId, lineId, {}, headers)

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)

    const fulfillmentCacheTag = await getCacheTag("fulfillment")
    revalidateTag(fulfillmentCacheTag)
  } catch (error) {
    console.error("Removing a line failed:", error)
    return { error: errorText(error) }
  }
}

export async function setShippingMethod({
  cartId,
  shippingMethodId,
}: {
  cartId: string
  shippingMethodId: string
}): Promise<{ error: string } | undefined> {
  try {
    const headers = {
      ...(await getAuthHeaders()),
    }

    await sdk.store.cart.addShippingMethod(
      cartId,
      { option_id: shippingMethodId },
      {},
      headers
    )

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  } catch (error) {
    console.error("Setting the delivery option failed:", error)
    return { error: errorText(error) }
  }
}

export async function initiatePaymentSession(
  cart: HttpTypes.StoreCart,
  data: HttpTypes.StoreInitializePaymentSession
): Promise<HttpTypes.StorePaymentCollectionResponse | { error: string }> {
  try {
    const headers = {
      ...(await getAuthHeaders()),
    }

    const resp = await sdk.store.payment.initiatePaymentSession(
      cart,
      data,
      {},
      headers
    )

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)

    return resp
  } catch (error) {
    console.error("Starting the payment session failed:", error)
    return { error: errorText(error) }
  }
}

export async function applyPromotions(codes: string[]) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, { promo_codes: codes }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function applyGiftCard(code: string) {
  //   const cartId = getCartId()
  //   if (!cartId) return "No cartId cookie found"
  //   try {
  //     await updateCart(cartId, { gift_cards: [{ code }] }).then(() => {
  //       revalidateTag("cart")
  //     })
  //   } catch (error: any) {
  //     throw error
  //   }
}

export async function removeDiscount(code: string) {
  // const cartId = getCartId()
  // if (!cartId) return "No cartId cookie found"
  // try {
  //   await deleteDiscount(cartId, code)
  //   revalidateTag("cart")
  // } catch (error: any) {
  //   throw error
  // }
}

export async function removeGiftCard(
  codeToRemove: string,
  giftCards: any[]
  // giftCards: GiftCard[]
) {
  //   const cartId = getCartId()
  //   if (!cartId) return "No cartId cookie found"
  //   try {
  //     await updateCart(cartId, {
  //       gift_cards: [...giftCards]
  //         .filter((gc) => gc.code !== codeToRemove)
  //         .map((gc) => ({ code: gc.code })),
  //     }).then(() => {
  //       revalidateTag("cart")
  //     })
  //   } catch (error: any) {
  //     throw error
  //   }
}

export async function submitPromotionForm(
  currentState: unknown,
  formData: FormData
) {
  const code = formData.get("code") as string
  try {
    await applyPromotions([code])
  } catch (e: any) {
    return e.message
  }
}

// TODO: Pass a POJO instead of a form entity here
export async function setAddresses(currentState: unknown, formData: FormData) {
  try {
    if (!formData) {
      throw new Error("No form data found when setting addresses")
    }
    const cartId = await getCartId()
    if (!cartId) {
      throw new Error("No existing cart found when setting addresses")
    }

    const data = {
      shipping_address: {
        first_name: formData.get("shipping_address.first_name"),
        last_name: formData.get("shipping_address.last_name"),
        address_1: formData.get("shipping_address.address_1"),
        address_2: formData.get("shipping_address.address_2") ?? "",
        postal_code: formData.get("shipping_address.postal_code"),
        city: formData.get("shipping_address.city"),
        country_code: formData.get("shipping_address.country_code"),
        province: formData.get("shipping_address.province"),
        phone: formData.get("shipping_address.phone"),
      },
      email: formData.get("email"),
    } as any

    const sameAsBilling = formData.get("same_as_billing")
    if (sameAsBilling === "on") data.billing_address = data.shipping_address

    if (sameAsBilling !== "on")
      data.billing_address = {
        first_name: formData.get("billing_address.first_name"),
        last_name: formData.get("billing_address.last_name"),
        address_1: formData.get("billing_address.address_1"),
        address_2: formData.get("billing_address.address_2") ?? "",
        postal_code: formData.get("billing_address.postal_code"),
        city: formData.get("billing_address.city"),
        country_code: formData.get("billing_address.country_code"),
        province: formData.get("billing_address.province"),
        phone: formData.get("billing_address.phone"),
      }
    const updated = await updateCart(data)

    // Delivery opens with the cheapest option already chosen (Expedited in
    // Canada, Tracked Packet in the US), so Continue to payment works without
    // a tap. The options are read past the cache for the address just saved.
    // Without an address Medusa lists every zone's options, with no amount in
    // this cart's currency, so only options with an amount count. A delivery
    // the visitor already chose is kept. Any failure leaves Delivery as it
    // was, with nothing chosen: setShippingMethod logs and returns its own
    // failure, and this catch takes a failed read.
    try {
      if (updated.shipping_methods?.length === 0) {
        const headers = {
          ...(await getAuthHeaders()),
        }

        const { shipping_options } =
          await sdk.client.fetch<HttpTypes.StoreShippingOptionListResponse>(
            `/store/shipping-options`,
            {
              method: "GET",
              query: { cart_id: cartId },
              headers,
              cache: "no-store",
            }
          )

        const cheapest = shipping_options
          .filter(
            (option) =>
              typeof option.amount === "number" &&
              option.service_zone?.fulfillment_set?.type !== "pickup"
          )
          .sort((a, b) => a.amount - b.amount)[0]

        if (cheapest) {
          await setShippingMethod({ cartId, shippingMethodId: cheapest.id })
        }
      }
    } catch (e) {
      console.error("Choosing the cheapest delivery option failed:", e)
    }
  } catch (e: any) {
    return e.message
  }

  redirect(
    `/${formData.get("shipping_address.country_code")}/checkout?step=delivery`
  )
}

// It never throws to the page. By the time it runs, Stripe has already
// captured the card (capture is automatic), so a failure here is a buyer who
// has paid and has no order. The page has to say so in its own words, not
// show React's production error text or nothing at all.
/**
 * Places an order for a cart. If no cart ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to place an order for.
 * @returns Nothing when the order is placed, since it redirects to the
 * order's confirmation; { error } when it is not.
 */
export async function placeOrder(cartId?: string): Promise<{ error: string }> {
  let order: HttpTypes.StoreOrder | null = null
  let error = "The order did not complete."

  try {
    const id = cartId || (await getCartId())

    if (!id) {
      return { error: "No existing cart found when placing an order" }
    }

    const headers = {
      ...(await getAuthHeaders()),
    }

    // One update for the ad that brought the buyer and, for the presale board,
    // the ship line in force now. Medusa copies cart metadata to the order, so
    // order.metadata.ship_line is the date this order was promised. It goes on
    // the cart, not the line: a line update this close to completion could
    // re-price the cart after the card has gone through. For the same reason,
    // nothing here may stand in the way of the order.
    const [utm, ship] = await Promise.all([
      utmMetadata(),
      shipMetadataAtPayment(id),
    ])
    const metadata = { ...utm, ...ship }
    if (Object.keys(metadata).length) {
      await sdk.store.cart
        .update(id, { metadata }, {}, headers)
        .catch(() => undefined)
    }

    // Two tries, 1.5 s apart. The Stripe webhook completes the same cart once
    // the payment succeeds, and while it does, this call fails with "Cart is
    // already being completed by another request". Completing a cart that is
    // already completed returns its order, so the second try finds the order
    // either way.
    for (let attempt = 0; attempt < 2 && !order; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }

      try {
        const cartRes = await sdk.store.cart.complete(id, {}, headers)

        if (cartRes.type === "order") {
          order = cartRes.order
        } else {
          error = cartRes.error?.message ?? "The order did not complete."
        }
      } catch (e) {
        error = errorText(e)
      }
    }

    if (!order) {
      console.error(`Placing the order for ${id} failed:`, error)
      return { error }
    }
  } catch (e) {
    console.error("Placing the order failed:", e)
    return { error: errorText(e) }
  }

  // The order exists from here on, so nothing may stand between the buyer
  // and its confirmation page. The carts tag is refreshed only now (6 Oct
  // 2026): refreshing it on a failure re-rendered checkout, which could not
  // read the cart while the backend was down and sent a charged buyer to an
  // empty cart, in place of the "do not pay again" message.
  try {
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)

    const orderCacheTag = await getCacheTag("orders")
    revalidateTag(orderCacheTag)

    await removeCartId()
  } catch (e) {
    console.error("Clearing the placed order's cart failed:", e)
  }

  // Outside any try: redirect() works by throwing. The page's catch must call
  // unstable_rethrow(e) first, because Next rejects a redirecting action's
  // promise with NEXT_REDIRECT.
  const countryCode = order.shipping_address?.country_code?.toLowerCase()
  redirect(`/${countryCode}/order/${order.id}/confirmed`)
}

/**
 * Updates the countrycode param and revalidates the regions cache
 * @param regionId
 * @param countryCode
 */
export async function updateRegion(countryCode: string, currentPath: string) {
  const cartId = await getCartId()
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  if (cartId) {
    await updateCart({ region_id: region.id })
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  const regionCacheTag = await getCacheTag("regions")
  revalidateTag(regionCacheTag)

  const productsCacheTag = await getCacheTag("products")
  revalidateTag(productsCacheTag)

  redirect(`/${countryCode}${currentPath}`)
}

export async function listCartOptions() {
  const cartId = await getCartId()
  const headers = {
    ...(await getAuthHeaders()),
  }
  const next = {
    ...(await getCacheOptions("shippingOptions")),
  }

  return await sdk.client.fetch<{
    shipping_options: HttpTypes.StoreCartShippingOption[]
  }>("/store/shipping-options", {
    query: { cart_id: cartId },
    next,
    headers,
    cache: "force-cache",
  })
}
