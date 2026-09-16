"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { joinWaitlist, WaitlistState } from "@lib/data/waitlist"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-[7px] bg-white px-7 py-3 text-base text-black transition-opacity hover:opacity-80 disabled:opacity-50"
    >
      {pending ? "Adding…" : "Notify me"}
    </button>
  )
}

export default function WaitlistForm({
  source = "v2",
}: {
  source?: "v2" | "v1-restock"
}) {
  const [state, action] = useActionState<WaitlistState, FormData>(joinWaitlist, {
    status: "idle",
  })

  if (state.status === "ok") {
    return (
      <p className="text-lg text-[#E0E0DB]" role="status">
        {state.message} We'll write once, when there's something to see.
      </p>
    )
  }

  return (
    <form action={action} className="w-full max-w-md">
      <input type="hidden" name="source" value={source} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="waitlist-email" className="sr-only">
          Email address
        </label>
        <input
          id="waitlist-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          aria-describedby={state.status === "error" ? "waitlist-error" : undefined}
          className="w-full rounded-[7px] border-2 border-white/40 bg-transparent px-5 py-3 text-base text-white placeholder:text-white/40 focus:border-white focus:outline-none"
        />
        <SubmitButton />
      </div>
      {state.status === "error" && (
        <p id="waitlist-error" role="alert" className="mt-3 text-sm text-red-300">
          {state.message}
        </p>
      )}
    </form>
  )
}
