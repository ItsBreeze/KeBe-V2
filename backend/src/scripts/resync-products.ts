import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
  deleteProductsWorkflow,
} from "@medusajs/medusa/core-flows";

// Replaces the KeBe product catalog in place, leaving the region, sales
// channel, shipping options and publishable key alone. Re-running the full
// seed would create a second Canada region and a second API key; this only
// touches products, so it is safe to run against an already-seeded database.
//
//   medusa exec ./src/scripts/resync-products.ts
//
// Prices are the owner's real v1 numbers: CA$299 with shine-through keycaps,
// CA$199 with blanks, in either colour. Stock stays at zero -- the site leads
// with the v2 waitlist and v1 is deliberately listed sold out.

const UNITS_ON_HAND = 0;
const HANDLES = ["kebe-v1-keyboard", "kebe-v1-case-set", "kebe-v1-pcb", "gift-card"];

export default async function resyncProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);

  const [salesChannel] = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });
  if (!salesChannel) {
    throw new Error("No Default Sales Channel. Run seed-kebe first.");
  }

  const [shippingProfile] =
    await fulfillmentModuleService.listShippingProfiles({ type: "default" });
  if (!shippingProfile) {
    throw new Error("No default shipping profile. Run seed-kebe first.");
  }

  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  });
  const keyboards = categories.find((c: any) => c.name === "Keyboards")?.id;
  const parts = categories.find((c: any) => c.name === "Parts")?.id;

  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  });
  const doomed = existing.filter((p: any) => HANDLES.includes(p.handle));

  if (doomed.length) {
    logger.info(
      `Removing ${doomed.length} existing product(s): ${doomed
        .map((p: any) => p.handle)
        .join(", ")}`
    );
    await deleteProductsWorkflow(container).run({
      input: { ids: doomed.map((p: any) => p.id) },
    });
  }

  logger.info("Recreating KeBe products...");
  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "KeBe v1 — 68-Key Ortholinear Keyboard",
          handle: "kebe-v1-keyboard",
          category_ids: keyboards ? [keyboards] : [],
          description:
            "A 68-key ortholinear keyboard built around the Matrix-Dvorak layout. " +
            "Every key sits on a regular grid, so the distance between them is the " +
            "shortest it can be and your fingers learn positions instead of angles.\n\n" +
            "Kailh Choc low-profile switches drop into hot-swap sockets, so you can " +
            "change the feel without a soldering iron. Sixty-eight individually " +
            "addressable SK6812MINI-E LEDs sit under the keys — choose " +
            "shine-through keycaps to let them through the legends, or blanks for a " +
            "cleaner look and underglow only. The controller is an STM32F072 running " +
            "QMK, so the layout is yours to remap.\n\n" +
            "The case is 3D printed and the boards are assembled by hand in Canada, " +
            "in small batches.",
          weight: 600,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            { url: "/products/kebe-v1-hero.jpg" },
            { url: "/products/kebe-v1-angle.jpg" },
            { url: "/products/kebe-v1-rgb.jpg" },
          ],
          options: [
            { title: "Colour", values: ["White", "Black"] },
            { title: "Keycaps", values: ["Shine-through", "Blank"] },
          ],
          variants: [
            {
              title: "White / Shine-through",
              sku: "KEBE-V1-WHT-SHINE",
              options: { Colour: "White", Keycaps: "Shine-through" },
              prices: [{ amount: 299, currency_code: "cad" }],
            },
            {
              title: "Black / Shine-through",
              sku: "KEBE-V1-BLK-SHINE",
              options: { Colour: "Black", Keycaps: "Shine-through" },
              prices: [{ amount: 299, currency_code: "cad" }],
            },
            {
              title: "White / Blank",
              sku: "KEBE-V1-WHT-BLANK",
              options: { Colour: "White", Keycaps: "Blank" },
              prices: [{ amount: 199, currency_code: "cad" }],
            },
            {
              title: "Black / Blank",
              sku: "KEBE-V1-BLK-BLANK",
              options: { Colour: "Black", Keycaps: "Blank" },
              prices: [{ amount: 199, currency_code: "cad" }],
            },
          ],
          sales_channels: [{ id: salesChannel.id }],
        },
        {
          title: "KeBe v1 Case Set",
          handle: "kebe-v1-case-set",
          category_ids: parts ? [parts] : [],
          description:
            "The 3D printed plate and bottom for a KeBe v1, sold on their own for " +
            "anyone rebuilding or replacing a case. Machined to the corrected v1 " +
            "geometry: 108.000 mm M2 pattern, 4.150 mm plate cavity.",
          weight: 250,
          status: ProductStatus.DRAFT,
          shipping_profile_id: shippingProfile.id,
          images: [{ url: "/products/kebe-v1-case.jpg" }],
          options: [
            { title: "Colour", values: ["White", "Black"] },
            {
              title: "Contents",
              values: ["Plate + Bottom", "Plate only", "Bottom only"],
            },
          ],
          variants: [
            {
              title: "White / Plate + Bottom",
              sku: "KEBE-CASE-WHT-BOTH",
              options: { Colour: "White", Contents: "Plate + Bottom" },
              prices: [],
            },
            {
              title: "White / Plate only",
              sku: "KEBE-CASE-WHT-PLATE",
              options: { Colour: "White", Contents: "Plate only" },
              prices: [],
            },
            {
              title: "White / Bottom only",
              sku: "KEBE-CASE-WHT-BOT",
              options: { Colour: "White", Contents: "Bottom only" },
              prices: [],
            },
            {
              title: "Black / Plate + Bottom",
              sku: "KEBE-CASE-BLK-BOTH",
              options: { Colour: "Black", Contents: "Plate + Bottom" },
              prices: [],
            },
            {
              title: "Black / Plate only",
              sku: "KEBE-CASE-BLK-PLATE",
              options: { Colour: "Black", Contents: "Plate only" },
              prices: [],
            },
            {
              title: "Black / Bottom only",
              sku: "KEBE-CASE-BLK-BOT",
              options: { Colour: "Black", Contents: "Bottom only" },
              prices: [],
            },
          ],
          sales_channels: [{ id: salesChannel.id }],
        },
      ],
    },
  });

  logger.info("Setting inventory levels...");
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });
  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id"],
  });
  const locationId = locations[0]?.id;

  if (locationId) {
    const { data: levels } = await query.graph({
      entity: "inventory_level",
      fields: ["inventory_item_id"],
    });
    const covered = new Set(levels.map((l: any) => l.inventory_item_id));
    const missing: CreateInventoryLevelInput[] = inventoryItems
      .filter((i: any) => !covered.has(i.id))
      .map((i: any) => ({
        location_id: locationId,
        stocked_quantity: UNITS_ON_HAND,
        inventory_item_id: i.id,
      }));

    if (missing.length) {
      await createInventoryLevelsWorkflow(container).run({
        input: { inventory_levels: missing },
      });
    }
    logger.info(`Inventory levels set for ${missing.length} new item(s).`);
  }

  logger.info(
    "Done. v1 published at CA$299 shine-through / CA$199 blank, stock 0 (sold out)."
  );
}
