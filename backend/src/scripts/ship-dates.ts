import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  updateProductsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows";
import { DESCRIPTION, revalidateStorefront, validDate } from "./start-presale";

// The owner's rule for KeBe v2 (1 Oct 2026): the site never says how many
// boards there are, only when an order placed now ships. While counted boards
// (start-presale.ts's first batch) are unsold it says "Currently shipping
// <ships_by>"; once they are gone the board stays on sale and it says "Ships
// <ships_by_next>". The storefront picks the line (lib/util/presale.ts).
//
//   medusa exec ./src/scripts/ship-dates.ts
//
// It turns backorders on for the variant, so it can still be bought at zero
// stock, and leaves manage_inventory on so the counted boards stay counted.
// It sets ships_by_next unless Admin already holds a real date there, and
// writes the description without a count. It never changes price, stock or
// ships_by. Safe to re-run.
//
// Every order placed after the counted boards are gone is a backorder: a board
// still to be built, promised by ships_by_next. Move either date in Admin →
// Products → KeBe v2 → Metadata; the site follows without a deploy.

const HANDLE = "kebe-v2-keyboard";
const SHIPS_BY_NEXT = "2026-11-30";

export default async function shipDates({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "description",
      "metadata",
      "variants.id",
      "variants.sku",
      "variants.manage_inventory",
      "variants.allow_backorder",
      "variants.inventory_items.inventory.location_levels.stocked_quantity",
      "variants.inventory_items.inventory.location_levels.reserved_quantity",
    ],
    filters: { handle: HANDLE },
  });
  const product: any = products[0];
  const variant: any = product?.variants?.[0];
  if (!variant) throw new Error(`${HANDLE} has no variant. Run start-presale.ts first.`);
  // Backorders on an uncounted variant would make every order one, and the
  // site would never say "Currently shipping".
  if (!variant.manage_inventory) {
    throw new Error(
      `${variant.sku} does not manage inventory, so nothing counts the boards. Turn it on and set the stock in Admin first.`
    );
  }

  if (variant.allow_backorder) {
    logger.info(`${variant.sku} already takes backorders.`);
  } else {
    await updateProductVariantsWorkflow(container).run({
      input: { selector: { id: variant.id }, update: { allow_backorder: true } },
    });
    logger.info(`${variant.sku} now takes backorders: it stays on sale once the counted boards are sold.`);
  }

  const current = product.metadata?.ships_by_next;
  const next = validDate(current) ? current : SHIPS_BY_NEXT;
  if (current !== undefined && current !== next) {
    logger.warn(`ships_by_next "${String(current)}" is not a real date; set to ${SHIPS_BY_NEXT}.`);
  }
  if (product.description !== DESCRIPTION || current !== next) {
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: product.id },
        update: {
          description: DESCRIPTION,
          metadata: { ...(product.metadata ?? {}), ships_by_next: next },
        },
      },
    });
    logger.info(`Description written without a count; ships_by_next is ${next}.`);
  } else {
    logger.info(`Description already has no count; ships_by_next is ${next}.`);
  }

  // For the owner, not the site: what the storefront shows now, and how many
  // orders are boards still to build.
  const levels = (variant.inventory_items ?? []).flatMap(
    (i: any) => i.inventory?.location_levels ?? []
  );
  const stocked = levels.reduce((n: number, l: any) => n + Number(l.stocked_quantity ?? 0), 0);
  const reserved = levels.reduce((n: number, l: any) => n + Number(l.reserved_quantity ?? 0), 0);
  const backorders = Math.max(0, reserved - stocked);
  logger.info(
    `Stock: ${stocked} stocked, ${reserved} reserved by orders not yet shipped` +
      (backorders ? `, so the newest ${backorders} of those orders are backorders to build by ${next}.` : ".")
  );
  logger.info(
    stocked - reserved > 0
      ? `The site says "Currently shipping" ${product.metadata?.ships_by}.`
      : `The site says "Ships" ${next}.`
  );

  await revalidateStorefront(logger);
}
