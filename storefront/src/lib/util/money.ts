import { isEmpty } from "./isEmpty"

type ConvertToLocaleParams = {
  amount: number
  currency_code: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
}

// A price for display, which says which dollar it is. en-US writes CAD as
// "CA$" but USD as a bare "$", which on a Canadian shop reads as Canadian
// dollars, while the ads say "US$249". So a "$" symbol takes the first two
// letters of the currency code (US$249.00), the rule seo.ts priceForCopy
// applies. The formatted parts are mapped, not the string edited, so the
// rule holds in any locale. Nothing parses this string: the feeds, JSON-LD
// and llms.txt use the raw amounts (6 Oct 2026).
export const convertToLocale = ({
  amount,
  currency_code,
  minimumFractionDigits,
  maximumFractionDigits,
  locale = "en-US",
}: ConvertToLocaleParams) => {
  return currency_code && !isEmpty(currency_code)
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency_code,
        minimumFractionDigits,
        maximumFractionDigits,
      })
        .formatToParts(amount)
        .map((part) =>
          part.type === "currency" && part.value === "$"
            ? `${currency_code.slice(0, 2).toUpperCase()}$`
            : part.value
        )
        .join("")
    : amount.toString()
}
