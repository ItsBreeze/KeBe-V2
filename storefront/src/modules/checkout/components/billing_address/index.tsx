import { HttpTypes } from "@medusajs/types"
import {
  SUBDIVISIONS,
  addressLabels,
  formSubdivision,
} from "@lib/util/subdivisions"
import Input from "@modules/common/components/input"
import NativeSelect from "@modules/common/components/native-select"
import React, { useState } from "react"

// The billing address is the card's, and a card can be billed in the other
// country from the one the board ships to: a US card on the Canadian store
// (6 Oct 2026). Medusa checks only the shipping address against the region,
// so billing offers both countries the form has provinces and states for,
// and any other country of the region.
const BILLING_COUNTRIES = [
  { value: "ca", label: "Canada" },
  { value: "us", label: "United States" },
]

const BillingAddress = ({ cart }: { cart: HttpTypes.StoreCart | null }) => {
  const countries = [
    ...BILLING_COUNTRIES,
    ...(cart?.region?.countries ?? [])
      .filter(
        (c) => c.iso_2 && !BILLING_COUNTRIES.some((b) => b.value === c.iso_2)
      )
      .map((c) => ({ value: c.iso_2!, label: c.display_name ?? c.iso_2! })),
  ]
  // The cart's billing country when the list has it, otherwise the region's
  // own country, as in the shipping form.
  const storedCountry = cart?.billing_address?.country_code
  const regionCountry =
    cart?.region?.countries?.length === 1
      ? cart.region.countries[0].iso_2
      : undefined
  const initialCountry =
    (storedCountry && countries.some((c) => c.value === storedCountry)
      ? storedCountry
      : regionCountry) || ""

  const [formData, setFormData] = useState<any>({
    "billing_address.first_name": cart?.billing_address?.first_name || "",
    "billing_address.last_name": cart?.billing_address?.last_name || "",
    "billing_address.address_1": cart?.billing_address?.address_1 || "",
    "billing_address.address_2": cart?.billing_address?.address_2 || "",
    "billing_address.city": cart?.billing_address?.city || "",
    "billing_address.province": formSubdivision(
      initialCountry,
      cart?.billing_address?.province
    ),
    "billing_address.postal_code": cart?.billing_address?.postal_code || "",
    "billing_address.country_code": initialCountry,
    "billing_address.phone": cart?.billing_address?.phone || "",
  })

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLInputElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
      // Another country's provinces are not this one's.
      ...(e.target.name === "billing_address.country_code" && {
        "billing_address.province": formSubdivision(
          e.target.value,
          formData["billing_address.province"]
        ),
      }),
    })
  }

  const country = formData["billing_address.country_code"]
  const labels = addressLabels(country)
  const subdivisions = SUBDIVISIONS[country]

  return (
    <>
      <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-4">
        <div className="xsmall:col-span-2">
          <NativeSelect
            name="billing_address.country_code"
            autoComplete="billing country"
            placeholder="Country"
            aria-label="Country"
            value={country}
            onChange={handleChange}
            required
            data-testid="billing-country-select"
          >
            {countries.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Input
          label="First name"
          name="billing_address.first_name"
          autoComplete="billing given-name"
          value={formData["billing_address.first_name"]}
          onChange={handleChange}
          required
          data-testid="billing-first-name-input"
        />
        <Input
          label="Last name"
          name="billing_address.last_name"
          autoComplete="billing family-name"
          value={formData["billing_address.last_name"]}
          onChange={handleChange}
          required
          data-testid="billing-last-name-input"
        />
        <div className="grid grid-cols-1 gap-4 xsmall:col-span-2">
          <Input
            label="Address"
            name="billing_address.address_1"
            autoComplete="billing address-line1"
            value={formData["billing_address.address_1"]}
            onChange={handleChange}
            required
            data-testid="billing-address-input"
          />
          <Input
            label="Apartment, suite, unit (optional)"
            name="billing_address.address_2"
            autoComplete="billing address-line2"
            value={formData["billing_address.address_2"]}
            onChange={handleChange}
            data-testid="billing-address-2-input"
          />
        </div>
        <Input
          label="City"
          name="billing_address.city"
          autoComplete="billing address-level2"
          value={formData["billing_address.city"]}
          onChange={handleChange}
        />
        {subdivisions ? (
          <NativeSelect
            name="billing_address.province"
            autoComplete="billing address-level1"
            placeholder={labels.subdivision}
            aria-label={labels.subdivision}
            value={formData["billing_address.province"]}
            onChange={handleChange}
            required
            data-testid="billing-province-select"
          >
            {subdivisions.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        ) : (
          <Input
            label="State / Province"
            name="billing_address.province"
            autoComplete="billing address-level1"
            value={formData["billing_address.province"]}
            onChange={handleChange}
            data-testid="billing-province-input"
          />
        )}
        <Input
          label={labels.postal}
          name="billing_address.postal_code"
          autoComplete="billing postal-code"
          autoCapitalize={country === "us" ? undefined : "characters"}
          inputMode={country === "us" ? "numeric" : undefined}
          value={formData["billing_address.postal_code"]}
          onChange={handleChange}
          required
          data-testid="billing-postal-input"
        />
        <Input
          label="Phone"
          name="billing_address.phone"
          type="tel"
          inputMode="tel"
          autoComplete="billing tel"
          value={formData["billing_address.phone"]}
          onChange={handleChange}
          data-testid="billing-phone-input"
        />
      </div>
    </>
  )
}

export default BillingAddress
