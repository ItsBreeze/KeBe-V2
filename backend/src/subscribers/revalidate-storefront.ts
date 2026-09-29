import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";

// Tells the storefront to drop its cached catalog pages whenever a product
// changes or stock moves, so an edit in Admin -- or a presale selling out, or
// a cancelled order giving its board back -- appears without a redeploy.
//
// Needs two variables on this service:
//   STOREFRONT_URL     e.g. https://kebe.grounders.app
//   REVALIDATE_SECRET  the same value set on the storefront service
//
// Both missing is the normal state in local development; the subscriber then
// does nothing rather than failing the event.

export default async function revalidateStorefront({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger");

  const base = process.env.STOREFRONT_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!base || !secret) {
    return;
  }

  const url = `${base.replace(/\/$/, "")}/api/revalidate?secret=${encodeURIComponent(
    secret
  )}`;

  try {
    const res = await fetch(url, { method: "POST" });
    if (!res.ok) {
      logger.warn(
        `Storefront revalidation returned ${res.status} after ${event.name}`
      );
      return;
    }
    logger.info(`Storefront revalidated after ${event.name}`);
  } catch (e) {
    // A storefront that is redeploying should not turn a successful product
    // save into a failed event.
    logger.warn(`Storefront revalidation failed after ${event.name}: ${e}`);
  }
}

export const config: SubscriberConfig = {
  event: [
    "product.created",
    "product.updated",
    "product.deleted",
    "product-variant.created",
    "product-variant.updated",
    "product-variant.deleted",
    // An order reserves stock without touching the product, so without this a
    // presale that has sold its last board keeps showing "Pre-order".
    "order.placed",
    // ...and cancelling one, or setting stock in Admin, gives boards back
    // without touching the product either.
    "order.canceled",
    "reservation-item.deleted",
    "inventory-level.created",
    "inventory-level.updated",
  ],
};
