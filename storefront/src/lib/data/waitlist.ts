"use server"

import { sdk } from "@lib/config"

export type WaitlistState = { status: "idle" | "ok" | "error"; message?: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData
): Promise<WaitlistState> {
  const email = String(formData.get("email") ?? "").trim()
  const source = String(formData.get("source") ?? "v2")

  if (!EMAIL.test(email)) {
    return { status: "error", message: "That doesn't look like an email address." }
  }

  try {
    await sdk.client.fetch("/store/waitlist", {
      method: "POST",
      body: { email, source },
    })
    return { status: "ok", message: "You're on the list." }
  } catch {
    return {
      status: "error",
      message: "Couldn't save that just now. Try again in a moment.",
    }
  }
}
