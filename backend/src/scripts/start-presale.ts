import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";

// Opens the KeBe v2 presale: publishes the product at the owner's price with
// the first batch as its stock, so the storefront sells exactly that many and
// then shows Sold Out (and the waitlist) on its own.
//
//   medusa exec ./src/scripts/start-presale.ts
//
// v2 is the board the kebe repo calls v3: v1's board plus a CH334F USB 2.0 hub
// and three more USB-C ports, in a screwless white SLS nylon case. The wireless
// design (the kebe repo's v2) is not this product and is never sold.
//
// It refuses to run until Stripe, with a live key and its webhook secret, is
// the Canada region's only way to pay (use-stripe.ts). With Manual Payment
// still on, a presale order would reserve a board and take no money.
//
// Safe to re-run: it creates the product once, and afterwards only brings the
// ships-by date, status, description and pictures up to date. It never
// touches price or stock on a re-run: orders reserve against stocked_quantity,
// so resetting it would oversell.
// Raise the batch in Admin (Inventory) when more boards are ordered.

const HANDLE = "kebe-v2-keyboard";
const PRICE_CAD = 399;
const FIRST_BATCH = 5;
// Read by the storefront (lib/util/presale.ts) for the pre-order button and
// the ships-by line; editing it in Admin moves the date without a deploy.
const SHIPS_BY = "2026-10-31";
const STRIPE = "pp_stripe_stripe";

const DESCRIPTION =
  "KeBe v2 is v1's 68-key Matrix-Dvorak keyboard with a USB hub built in. " +
  "Four USB-C ports sit on the back edge: one goes to your computer, and the " +
  "other three are a USB 2.0 hub for a mouse receiver, a flash drive or " +
  "anything else that draws little power.\n\n" +
  "The case is one piece of white nylon, 8.65 mm tall against v1's 9.45, and " +
  "it holds the board, switches and plate with snap-fit catches instead of " +
  "screws. Kailh Choc low-profile switches sit in hot-swap sockets, sixty-eight " +
  "SK6812MINI-E LEDs light the keys one by one, and the STM32F072 runs QMK, so " +
  "a v1 keymap carries straight over.\n\n" +
  "The first batch is five boards, assembled by hand in Canada. The pictures " +
  "are renders of v2's CAD: the case, plate, switches and printed keycaps.";

// Renders from storefront/scripts/render-v2 (the real case STL and legends).
const IMAGES = [
  { url: "/products/kebe-v2-hero.jpg" },
  { url: "/products/kebe-v2-ports.jpg" },
  { url: "/products/kebe-v2-top.jpg" },
  { url: "/products/kebe-v2-glow.jpg" },
];

export default async function startPresale({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);

  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || "";
  if (!key.includes("_live_")) {
    throw new Error(
      "STRIPE_SECRET_KEY on medusa-backend is not a live key. A presale on a test key takes orders and no money."
    );
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is not set: a card that needs 3-D Secure would be charged and its order left pending. Run scripts/stripe-webhook.js first."
    );
  }

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "payment_providers.id"],
    filters: { name: "Canada" },
  });
  const providers = (regions[0]?.payment_providers ?? [])
    .map((p: any) => p?.id)
    .filter(Boolean);
  if (providers.length !== 1 || providers[0] !== STRIPE) {
    throw new Error(
      `Canada pays through [${providers.join(", ")}], not Stripe alone. Run use-stripe.ts first.`
    );
  }

  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["id", "metadata"],
    filters: { handle: HANDLE },
  });

  if (existing.length) {
    const product = existing[0];
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: product.id },
        update: {
          status: ProductStatus.PUBLISHED,
          description: DESCRIPTION,
          images: IMAGES,
          metadata: { ...(product.metadata ?? {}), presale: "true", ships_by: SHIPS_BY },
        },
      },
    });
    logger.info(
      `${HANDLE} already exists: published, ships by ${SHIPS_BY}, pictures and description updated. Price and stock left as they are; change them in Admin.`
    );
    return;
  }

  const [salesChannel] = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });
  const [shippingProfile] = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  if (!salesChannel || !shippingProfile) {
    throw new Error("No default sales channel or shipping profile. Run seed-kebe first.");
  }

  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id"],
    filters: { name: "Keyboards" },
  });

  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  });
  const location =
    locations.find((l: any) => l.name === "Canada Workshop") ?? locations[0];
  if (!location) throw new Error("No stock location. Run seed-kebe first.");

  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "KeBe v2 — 68-Key Ortholinear Keyboard with USB Hub",
          handle: HANDLE,
          category_ids: categories.length ? [categories[0].id] : [],
          description: DESCRIPTION,
          weight: 600,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: { presale: "true", ships_by: SHIPS_BY },
          images: IMAGES,
          options: [{ title: "Colour", values: ["White"] }],
          variants: [
            {
              title: "White",
              sku: "KEBE-V2-WHT",
              manage_inventory: true,
              allow_backorder: false,
              options: { Colour: "White" },
              prices: [{ amount: PRICE_CAD, currency_code: "cad" }],
            },
          ],
          sales_channels: [{ id: salesChannel.id }],
        },
      ],
    },
  });

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "inventory_items.inventory_item_id"],
    filters: { product_id: result[0].id },
  });
  const inventoryItemId = (variants[0] as any)?.inventory_items?.[0]
    ?.inventory_item_id;
  if (!inventoryItemId) {
    throw new Error(`${HANDLE} was created without an inventory item; set its stock in Admin.`);
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: [
        {
          inventory_item_id: inventoryItemId,
          location_id: location.id,
          stocked_quantity: FIRST_BATCH,
        },
      ],
    },
  });

  logger.info(
    `Presale open: ${HANDLE} at CA$${PRICE_CAD}, ${FIRST_BATCH} in stock at ${location.name}, ships by ${SHIPS_BY}.`
  );
}
