import { Metadata } from "next"

import { pageAlternates } from "@lib/data/seo"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"

// What the shop sells, in facts both boards' own pages state; the starter's
// "Explore all of our products." said nothing a search could match.
const DESCRIPTION =
  "KeBe's 68-key ortholinear keyboards on the Matrix-Dvorak layout, with hot-swap Kailh Choc switches and per-key RGB, assembled by hand in Canada."

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params
  return {
    title: "Ortholinear keyboards",
    description: DESCRIPTION,
    // Sorting and paging are the same list: the canonical drops them.
    alternates: await pageAlternates(countryCode, "/store"),
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
