// Provinces and states for the checkout's address forms (6 Oct 2026). Values
// are lowercase ISO 3166-2 codes ("ca-on", "us-ny"), labels the full names.
// Medusa's tax module looks a rate up by the address's province as its
// province_code, and Admin creates province tax regions as "ca-on". A cart
// that stored "ON" or "Ontario" would silently miss any GST/HST or state rate
// added later, so the form only offers the codes Admin uses.
export type Subdivision = { value: string; label: string }

export const SUBDIVISIONS: Record<string, Subdivision[]> = {
  // The 10 provinces and 3 territories.
  ca: [
    { value: "ca-ab", label: "Alberta" },
    { value: "ca-bc", label: "British Columbia" },
    { value: "ca-mb", label: "Manitoba" },
    { value: "ca-nb", label: "New Brunswick" },
    { value: "ca-nl", label: "Newfoundland and Labrador" },
    { value: "ca-nt", label: "Northwest Territories" },
    { value: "ca-ns", label: "Nova Scotia" },
    { value: "ca-nu", label: "Nunavut" },
    { value: "ca-on", label: "Ontario" },
    { value: "ca-pe", label: "Prince Edward Island" },
    { value: "ca-qc", label: "Quebec" },
    { value: "ca-sk", label: "Saskatchewan" },
    { value: "ca-yt", label: "Yukon" },
  ],
  // The 50 states and the District of Columbia.
  us: [
    { value: "us-al", label: "Alabama" },
    { value: "us-ak", label: "Alaska" },
    { value: "us-az", label: "Arizona" },
    { value: "us-ar", label: "Arkansas" },
    { value: "us-ca", label: "California" },
    { value: "us-co", label: "Colorado" },
    { value: "us-ct", label: "Connecticut" },
    { value: "us-de", label: "Delaware" },
    { value: "us-dc", label: "District of Columbia" },
    { value: "us-fl", label: "Florida" },
    { value: "us-ga", label: "Georgia" },
    { value: "us-hi", label: "Hawaii" },
    { value: "us-id", label: "Idaho" },
    { value: "us-il", label: "Illinois" },
    { value: "us-in", label: "Indiana" },
    { value: "us-ia", label: "Iowa" },
    { value: "us-ks", label: "Kansas" },
    { value: "us-ky", label: "Kentucky" },
    { value: "us-la", label: "Louisiana" },
    { value: "us-me", label: "Maine" },
    { value: "us-md", label: "Maryland" },
    { value: "us-ma", label: "Massachusetts" },
    { value: "us-mi", label: "Michigan" },
    { value: "us-mn", label: "Minnesota" },
    { value: "us-ms", label: "Mississippi" },
    { value: "us-mo", label: "Missouri" },
    { value: "us-mt", label: "Montana" },
    { value: "us-ne", label: "Nebraska" },
    { value: "us-nv", label: "Nevada" },
    { value: "us-nh", label: "New Hampshire" },
    { value: "us-nj", label: "New Jersey" },
    { value: "us-nm", label: "New Mexico" },
    { value: "us-ny", label: "New York" },
    { value: "us-nc", label: "North Carolina" },
    { value: "us-nd", label: "North Dakota" },
    { value: "us-oh", label: "Ohio" },
    { value: "us-ok", label: "Oklahoma" },
    { value: "us-or", label: "Oregon" },
    { value: "us-pa", label: "Pennsylvania" },
    { value: "us-ri", label: "Rhode Island" },
    { value: "us-sc", label: "South Carolina" },
    { value: "us-sd", label: "South Dakota" },
    { value: "us-tn", label: "Tennessee" },
    { value: "us-tx", label: "Texas" },
    { value: "us-ut", label: "Utah" },
    { value: "us-vt", label: "Vermont" },
    { value: "us-va", label: "Virginia" },
    { value: "us-wa", label: "Washington" },
    { value: "us-wv", label: "West Virginia" },
    { value: "us-wi", label: "Wisconsin" },
    { value: "us-wy", label: "Wyoming" },
  ],
}

// The form's value for a stored province: the same code when this country's
// list has it, otherwise "". A cart or saved address from before this list
// holds free text ("Ontario"), so the select shows empty and asks for a
// choice. A country without a list keeps whatever was typed.
export const formSubdivision = (
  countryCode: string | null | undefined,
  province: string | null | undefined
): string => {
  const list = countryCode ? SUBDIVISIONS[countryCode.toLowerCase()] : undefined
  if (!list) {
    return province ?? ""
  }
  return list.some((s) => s.value === province) ? province ?? "" : ""
}

// The two-letter code inside a stored value ("ca-on" is "ON"), where the short
// form is wanted: the card's billing state sent to Stripe.
export const subdivisionCode = (
  province: string | null | undefined
): string | undefined => province?.split("-")[1]?.toUpperCase()

// The address form's words for this country: Province and Postal code in
// Canada, State and ZIP code in the United States.
export const addressLabels = (countryCode: string | null | undefined) =>
  countryCode?.toLowerCase() === "us"
    ? { subdivision: "State", postal: "ZIP code" }
    : { subdivision: "Province", postal: "Postal code" }
