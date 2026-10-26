"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { HttpTypes } from "@medusajs/types"

export const retrieveOrder = async (id: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("orders")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreOrderResponse>(`/store/orders/${id}`, {
      method: "GET",
      query: {
        fields:
          "*payment_collections.payments,*items,*items.metadata,*items.variant,*items.product",
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ order }) => order)
    .catch((err) => medusaError(err))
}

// The ship line in force when the order was paid for, such as "Currently
// shipping October 31" (6 Oct 2026). placeOrder records it on the cart just
// before completing it, and Medusa copies the cart's metadata to the order,
// but the store API leaves an order's metadata out of what it returns. A
// completed cart can no longer change, so its metadata holds the same value,
// and the store API does return it. Never the line item's add-time value.
// Null for an order without one (any cart without the presale board) and on
// any failure, so the confirmation page never fails over a ship date.
export const retrieveOrderShipLine = async (
  id: string
): Promise<string | null> => {
  try {
    const headers = {
      ...(await getAuthHeaders()),
    }

    const next = {
      ...(await getCacheOptions("orders")),
    }

    const cartId = await sdk.client
      .fetch<{ order: { cart?: { id?: string } | null } }>(
        `/store/orders/${id}`,
        {
          method: "GET",
          query: { fields: "id,cart.id" },
          headers,
          next,
          cache: "force-cache",
        }
      )
      .then(({ order }) => order.cart?.id)

    if (!cartId) {
      return null
    }

    const shipLine = await sdk.client
      .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${cartId}`, {
        method: "GET",
        query: { fields: "id,metadata" },
        headers,
        next,
        cache: "force-cache",
      })
      .then(({ cart }) => cart.metadata?.ship_line)

    return typeof shipLine === "string" && shipLine ? shipLine : null
  } catch {
    return null
  }
}

export const listOrders = async (
  limit: number = 10,
  offset: number = 0,
  filters?: Record<string, any>
) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("orders")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreOrderListResponse>(`/store/orders`, {
      method: "GET",
      query: {
        limit,
        offset,
        order: "-created_at",
        fields: "*items,+items.metadata,*items.variant,*items.product",
        ...filters,
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ orders }) => orders)
    .catch((err) => medusaError(err))
}

export const createTransferRequest = async (
  state: {
    success: boolean
    error: string | null
    order: HttpTypes.StoreOrder | null
  },
  formData: FormData
): Promise<{
  success: boolean
  error: string | null
  order: HttpTypes.StoreOrder | null
}> => {
  const id = formData.get("order_id") as string

  if (!id) {
    return { success: false, error: "Order ID is required", order: null }
  }

  const headers = await getAuthHeaders()

  return await sdk.store.order
    .requestTransfer(
      id,
      {},
      {
        fields: "id, email",
      },
      headers
    )
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export const acceptTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .acceptTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export const declineTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .declineTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}
