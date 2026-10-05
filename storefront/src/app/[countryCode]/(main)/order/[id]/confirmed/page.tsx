import { retrieveOrder } from "@lib/data/orders"
import PixelEvent from "@modules/common/components/meta-pixel/pixel-event"
import OrderCompletedTemplate from "@modules/order/templates/order-completed-template"
import { Metadata } from "next"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
}
export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "You purchase was successful",
}

export default async function OrderConfirmedPage(props: Props) {
  const params = await props.params
  const order = await retrieveOrder(params.id).catch(() => null)

  if (!order) {
    return notFound()
  }

  // The conversion the ads optimise for. The order id is the event id, and the
  // event goes once per browser, so a reload is not a second sale.
  const items = order.items ?? []
  return (
    <>
      <PixelEvent
        event="Purchase"
        params={{
          value: order.total,
          currency: order.currency_code.toUpperCase(),
          content_ids: items.map((i) => i.product_id).filter(Boolean),
          content_type: "product",
          num_items: items.reduce((n, i) => n + i.quantity, 0),
        }}
        eventID={order.id}
        once={`kebe_px_purchase_${order.id}`}
      />
      <OrderCompletedTemplate order={order} />
    </>
  )
}
