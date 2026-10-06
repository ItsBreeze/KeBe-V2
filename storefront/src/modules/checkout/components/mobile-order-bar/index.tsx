import { convertToLocale } from "@lib/util/money"
import { cartItemsLabel } from "@lib/util/presale"
import { HttpTypes } from "@medusajs/types"
import CartTotals from "@modules/common/components/cart-totals"
import ChevronDown from "@modules/common/icons/chevron-down"

// What is being bought, at the top of checkout on a phone (6 Oct 2026). The
// order summary only sits beside the form from the small breakpoint (1024px);
// below it, it came after the whole form, so a phone reached Place order
// without having seen the item or the total. This line says both, with
// "plus shipping" until a shipping method is chosen and the shipping in the
// sum after. It is a native <details>, so it opens before the page's scripts
// load, onto the same totals as the summary. shipLine is the product's line
// in force now (the caller reads it from the product, never from the cart
// line, which keeps the line from when the board was added).
export default function MobileOrderBar({
  cart,
  shipLine,
}: {
  cart: HttpTypes.StoreCart
  shipLine: string | null
}) {
  const items = cart.items ?? []
  const money = (amount?: number | null) =>
    convertToLocale({ amount: amount ?? 0, currency_code: cart.currency_code })

  // "KeBe v2 pre-order", as the Review step says it.
  const what = cartItemsLabel(items)

  // Taxes join the sum only when the cart has them, so it still adds up.
  const sum = cart.shipping_methods?.length
    ? [
        `+ ${money(cart.shipping_subtotal)} shipping`,
        cart.tax_total ? `+ ${money(cart.tax_total)} taxes` : "",
        `= ${money(cart.total)}`,
      ]
        .filter(Boolean)
        .join(" ")
    : "plus shipping"

  return (
    <details
      className="group small:hidden mb-8 border border-ui-border-base rounded-rounded bg-ui-bg-subtle"
      data-testid="mobile-order-bar"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-x-4 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex flex-col gap-y-1">
          <span
            className="txt-medium-plus text-ui-fg-base"
            data-testid="mobile-order-bar-line"
          >
            {what} · {money(cart.item_subtotal)} {sum}
          </span>
          {shipLine && (
            <span className="txt-compact-small text-ui-fg-muted">
              {shipLine}
            </span>
          )}
        </span>
        <ChevronDown
          className="mt-0.5 shrink-0 transition-transform group-open:rotate-180"
          size={20}
          aria-hidden
        />
      </summary>
      <div className="px-4 pb-4">
        <CartTotals totals={cart} />
      </div>
    </details>
  )
}
