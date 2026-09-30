import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { Text, clx } from "@medusajs/ui"

import { CONTACT_EMAIL } from "@lib/constants"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Bear from "@modules/common/icons/bear"

export default async function Footer() {
  const { collections } = await listCollections({
    fields: "*products",
  })
  const productCategories = await listCategories()

  return (
    <footer className="border-t border-ui-border-base w-full">
      <div className="content-container flex flex-col w-full">
        <div className="flex flex-col gap-y-6 xsmall:flex-row items-start justify-between py-16">
          <div>
            <LocalizedClientLink
              href="/"
              className="flex items-center gap-x-3 font-display text-2xl uppercase tracking-[0.25em] text-ui-fg-subtle hover:text-ui-fg-base"
            >
              <Bear height={22} />
              KeBe
            </LocalizedClientLink>
          </div>
          <div className="text-small-regular gap-10 md:gap-x-16 grid grid-cols-2 sm:grid-cols-3">
            {productCategories && productCategories?.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus txt-ui-fg-base">
                  Categories
                </span>
                <ul
                  className="grid grid-cols-1 gap-2"
                  data-testid="footer-categories"
                >
                  {productCategories?.slice(0, 6).map((c) => {
                    // "Parts" holds only drafts, and linked to an empty page.
                    if (c.parent_category || !c.products?.length) {
                      return
                    }

                    const children =
                      c.category_children?.map((child) => ({
                        name: child.name,
                        handle: child.handle,
                        id: child.id,
                      })) || null

                    return (
                      <li
                        className="flex flex-col gap-2 text-ui-fg-subtle txt-small"
                        key={c.id}
                      >
                        <LocalizedClientLink
                          className={clx(
                            "hover:text-ui-fg-base",
                            children && "txt-small-plus"
                          )}
                          href={`/categories/${c.handle}`}
                          data-testid="category-link"
                        >
                          {c.name}
                        </LocalizedClientLink>
                        {children && (
                          <ul className="grid grid-cols-1 ml-3 gap-2">
                            {children &&
                              children.map((child) => (
                                <li key={child.id}>
                                  <LocalizedClientLink
                                    className="hover:text-ui-fg-base"
                                    href={`/categories/${child.handle}`}
                                    data-testid="category-link"
                                  >
                                    {child.name}
                                  </LocalizedClientLink>
                                </li>
                              ))}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            {collections && collections.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus txt-ui-fg-base">
                  Collections
                </span>
                <ul
                  className={clx(
                    "grid grid-cols-1 gap-2 text-ui-fg-subtle txt-small",
                    {
                      "grid-cols-2": (collections?.length || 0) > 3,
                    }
                  )}
                >
                  {collections?.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <LocalizedClientLink
                        className="hover:text-ui-fg-base"
                        href={`/collections/${c.handle}`}
                      >
                        {c.title}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="flex w-full flex-col gap-y-2 mb-16 small:flex-row small:justify-between text-ui-fg-muted">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Text className="txt-compact-small">
              © {new Date().getFullYear()} KeBe. All rights reserved.
            </Text>
            <LocalizedClientLink
              href="/privacy"
              className="txt-compact-small hover:text-ui-fg-base"
            >
              Privacy
            </LocalizedClientLink>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="txt-compact-small hover:text-ui-fg-base"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
          <Text className="txt-compact-small">
            Designed and Assembled in Canada
          </Text>
        </div>
      </div>
    </footer>
  )
}
