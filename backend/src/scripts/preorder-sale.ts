import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  batchPriceListPricesWorkflow,
  createPriceListsWorkflow,
  updatePriceListsWorkflow,
} from "@medusajs/medusa/core-flows";

// Puts KeBe v2 on its pre-order price: a Medusa "sale" price list over the
// variant's own CA$386.89 (start-presale.ts's PRICE_CAD). The storefront
// charges CA$349 while the list is active (CA$299 until 2 Oct 2026; owner: back to 349 to cover the keycap laser engraving) and calls it the pre-order price
// (lib/util/presale.ts). It never names the price after pre-orders close
// (owner, 30 Sept 2026).
//
//   medusa exec ./src/scripts/preorder-sale.ts
//
// Safe to re-run: it finds the list by title, re-activates it and sets its one
// price. To end the pre-order price, set the list to Draft (or delete it) in
// Admin → Price Lists; the variant's own price takes over with no deploy.
// Also lists the orders already placed for the board, with the unit price each
// paid, so anyone who paid more than the pre-order price can be refunded.

const HANDLE = "kebe-v2-keyboard";
const TITLE = "KeBe v2 pre-order";
const PREORDER_CAD = 349; // plus shipping, calculated at checkout

const revalidateStorefront = async (logger: { info: (m: string) => void; warn: (m: string) => void }) => {
  const base = process.env.STOREFRONT_URL;
  const secret = process.env.REVALIDATE_SECRET;
  const byHand = "POST <storefront>/api/revalidate?secret=<REVALIDATE_SECRET> by hand, or the site keeps its cached price.";
  if (!base || !secret) {
    logger.warn(`STOREFRONT_URL or REVALIDATE_SECRET is not set here: ${byHand}`);
    return;
  }
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/revalidate?secret=${encodeURIComponent(secret)}`, { method: "POST" });
    if (res.ok) logger.info("Storefront revalidated.");
    else logger.warn(`Storefront revalidation returned ${res.status}: ${byHand}`);
  } catch (e) {
    logger.warn(`Storefront revalidation failed (${e}): ${byHand}`);
  }
};

export default async function preorderSale({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["variants.id", "variants.sku"],
    filters: { handle: HANDLE },
  });
  const variant: any = (products[0] as any)?.variants?.[0];
  if (!variant) throw new Error(`${HANDLE} has no variant. Run start-presale.ts first.`);

  const { data: lists } = await query.graph({
    entity: "price_list",
    fields: ["id", "status", "prices.id", "prices.amount", "prices.currency_code", "prices.price_set.variant.id"],
    filters: { title: TITLE },
  });

  if (!lists.length) {
    await createPriceListsWorkflow(container).run({
      input: {
        price_lists_data: [
          {
            title: TITLE,
            description: `KeBe v2 at CA$${PREORDER_CAD} while pre-orders are open.`,
            status: "active",
            type: "sale",
            prices: [{ amount: PREORDER_CAD, currency_code: "cad", variant_id: variant.id }],
          } as any,
        ],
      },
    });
    logger.info(`Created "${TITLE}": ${variant.sku} at CA$${PREORDER_CAD}.`);
  } else {
    const list: any = lists[0];
    if (list.status !== "active") {
      await updatePriceListsWorkflow(container).run({
        input: { price_lists_data: [{ id: list.id, status: "active" }] },
      });
    }
    const mine = (list.prices ?? []).filter(
      (p: any) => p.currency_code === "cad" && p.price_set?.variant?.id === variant.id
    );
    await batchPriceListPricesWorkflow(container).run({
      input: {
        data: {
          id: list.id,
          create: mine.length ? [] : [{ amount: PREORDER_CAD, currency_code: "cad", variant_id: variant.id }],
          update: mine.slice(0, 1).map((p: any) => ({
            id: p.id,
            amount: PREORDER_CAD,
            currency_code: "cad",
            variant_id: variant.id,
          })),
          delete: mine.slice(1).map((p: any) => p.id),
        },
      },
    });
    logger.info(`"${TITLE}" active: ${variant.sku} at CA$${PREORDER_CAD}.`);
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["display_id", "status", "created_at", "items.variant_sku", "items.unit_price", "items.quantity"],
  });
  const placed = orders.filter((o: any) =>
    (o.items ?? []).some((i: any) => i.variant_sku === variant.sku)
  );
  if (!placed.length) {
    logger.info("No orders for the board yet.");
  }
  for (const o of placed as any[]) {
    const line = o.items.find((i: any) => i.variant_sku === variant.sku);
    logger.info(
      `Order #${o.display_id} (${o.status}, ${String(o.created_at).slice(0, 10)}): ${line.quantity} × CA$${line.unit_price}`
    );
  }

  await revalidateStorefront(logger);
}
