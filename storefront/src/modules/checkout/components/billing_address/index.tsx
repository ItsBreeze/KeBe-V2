import { HttpTypes } from "@medusajs/types"
import {
  SUBDIVISIONS,
  addressLabels,
  formSubdivision,
} from "@lib/util/subdivisions"
import Input from "@modules/common/components/input"
import NativeSelect from "@modules/common/components/native-select"
import React, { useState } from "react"
import CountrySelect from "../country-select"

const BillingAddress = ({ cart }: { cart: HttpTypes.StoreCart | null }) => {
  // As in the shipping form: a region with one country has nothing to pick.
  const onlyCountry =
    cart?.region?.countries?.length === 1
      ? cart.region.countries[0]
      : undefined
  const initialCountry =
    onlyCountry?.iso_2 || cart?.billing_address?.country_code || ""

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
        {onlyCountry ? (
          <p
            className="xsmall:col-span-2 txt-medium text-ui-fg-subtle"
            data-testid="billing-country"
          >
            Country: {onlyCountry.display_name}
            <input
              type="hidden"
              name="billing_address.country_code"
              value={onlyCountry.iso_2 ?? ""}
            />
          </p>
        ) : (
          <div className="xsmall:col-span-2">
            <CountrySelect
              name="billing_address.country_code"
              autoComplete="billing country"
              region={cart?.region}
              value={formData["billing_address.country_code"]}
              onChange={handleChange}
              required
              data-testid="billing-country-select"
            />
          </div>
        )}
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
