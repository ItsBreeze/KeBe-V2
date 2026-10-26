import { Metadata } from "next"

import { PRIVATE_PAGE_ROBOTS } from "@lib/util/seo"

// Order confirmations and transfer requests belong to one buyer each.
export const metadata: Metadata = {
  robots: PRIVATE_PAGE_ROBOTS,
}

export default function OrderLayout(props: { children: React.ReactNode }) {
  return props.children
}
