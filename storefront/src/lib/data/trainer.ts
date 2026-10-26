"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import {
  cleanProgress,
  mergeProgress,
  Progress,
  PROGRESS_KEY,
  sameProgress,
} from "@lib/train/progress"
import { getAuthHeaders, getCacheTag } from "./cookies"

// The typing trainer's progress on the signed-in customer, read fresh (it
// changes after every test, and the customer cache would serve it stale).
async function me(): Promise<HttpTypes.StoreCustomer | null> {
  const headers = await getAuthHeaders()
  if (!("authorization" in headers)) return null
  return sdk.client
    .fetch<{ customer: HttpTypes.StoreCustomer }>(`/store/customers/me`, {
      method: "GET",
      query: { fields: "id,first_name,metadata" },
      headers,
      cache: "no-store",
    })
    .then(({ customer }) => customer)
    .catch(() => null)
}

export async function getTrainerAccount(): Promise<{
  id: string
  firstName: string | null
  progress: Progress
} | null> {
  const customer = await me()
  if (!customer) return null
  return {
    id: customer.id,
    firstName: customer.first_name || null,
    progress: cleanProgress(customer.metadata?.[PROGRESS_KEY]),
  }
}

// Merges the browser's progress into the account's, keeping the better of
// each, and returns the result; null when nobody is signed in or the save
// failed (the browser copy still holds it).
export async function saveTrainerProgress(
  local: Progress
): Promise<Progress | null> {
  const customer = await me()
  if (!customer) return null
  const stored = cleanProgress(customer.metadata?.[PROGRESS_KEY])
  const merged = mergeProgress(stored, cleanProgress(local))
  if (sameProgress(merged, stored)) return merged

  try {
    await sdk.store.customer.update(
      { metadata: { ...(customer.metadata ?? {}), [PROGRESS_KEY]: merged } },
      {},
      await getAuthHeaders()
    )
  } catch {
    return null
  }
  const tag = await getCacheTag("customers")
  if (tag) revalidateTag(tag)
  return merged
}
