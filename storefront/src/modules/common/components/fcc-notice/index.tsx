import LocalizedClientLink from "@modules/common/components/localized-client-link"

type FccNoticeProps = {
  // The names of the boards it is for (lib/util/fcc.ts fccNoticeBoards):
  // with none, nothing renders.
  boards: string[]
  // false on the terms page itself, where the pre-order terms are the page.
  termsLink?: boolean
  // false where a heading already says "FCC notice for US orders".
  lead?: boolean
  className?: string
  // null where the page gives its own section the id (the terms).
  id?: string | null
}

// The FCC notice for US orders, the same words wherever it shows; which
// boards it names, and whether it shows, is lib/util/fcc.ts's to say. The
// text is the compliance pack's (Compliance/store-disclosure.md 2.1) with
// the owner's sentence for a failed authorization (7 Oct 2026): notices (1),
// (2) and (3) of 47 CFR 2.803(c)(2)(i)(A) are its first two, third, and last
// two sentences. A notice for more than one board says so in the plural.
// Body-size type, never folded into a tab, so it is as easy to read as the
// price and the button it sits under.
export default function FccNotice({
  boards,
  termsLink = true,
  lead = true,
  className,
  id = "fcc-notice",
}: FccNoticeProps) {
  if (!boards.length) {
    return null
  }

  const one = boards.length === 1
  const names = one
    ? boards[0]
    : `${boards.slice(0, -1).join(", ")} and ${boards[boards.length - 1]}`

  return (
    <p id={id ?? undefined} className={className} data-testid="fcc-notice">
      {lead && (
        <>
          <strong className="font-medium text-ui-fg-base">
            FCC notice for US orders.
          </strong>{" "}
        </>
      )}
      {one
        ? `${names} is subject to the rules of the US Federal Communications Commission (FCC), and its FCC equipment authorization is not yet complete. Delivery to you is conditional on ${names} successfully completing that authorization: no board ships to a US address before it does.`
        : `${names} are subject to the rules of the US Federal Communications Commission (FCC), and their FCC equipment authorizations are not yet complete. Delivery to you is conditional on each board successfully completing its authorization: no board ships to a US address before its own does.`}{" "}
      The FCC&apos;s rules do not address the applicability of consumer
      protection, contractual, or other provisions under federal or state law.{" "}
      {one
        ? "If the authorization is not completed, we cancel your order and refund it in full."
        : "If a board's authorization is not completed, we cancel your order and refund it in full."}{" "}
      You can cancel any time before your board ships for a full refund within 5
      business days
      {termsLink && (
        <>
          {" "}
          (see our{" "}
          <LocalizedClientLink
            href="/terms"
            className="underline underline-offset-4 hover:text-ui-fg-base"
          >
            pre-order terms
          </LocalizedClientLink>
          )
        </>
      )}
      .
    </p>
  )
}
