import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { formatOrder, loadOrder, sendOrderMail } from "../subscribers/order-placed-email";

// Sends one order email marked [TEST] to the support inboxes, so the
// order-placed-email subscriber and the Worker behind it can be checked
// without placing an order. Uses the newest real order if there is one,
// otherwise a made-up order.
//
//   medusa exec ./src/scripts/test-order-mail.ts

export default async function testOrderMail({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "created_at"],
  });
  const newest: any = [...orders].sort((a: any, b: any) =>
    String(b.created_at).localeCompare(String(a.created_at))
  )[0];

  const order = newest
    ? await loadOrder(container, newest.id)
    : {
        id: "order_TEST",
        display_id: 0,
        email: undefined,
        currency_code: "cad",
        created_at: new Date().toISOString(),
        metadata: {
          utm_source: "meta",
          utm_medium: "paid_social",
          utm_campaign: "kebe-v2-preorder-ca",
          utm_landing: "/ca/products/kebe-v2-keyboard",
          utm_at: new Date().toISOString(),
        },
        items: [
          {
            product_title: "KeBe v2 — 68-Key Ortholinear Keyboard with USB Hub",
            variant_title: "Black",
            variant_sku: "KEBE-V2-BLK-SHINE",
            quantity: 1,
            unit_price: 349,
          },
        ],
        shipping_methods: [{ name: "Canada Post Expedited Parcel", amount: 20 }],
        shipping_address: {
          first_name: "Test",
          last_name: "Order",
          address_1: "(not a real order)",
          city: "Vancouver",
          province: "BC",
          postal_code: "V5K 0A1",
          country_code: "ca",
        },
      };

  const mail = formatOrder(order);
  const result = await sendOrderMail({
    ...mail,
    subject: `[TEST] ${mail.subject}`,
    text: `This is a test of the order emails${newest ? ", using the newest real order" : ", with a made-up order"}.\n\n${mail.text}`,
    replyTo: undefined,
  });
  logger.info(`Test order email sent: ${result}`);
}
