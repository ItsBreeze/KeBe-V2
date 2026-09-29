import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

// Clears the Next cache so an edit in Medusa Admin, or stock moving (the
// presale's boards-left count), shows up without redeploying the storefront.
//
//   POST /api/revalidate?secret=<REVALIDATE_SECRET>
//
// Called automatically by the backend's revalidate-storefront subscriber, and
// safe to curl by hand if a change ever looks stuck.
//
// revalidatePath rather than revalidateTag on purpose: this storefront builds
// its cache tags per visitor (`products-${_medusa_cache_id}` -- see
// lib/data/cookies.ts), so there is no single product tag a webhook could
// invalidate for everyone. Paths are global.
//
// The root layout, not a list of pages: a page's cache tag keeps its route
// group (`/[countryCode]/(main)/page`), so the old list without `(main)`
// matched nothing and no page ever refreshed. Every route sits under the root
// layout, so this reaches them all; it also drops per-visitor cart entries,
// which cost one refetch each.

export async function POST(req: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET

  // Fail closed. An unset secret must not mean "anyone may flush the cache".
  if (!expected) {
    return NextResponse.json(
      { error: "Revalidation is not configured." },
      { status: 503 }
    )
  }

  const provided = req.nextUrl.searchParams.get("secret")
  if (provided !== expected) {
    return NextResponse.json({ error: "Invalid secret." }, { status: 401 })
  }

  revalidatePath("/", "layout")

  return NextResponse.json({ revalidated: ["/ (layout)"] })
}
