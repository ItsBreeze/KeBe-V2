import { CONTACT_EMAIL } from "@lib/constants"
import { holdsPresaleBoard } from "@lib/util/presale"
import { Heading } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import React from "react"

// The support address is the one way to reach KeBe about an order (6 Oct
// 2026). The starter's Contact and Returns & Exchanges links went to
// /contact, which did not exist then. A pre-order of the presale board also
// says how to cancel, in the pre-order terms' words, and links to them.
const Help = ({ order }: { order: HttpTypes.StoreOrder }) => {
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
      {holdsPresaleBoard(order.items) && (
        <p className="text-base-regular my-2" data-testid="order-help-cancel">
          Changed your mind? Email{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          with your order number before it ships.{" "}
          <LocalizedClientLink
            href="/terms"
            className="underline underline-offset-4"
          >
            Pre-order terms
          </LocalizedClientLink>
        </p>
      )}
    </div>
  )
}

export default Help
