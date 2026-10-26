// /waitlist: the KeBe Lite waitlist landing page (25 Oct 2026, approved by Lute for Josh).
// A standalone HTML page outside the store's layout; the form posts to the
// Cloudflare Worker, which stores the email in D1. Without JS, the Worker
// redirects back here with ?ok=1 or ?err=invalid|server. Revert: delete this
// folder, public/waitlist-assets/ and "waitlist" from the middleware matcher.
import { renderPage, MSG_INVALID, MSG_FAIL } from "./page-html"

const ENDPOINT = "https://kebe-waitlist.brisebyme.workers.dev/api/waitlist"

export const dynamic = "force-dynamic"

export function GET(request: Request) {
  const q = new URL(request.url).searchParams
  const err = q.get("err")
  const state = q.get("ok") === "1" ? "success" : err ? "error" : ""
  const body = renderPage({
    base: "/waitlist-assets/",
    action: ENDPOINT,
    storeUrl: "/",
    state,
    msg: err ? (err === "invalid" ? MSG_INVALID : MSG_FAIL) : "",
  })
  return new Response(body, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  })
}
