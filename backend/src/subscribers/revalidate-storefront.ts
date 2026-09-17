import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";

// Tells the storefront to drop its cached catalog pages whenever a product
// changes, so an edit in Admin appears on the site without a redeploy.
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
  ],
};
