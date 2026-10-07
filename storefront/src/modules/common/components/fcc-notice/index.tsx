import LocalizedClientLink from "@modules/common/components/localized-client-link"

type FccNoticeProps = {
  // false on the terms page itself, where "our pre-order terms" is the page.
  termsLink?: boolean
  // false where a heading already says "FCC notice for US orders".
  lead?: boolean
  className?: string
}

// The FCC notice for US orders, the same words wherever it shows (6 Oct
// 2026); whether it shows is lib/util/fcc.ts's to say. Notices (1), (2) and
// (3) of 47 CFR 2.803(c)(2)(i)(A) are its second and third, fourth, and last
// sentences. The last restates the pre-order terms' cancel promise for the
// case where the authorization is not completed, and nothing more: the
// 30-day late-delivery sentence is left out, and no new refund promise is
// made here. Body-size type, never folded into a tab, so it is as easy to
// read as the price and the button it sits under.
export default function FccNotice({
  termsLink = true,
  lead = true,
  className,
}: FccNoticeProps) {
  const terms = termsLink ? (
    <LocalizedClientLink
      href="/terms"
      className="underline underline-offset-4 hover:text-ui-fg-base"
    >
      pre-order terms
    </LocalizedClientLink>
  ) : (
    "pre-order terms"
  )

  return (
    <p id="fcc-notice" className={className} data-testid="fcc-notice">
      {lead && (
        <>
          <strong className="font-medium text-ui-fg-base">
            FCC notice for US orders.
          </strong>{" "}
        </>
      )}
      KeBe v2 is subject to the rules of the US Federal Communications
      Commission (FCC), and its FCC equipment authorization is not yet complete.
      Delivery to you is conditional on KeBe v2 successfully completing that
      authorization: no board ships to a US address before it does. The
      FCC&apos;s rules do not address the applicability of consumer protection,
      contractual, or other provisions under federal or state law. If the
      authorization is not completed, your board does not ship to you, and our{" "}
      {terms} apply: cancel any time before your board ships for a full refund
      within 5 business days.
    </p>
  )
}
