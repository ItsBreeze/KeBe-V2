import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

// Emails every new order to the shop's support inboxes (owner, 4 Oct 2026):
// what was bought, the total, where it ships, and which ad brought it (the
// utm_* tags the storefront saves on the cart, copied into order metadata).
// Sent through the Cloudflare Worker in workers/order-mail, which delivers to
// the addresses support@grounders.app forwards to. Reply-To is the customer.
//
// Needs two variables on this service:
//   ORDER_MAIL_URL     https://kebe-order-mail.brisebyme.workers.dev
//   ORDER_MAIL_SECRET  the same value as the Worker's ORDER_MAIL_SECRET
//
// Without them it logs a warning and does nothing; a failed send is logged
// and never fails the order.

const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "currency_code",
  "created_at",
  "metadata",
  "items.title",
  "items.product_title",
  "items.variant_title",
  "items.variant_sku",
  "items.quantity",
  "items.unit_price",
  "shipping_methods.name",
  "shipping_methods.amount",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.company",
  "shipping_address.address_1",
  "shipping_address.address_2",
  "shipping_address.city",
  "shipping_address.province",
  "shipping_address.postal_code",
  "shipping_address.country_code",
  "shipping_address.phone",
];

// query.graph can hand back a BigNumber for an amount
const num = (v: any): number =>
  v !== null && typeof v === "object" ? Number(v.numeric ?? v.value ?? v) : Number(v ?? 0);

export const formatOrder = (order: any) => {
  const cur = String(order.currency_code ?? "").toUpperCase();
  const money = (n: number) => `${cur} ${n.toFixed(2)}`;
  const items = (order.items ?? []) as any[];
  const shipping = (order.shipping_methods ?? []) as any[];
  const itemsTotal = items.reduce((s, i) => s + num(i.unit_price) * num(i.quantity), 0);
  const shipTotal = shipping.reduce((s, m) => s + num(m.amount), 0);
  const total = itemsTotal + shipTotal;

  const a = order.shipping_address ?? {};
  // The storefront stores the province as its lowercase ISO 3166-2 code
  // ("ca-on"), the form Medusa's tax regions match. A label wants "ON".
  // Anything else (an older free-text "Ontario") prints as it was typed.
  const province = /^[a-z]{2}-[a-z0-9]+$/i.test(a.province ?? "")
    ? a.province.split("-")[1].toUpperCase()
    : a.province;
  const address = [
    [a.first_name, a.last_name].filter(Boolean).join(" "),
    a.company,
    a.address_1,
    a.address_2,
    [a.city, province, a.postal_code].filter(Boolean).join(", "),
    String(a.country_code ?? "").toUpperCase(),
    a.phone ? `Phone: ${a.phone}` : "",
  ].filter(Boolean);

  const m = order.metadata ?? {};
  const tags = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]
    .filter((k) => m[k])
    .map((k) => `${k.slice(4)}=${m[k]}`);
  const source = tags.length
    ? `${tags.join(", ")} (landed on ${m.utm_landing ?? "?"}, ${String(m.utm_at ?? "").slice(0, 10)})`
    : m.fbclid
    ? `a Facebook/Instagram link with no utm tags (landed on ${m.utm_landing ?? "?"})`
    : "no ad tags (direct, organic, or an untagged link)";

  const count = items.reduce((s, i) => s + num(i.quantity), 0);
  const subject =
    `New KeBe order #${order.display_id}: ${count} × ${items[0]?.product_title ?? items[0]?.title ?? "item"}, ${money(total)}` +
    (m.utm_source ? ` (${m.utm_source})` : "");

  const admin = process.env.MEDUSA_BACKEND_URL
    ? `${process.env.MEDUSA_BACKEND_URL.replace(/\/$/, "")}/app/orders/${order.id}`
    : "";

  const text = [
    `Order #${order.display_id}, placed ${new Date(order.created_at ?? Date.now()).toUTCString()}`,
    "",
    ...items.map(
      (i) =>
        `${num(i.quantity)} × ${i.product_title ?? i.title}${i.variant_title ? ` (${i.variant_title})` : ""}` +
        `${i.variant_sku ? ` [${i.variant_sku}]` : ""}: ${money(num(i.unit_price) * num(i.quantity))}`
    ),
    ...shipping.map((s) => `Shipping, ${s.name}: ${money(num(s.amount))}`),
    `Total: ${money(total)}`,
    "",
    "Ship to:",
    ...address.map((l) => `  ${l}`),
    `Customer email: ${order.email ?? "?"}`,
    "",
    `Came from: ${source}`,
    ...(admin ? ["", `In Admin: ${admin}`] : []),
    "",
    "Reply to this email to write to the customer.",
  ].join("\n");

  return { subject, text, replyTo: order.email as string | undefined };
};

export const sendOrderMail = async (mail: { subject: string; text: string; replyTo?: string }) => {
  const url = process.env.ORDER_MAIL_URL;
  const secret = process.env.ORDER_MAIL_SECRET;
  if (!url || !secret) throw new Error("ORDER_MAIL_URL or ORDER_MAIL_SECRET is not set on medusa-backend");
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify(mail),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`order mail returned ${res.status}: ${body.slice(0, 200)}`);
  return body;
};

export const loadOrder = async (container: any, id: string) => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({ entity: "order", fields: ORDER_FIELDS, filters: { id } });
  return data[0];
};

export default async function orderPlacedEmail({ event, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger");
  try {
    const order = await loadOrder(container, event.data.id);
    if (!order) throw new Error(`order ${event.data.id} not found`);
    await sendOrderMail(formatOrder(order));
    logger.info(`Order #${order.display_id} emailed to the support inboxes.`);
  } catch (e) {
    logger.warn(`Order email for ${event.data.id} failed: ${e}`);
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
