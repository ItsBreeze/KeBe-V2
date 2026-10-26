// The late-shipment term, per country (owner, 7 Oct 2026). Canada keeps the
// term of 6 Oct 2026, which mirrors Alberta's right to cancel an internet sale
// delivered more than 30 days late. US buyers get the FTC Mail Order Rule's
// (16 CFR 435.2): told before the shown date, with a new date and the choice
// to cancel. The terms page and the product page's pre-order answers both
// read it from here, so the two never differ.
export const lateTerm = (countryCode: string | null | undefined) =>
  countryCode?.toLowerCase() === "us"
    ? "Your board is built and shipped in the order received. If we can't ship it within 30 days of your order, we email you before then with a new shipping date, and you can cancel for a full refund."
    : "Your board is built and shipped in the order received. If it hasn't shipped 30 days after you ordered, we email you and you choose a full refund or keep waiting."
