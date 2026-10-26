import { HttpTypes } from "@medusajs/types"
import { Container } from "@medusajs/ui"
import {
  POSTAL_CODES,
  SUBDIVISIONS,
  addressLabels,
  formSubdivision,
} from "@lib/util/subdivisions"
import Checkbox from "@modules/common/components/checkbox"
import Input from "@modules/common/components/input"
import NativeSelect from "@modules/common/components/native-select"
import { mapKeys } from "lodash"
import React, { useEffect, useMemo, useState } from "react"
import AddressSelect from "../address-select"
import CountrySelect from "../country-select"

// How the line above the address names a region's one country.
const SHIPPING_TO: Record<string, string> = {
  ca: "Canada",
  us: "the United States",
}

const ShippingAddress = ({
  customer,
  cart,
  checked,
  onChange,
}: {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
  checked: boolean
  onChange: () => void
}) => {
  // Each of KeBe's regions has one country, so there is nothing to pick: the
  // form says where it ships and sends that country in a hidden field. A
  // region with more than one country keeps the select.
  const onlyCountry =
    cart?.region?.countries?.length === 1
      ? cart.region.countries[0]
      : undefined
  const countryOf = (address?: HttpTypes.StoreCartAddress | null) =>
    onlyCountry?.iso_2 || address?.country_code || ""

  const [formData, setFormData] = useState<Record<string, any>>({
    email: cart?.email || "",
    "shipping_address.first_name": cart?.shipping_address?.first_name || "",
    "shipping_address.last_name": cart?.shipping_address?.last_name || "",
    "shipping_address.address_1": cart?.shipping_address?.address_1 || "",
    "shipping_address.address_2": cart?.shipping_address?.address_2 || "",
    "shipping_address.city": cart?.shipping_address?.city || "",
    "shipping_address.province": formSubdivision(
      countryOf(cart?.shipping_address),
      cart?.shipping_address?.province
    ),
    "shipping_address.postal_code": cart?.shipping_address?.postal_code || "",
    "shipping_address.country_code": countryOf(cart?.shipping_address),
    "shipping_address.phone": cart?.shipping_address?.phone || "",
  })

  const countriesInRegion = useMemo(
    () => cart?.region?.countries?.map((c) => c.iso_2),
    [cart?.region]
  )

  // check if customer has saved addresses that are in the current region
  const addressesInRegion = useMemo(
    () =>
      customer?.addresses.filter(
        (a) => a.country_code && countriesInRegion?.includes(a.country_code)
      ),
    [customer?.addresses, countriesInRegion]
  )

  const setFormAddress = (
    address?: HttpTypes.StoreCartAddress,
    email?: string
  ) => {
    address &&
      setFormData((prevState: Record<string, any>) => ({
        ...prevState,
        "shipping_address.first_name": address?.first_name || "",
        "shipping_address.last_name": address?.last_name || "",
        "shipping_address.address_1": address?.address_1 || "",
        "shipping_address.address_2": address?.address_2 || "",
        "shipping_address.city": address?.city || "",
        "shipping_address.province": formSubdivision(
          countryOf(address),
          address?.province
        ),
        "shipping_address.postal_code": address?.postal_code || "",
        "shipping_address.country_code": countryOf(address),
        "shipping_address.phone": address?.phone || "",
      }))

    email &&
      setFormData((prevState: Record<string, any>) => ({
        ...prevState,
        email: email,
      }))
  }

  useEffect(() => {
    // Ensure cart is not null and has a shipping_address before setting form data
    if (cart && cart.shipping_address) {
      setFormAddress(cart?.shipping_address, cart?.email)
    }

    if (cart && !cart.email && customer?.email) {
      setFormAddress(undefined, customer.email)
    }
  }, [cart]) // Add cart as a dependency

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLInputElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
      // Another country's provinces are not this one's.
      ...(e.target.name === "shipping_address.country_code" && {
        "shipping_address.province": formSubdivision(
          e.target.value,
          formData["shipping_address.province"]
        ),
      }),
    })
  }

  const country = formData["shipping_address.country_code"]
  const labels = addressLabels(country)
  const subdivisions = SUBDIVISIONS[country]
  const postal = POSTAL_CODES[country]

  return (
    <>
      {customer && (addressesInRegion?.length || 0) > 0 && (
        <Container className="mb-6 flex flex-col gap-y-4 p-5">
          <p className="text-small-regular">
            {`Hi ${customer.first_name}, do you want to use one of your saved addresses?`}
          </p>
          <AddressSelect
            addresses={customer.addresses}
            addressInput={
              mapKeys(formData, (_, key) =>
                key.replace("shipping_address.", "")
              ) as HttpTypes.StoreCartAddress
            }
            onSelect={setFormAddress}
          />
        </Container>
      )}
      {/* One column on a phone, in the order the fields are filled: email
          first, on its own row, then the address top to bottom. Two columns
          from xsmall (512px), where each field still fits its contents. */}
      <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-4">
        <div className="xsmall:col-span-2">
          <Input
            label="Email"
            name="email"
            type="email"
            title="Enter a valid email address."
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            required
            aria-describedby="shipping-email-help"
            data-testid="shipping-email-input"
          />
          {/* Only what is true: Stripe emails the receipt to this address,
              since the card payment sets receipt_email (6 Oct 2026), and no
              line here promises updates. */}
          <p
            id="shipping-email-help"
            className="mt-1 px-1 txt-compact-small text-ui-fg-muted"
          >
            For your Stripe receipt, and so we can reach you about this order.
          </p>
        </div>
        {onlyCountry ? (
          <p
            className="xsmall:col-span-2 txt-medium text-ui-fg-subtle"
            data-testid="shipping-country"
          >
            Shipping to{" "}
            {SHIPPING_TO[onlyCountry.iso_2 ?? ""] ?? onlyCountry.display_name}
            <input
              type="hidden"
              name="shipping_address.country_code"
              value={onlyCountry.iso_2 ?? ""}
            />
          </p>
        ) : (
          <div className="xsmall:col-span-2">
            <CountrySelect
              name="shipping_address.country_code"
              autoComplete="shipping country"
              region={cart?.region}
              value={formData["shipping_address.country_code"]}
              onChange={handleChange}
              required
              data-testid="shipping-country-select"
            />
          </div>
        )}
        <Input
          label="First name"
          name="shipping_address.first_name"
          autoComplete="shipping given-name"
          value={formData["shipping_address.first_name"]}
          onChange={handleChange}
          required
          data-testid="shipping-first-name-input"
        />
        <Input
          label="Last name"
          name="shipping_address.last_name"
          autoComplete="shipping family-name"
          value={formData["shipping_address.last_name"]}
          onChange={handleChange}
          required
          data-testid="shipping-last-name-input"
        />
        {/* The street lines take the whole row: half a row is too narrow
            for a street address, or for the apartment line's label. */}
        <div className="grid grid-cols-1 gap-4 xsmall:col-span-2">
          <Input
            label="Address"
            name="shipping_address.address_1"
            autoComplete="shipping address-line1"
            value={formData["shipping_address.address_1"]}
            onChange={handleChange}
            required
            data-testid="shipping-address-input"
          />
          <Input
            label="Apartment, suite, unit (optional)"
            name="shipping_address.address_2"
            autoComplete="shipping address-line2"
            value={formData["shipping_address.address_2"]}
            onChange={handleChange}
            data-testid="shipping-address-2-input"
          />
        </div>
        <Input
          label="City"
          name="shipping_address.city"
          autoComplete="shipping address-level2"
          value={formData["shipping_address.city"]}
          onChange={handleChange}
          required
          data-testid="shipping-city-input"
        />
        {subdivisions ? (
          <NativeSelect
            name="shipping_address.province"
            autoComplete="shipping address-level1"
            placeholder={labels.subdivision}
            aria-label={labels.subdivision}
            value={formData["shipping_address.province"]}
            onChange={handleChange}
            required
            data-testid="shipping-province-select"
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
            name="shipping_address.province"
            autoComplete="shipping address-level1"
            value={formData["shipping_address.province"]}
            onChange={handleChange}
            data-testid="shipping-province-input"
          />
        )}
        <Input
          label={labels.postal}
          name="shipping_address.postal_code"
          autoComplete="shipping postal-code"
          autoCapitalize={country === "us" ? undefined : "characters"}
          inputMode={country === "us" ? "numeric" : undefined}
          pattern={postal?.pattern}
          title={postal?.title}
          value={formData["shipping_address.postal_code"]}
          onChange={handleChange}
          required
          data-testid="shipping-postal-code-input"
        />
        <div>
          <Input
            label="Phone"
            name="shipping_address.phone"
            type="tel"
            inputMode="tel"
            autoComplete="shipping tel"
            value={formData["shipping_address.phone"]}
            onChange={handleChange}
            aria-describedby="shipping-phone-help"
            data-testid="shipping-phone-input"
          />
          <p
            id="shipping-phone-help"
            className="mt-1 px-1 txt-compact-small text-ui-fg-muted"
          >
            Optional. Only used about this order.
          </p>
        </div>
      </div>
      <div className="my-8">
        <Checkbox
          label="Billing address same as shipping address"
          name="same_as_billing"
          checked={checked}
          onChange={onChange}
          data-testid="billing-address-checkbox"
        />
      </div>
    </>
  )
}

export default ShippingAddress
