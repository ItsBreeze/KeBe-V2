import { Metadata } from "next"

import { retrieveCustomer } from "@lib/data/customer"
import { PRIVATE_PAGE_ROBOTS } from "@lib/util/seo"
import { Toaster } from "@medusajs/ui"
import AccountLayout from "@modules/account/templates/account-layout"

export const metadata: Metadata = {
  robots: PRIVATE_PAGE_ROBOTS,
}

export default async function AccountPageLayout({
  dashboard,
  login,
}: {
  dashboard?: React.ReactNode
  login?: React.ReactNode
}) {
  const customer = await retrieveCustomer().catch(() => null)

  return (
    <AccountLayout customer={customer}>
      {customer ? dashboard : login}
      <Toaster />
    </AccountLayout>
  )
}
