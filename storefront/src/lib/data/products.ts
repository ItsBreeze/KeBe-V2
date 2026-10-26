"use server"

import { sdk } from "@lib/config"
import {
  PRESALE_HANDLE,
  isPresaleHandle,
  presaleShipDate,
  presaleShipLine,
} from "@lib/util/presale"
import { sortProducts } from "@lib/util/sort-products"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { getRegion, retrieveRegion } from "./regions"

export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
  revalidate,
}: {
  pageParam?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
  countryCode?: string
  regionId?: string
  // Seconds before a cached answer is fetched again (lib/data/regions.ts).
  revalidate?: number
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
}> => {
  if (!countryCode && !regionId) {
    throw new Error("Country code or region ID is required")
  }

  const limit = queryParams?.limit || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit

  let region: HttpTypes.StoreRegion | undefined | null

  if (countryCode) {
    region = await getRegion(countryCode)
  } else {
    region = await retrieveRegion(regionId!)
  }

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
    ...(revalidate ? { revalidate } : {}),
  }

  return sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
      `/store/products`,
      {
        method: "GET",
        query: {
          limit,
          offset,
          region_id: region?.id,
          fields:
            "*variants.calculated_price,+variants.inventory_quantity,*variants.images,+metadata,+tags,",
          ...queryParams,
        },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ products, count }) => {
      const nextPage = count > offset + limit ? pageParam + 1 : null

      return {
        response: {
          products,
          count,
        },
        nextPage: nextPage,
        queryParams,
      }
    })
}

/**
 * This will fetch 100 products to the Next.js cache and sort them based on the sortBy parameter.
 * It will then return the paginated products based on the page and limit parameters.
 */
export const listProductsWithSort = async ({
  page = 0,
  queryParams,
  sortBy = "created_at",
  countryCode,
}: {
  page?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
  sortBy?: SortOptions
  countryCode: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
}> => {
  const limit = queryParams?.limit || 12

  const {
    response: { products, count },
  } = await listProducts({
    pageParam: 0,
    queryParams: {
      ...queryParams,
      limit: 100,
    },
    countryCode,
  })

  const sortedProducts = sortProducts(products, sortBy)

  const pageParam = (page - 1) * limit

  const nextPage = count > pageParam + limit ? pageParam + limit : null

  const paginatedProducts = sortedProducts.slice(pageParam, pageParam + limit)

  return {
    response: {
      products: paginatedProducts,
      count,
    },
    nextPage,
    queryParams,
  }
}

// When a pre-order placed now ships, in this region: the line the product
// page shows and its YYYY-MM-DD. fresh reads the backend directly, for the
// moment an order is taken; otherwise it is listProducts' cached answer, which
// the backend's revalidate-storefront subscriber refreshes when stock moves.
// Null on any failure, so a caller never fails over a ship date.
export async function getPresaleShipInfo({
  regionId,
  fresh,
  handle = PRESALE_HANDLE,
  countryCode,
}: {
  regionId: string
  fresh?: boolean
  // which pre-order board: KeBe v2 unless a cart line says otherwise
  handle?: string
  // where the order ships: a US address gets the FCC date (presale.ts)
  countryCode?: string | null
}): Promise<{
  productId: string
  shipLine: string | null
  shipDate: string | null
} | null> {
  try {
    let product: HttpTypes.StoreProduct | undefined

    if (fresh) {
      const headers = {
        ...(await getAuthHeaders()),
      }

      product = await sdk.client
        .fetch<{ products: HttpTypes.StoreProduct[] }>(`/store/products`, {
          method: "GET",
          query: {
            handle,
            region_id: regionId,
            limit: 1,
            fields:
              "*variants.calculated_price,+variants.inventory_quantity,+metadata",
          },
          headers,
          cache: "no-store",
        })
        .then(({ products }) => products[0])
    } else {
      product = await listProducts({
        regionId,
        queryParams: { handle, limit: 1 },
      }).then(({ response }) => response.products[0])
    }

    if (!product) {
      return null
    }

    return {
      productId: product.id,
      shipLine: presaleShipLine(product, countryCode),
      shipDate: presaleShipDate(product, countryCode),
    }
  } catch {
    return null
  }
}

// The ship line for a cart's or an order's pre-order boards: the latest of their dates, since an order holding
// KeBe v2 and KeBe Lite ships when both can (6 Oct 2026). Null when it holds none, and on any failure.
export async function getCartPresaleShipInfo({
  regionId,
  items,
  fresh,
  countryCode,
}: {
  regionId: string
  countryCode?: string | null
  items:
    | { product_handle?: string | null; product?: { handle?: string | null } | null }[]
    | null
    | undefined
  fresh?: boolean
}) {
  const handles = Array.from(
    new Set(
      (items ?? [])
        .map((i) => i.product_handle ?? i.product?.handle)
        .filter((h): h is string => isPresaleHandle(h))
    )
  )
  const infos = await Promise.all(
    handles.map((handle) =>
      getPresaleShipInfo({ regionId, fresh, handle, countryCode })
    )
  )
  return (
    infos
      .filter((i): i is NonNullable<typeof i> => !!i)
      .sort((a, b) => (b.shipDate ?? "").localeCompare(a.shipDate ?? ""))[0] ?? null
  )
}
