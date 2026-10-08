"use client"

import { useActionState, useEffect, useId } from "react"
import { useFormStatus } from "react-dom"
import { joinWaitlist, WaitlistState } from "@lib/data/waitlist"
import { trackPixel } from "@lib/util/meta-pixel"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-xl bg-kebe-text px-7 py-3 text-base font-medium text-kebe-page transition-colors hover:bg-white disabled:opacity-50"
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
  // Its own ids: the home hero mounts the form twice, one copy for wide
  // screens and one for phones, and each label must find its own field
  // (review, 7 Oct 2026).
  const uid = useId()
  const emailId = `waitlist-email-${uid}`
  const errorId = `waitlist-error-${uid}`

  // A sign-up is a Lead to the Meta pixel. The event carries only which list.
  useEffect(() => {
    if (state.status === "ok") trackPixel("Lead", { content_name: source })
  }, [state.status, source])

  if (state.status === "ok") {
    return (
      <p className="text-lg text-kebe-text" role="status">
        {state.message} We'll write once, when there's something to see.
      </p>
    )
  }

  return (
    <form action={action} className="w-full max-w-md">
      <input type="hidden" name="source" value={source} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={emailId} className="sr-only">
          Email address
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          aria-describedby={state.status === "error" ? errorId : undefined}
          className="w-full rounded-xl border border-kebe-line bg-kebe-raised px-5 py-3 text-base text-kebe-text placeholder:text-kebe-faint focus:border-kebe-muted focus:outline-none"
        />
        <SubmitButton />
      </div>
      {state.status === "error" && (
        <p id={errorId} role="alert" className="mt-3 text-sm text-red-300">
          {state.message}
        </p>
      )}
    </form>
  )
}
