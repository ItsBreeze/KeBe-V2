import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

// Clears the Next cache for catalog pages so an edit in Medusa Admin shows up
// without redeploying the storefront.
//
//   POST /api/revalidate?secret=<REVALIDATE_SECRET>
//
// Called automatically by the backend's product-changed subscriber, and safe to
// curl by hand if a change ever looks stuck.
//
// revalidatePath rather than revalidateTag on purpose: this storefront builds
// its cache tags per visitor (`products-${_medusa_cache_id}` -- see
// lib/data/cookies.ts), so there is no single product tag a webhook could
// invalidate for everyone. Paths are global.

const PATHS: Array<[string, "page" | "layout"]> = [
  ["/[countryCode]/products/[handle]", "page"],
  ["/[countryCode]/store", "page"],
  ["/[countryCode]/categories/[...category]", "page"],
  ["/[countryCode]/collections/[handle]", "page"],
  ["/[countryCode]", "page"],
]

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

  for (const [path, type] of PATHS) {
    revalidatePath(path, type)
  }

  return NextResponse.json({ revalidated: PATHS.map(([p]) => p) })
}
