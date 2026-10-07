// The FCC notice for US orders (6 Oct 2026). KeBe v2 is a Class B digital
// device under FCC Part 15, and its Supplier's Declaration of Conformity
// (SDoC) is not done yet. Until it is, 47 CFR 2.803(c)(2)(i) (renumbered
// (d)(2)(i) on 13 Oct 2026) lets the board be advertised and pre-ordered in
// the US only as a conditional sale, with a prominent notice of three things
// at the time of marketing: delivery waits on the authorization, the FCC's
// rules do not address other law, and what the buyer is owed if it is not
// completed. No board may be delivered to a US buyer before it is.
//
// The one switch: set this to false once the SDoC is complete, and the
// notice leaves every page that shows it (components/fcc-notice).
export const FCC_SDOC_PENDING = true

// Whether a page or an order for this country carries the notice: the US
// only. Canada's rules (ICES-003) have no such notice to give, so /ca shows
// nothing, and a /ca cart cannot ship to a US address (the CA region holds
// Canada only).
export const fccNoticeApplies = (countryCode?: string | null) =>
  FCC_SDOC_PENDING && countryCode?.toLowerCase() === "us"
