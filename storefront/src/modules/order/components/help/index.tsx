import { CONTACT_EMAIL } from "@lib/constants"
import { Heading } from "@medusajs/ui"
import React from "react"

// The support address is the one way to reach KeBe about an order (6 Oct
// 2026). The starter's Contact and Returns & Exchanges links went to
// /contact, which does not exist, and there is no returns policy to link to.
const Help = () => {
  return (
    <div className="mt-6">
      <Heading className="text-base-semi">Need help?</Heading>
      <p className="text-base-regular my-2">
        Questions about your order:{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="underline underline-offset-4"
          data-testid="order-help-email"
        >
          {CONTACT_EMAIL}
        </a>
      </p>
    </div>
  )
}

export default Help
