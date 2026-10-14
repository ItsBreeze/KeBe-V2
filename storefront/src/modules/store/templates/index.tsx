import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    // No sort list beside three boards, and the heading in the site's
    // display face (design audit, 14 Oct 2026); ?sortBy= still sorts.
    <div
      className="py-12 small:py-16 content-container"
      data-testid="category-container"
    >
      <div className="w-full">
        <h1
          className="mb-10 font-display text-[clamp(2.5rem,6vw,3.75rem)] leading-[1.05]"
          data-testid="store-page-title"
        >
          Keyboards
        </h1>
        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            countryCode={countryCode}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate
