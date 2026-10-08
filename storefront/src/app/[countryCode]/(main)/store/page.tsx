import { Metadata } from "next"

import { pageAlternates } from "@lib/data/seo"
import { BRAND, socialMetadata } from "@lib/util/seo"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"

// What the shop sells, in facts both boards' own pages state, the searched
// words first; the starter's "Explore all of our products." said nothing a
// search could match. "Assembled", as the pages say, never "made" in Canada.
const TITLE = "Ortholinear Dvorak Keyboards Assembled in Canada"
// The Lite has no Choc switches, so the old line was wrong for it (7 Oct 2026); v1 (sold out) has no hub, so the
// hub is not promised for every board in the grid.
const DESCRIPTION =
  "Ortholinear Dvorak keyboards with per-key RGB, assembled by hand in Canada: KeBe v2, mechanical and hot-swap, and the slim, membrane KeBe Lite."

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params
  return {
    // The root layout's template adds " | KeBe".
    title: TITLE,
    description: DESCRIPTION,
    // Sorting and paging are the same list: the canonical drops them.
    alternates: await pageAlternates(countryCode, "/store"),
    ...socialMetadata({
      title: `${TITLE} | ${BRAND}`,
      description: DESCRIPTION,
      path: "/store",
      countryCode,
    }),
  }
}

type Params = {
  searchParams: Promise<{
    sortBy?: SortOptions
    page?: string
  }>
  params: Promise<{
    countryCode: string
  }>
}

export default async function StorePage(props: Params) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { sortBy, page } = searchParams

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
    />
  )
}
