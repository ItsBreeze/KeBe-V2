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
// the first batch as its counted stock. While counted boards are unsold the
// storefront says "Currently shipping <ships_by>"; ship-dates.ts then keeps
// the board on sale past them as backorders, shipping on a second date. The
// site never says how many boards there are (owner, 1 Oct 2026), and nor may
// the description below.
//
//   medusa exec ./src/scripts/start-presale.ts
//
// v2 is the board the kebe repo calls v3: v1's board plus a CH334F USB 2.0 hub
// and three more USB-C ports, in a screwless case, sold all black: MJF PA12
// dyed black (Case_Files/v3/README.md's alternative to white SLS), a
// black-soldermask FR4 plate and black caps with shine-through legends. The
// wireless design (the kebe repo's v2) is not this product and is never sold.
//
// It refuses to run until Stripe, with a live key and its webhook secret, is
// the Canada region's only way to pay (use-stripe.ts). With Manual Payment
// still on, a presale order would reserve a board and take no money.
//
// Safe to re-run. It creates the product once; afterwards it only brings the
// status, description, pictures, 3D model and clip up to date, and keeps a ships-by
// date already set in Admin. It never changes price or existing stock: orders
// reserve against stocked_quantity, so resetting it would oversell. The one
// stock write is the first batch, made only while the variant has no stock
// level at all -- which also finishes a first run that stopped partway.
// Raise the batch in Admin (Inventory) when more boards are ordered. The
// title, colour option, variant and SKU are set once, at creation.

const HANDLE = "kebe-v2-keyboard";
// The regular price, charged once pre-orders close. While they are open,
// preorder-sale.ts puts a CA$349 sale price list over it.
const PRICE_CAD = 386.89; // plus shipping, calculated at checkout
const FIRST_BATCH = 5;
// Read by the storefront (lib/util/presale.ts) for the pre-order button and
// the "Currently shipping" date; editing it in Admin moves the date without a
// deploy.
const SHIPS_BY = "2026-10-31";
const STRIPE = "pp_stripe_stripe";
// model_glb puts the 3D viewer on the product page and video a looping clip
// (a path without extension: .webm, .mp4 and a .jpg poster), both from
// storefront/scripts/render-v2 and read by the storefront's product template.
const MODEL_GLB = "/products/kebe-v2.glb";
const MODEL_POSTER = "/products/kebe-v2-hero.jpg"; // a plain render, not a scene
const VIDEO = "/products/kebe-v2-desk-clip";

// Also written by ship-dates.ts. No quantity: the site never says how many
// boards there are.
export const DESCRIPTION =
  "KeBe v2 is v1's 68-key Matrix-Dvorak keyboard with a USB hub built in. " +
  "Four USB-C ports sit on the back edge: one goes to your computer, and the " +
  "other three are a USB 2.0 hub for a mouse receiver, a flash drive or " +
  "anything else that draws little power.\n\n" +
  "The case is one piece of black-dyed nylon, 8.65 mm tall against v1's 9.45, " +
  "and it holds the board, switches and plate with snap-fit catches instead of " +
  "screws. Kailh Choc low-profile switches sit in hot-swap sockets, sixty-eight " +
  "SK6812MINI-E LEDs light the keys one by one, and the STM32F072 runs QMK, so " +
  "a v1 keymap carries straight over.\n\n" +
  "It is all black. The plate is FR4 with black soldermask, and the keycaps " +
  "are black with shine-through legends, so each key's LED lights its " +
  "legend. Where a key has an Fn-layer legend, it sits below the main one.\n\n" +
  "Each board is assembled by hand in Canada. None of the " +
  "pictures or the clip are photographs: the plain renders and the 3D model " +
  "come straight from v2's CAD, and the desk, studio and night pictures and " +
  "the clip set that CAD model in AI-generated scenes.";

// From storefront/scripts/render-v2. desk, studio and night are the CAD
// keyboard composited into AI-generated scenes; the rest are straight renders.
// The desk scene is the thumbnail (store grid, cart) and ends the gallery,
// since the product page's clip, above the gallery, is that same scene.
const THUMBNAIL = "/products/kebe-v2-desk.jpg";
const IMAGES = [
  { url: "/products/kebe-v2-hero.jpg" },
  { url: "/products/kebe-v2-top.jpg" },
  { url: "/products/kebe-v2-ports.jpg" },
  { url: "/products/kebe-v2-night.jpg" },
  { url: "/products/kebe-v2-studio.jpg" },
  { url: THUMBNAIL },
];

// The storefront's rule (lib/util/presale.ts): a real calendar date, so a
// re-run replaces an Admin typo like 2026-11-31 rather than keeping it. Also
// checks ships_by_next in ship-dates.ts.
export const validDate = (v: unknown): v is string => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

// medusa exec calls process.exit() as soon as this script returns, which cuts
// off the revalidate-storefront subscriber's un-awaited fetch. So once the
// stock exists, flush the storefront here and wait for it.
export const revalidateStorefront = async (logger: { info: (m: string) => void; warn: (m: string) => void }) => {
  const base = process.env.STOREFRONT_URL;
  const secret = process.env.REVALIDATE_SECRET;
  const byHand = "POST <storefront>/api/revalidate?secret=<REVALIDATE_SECRET> by hand, or the site keeps its cached state.";
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

  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  });
  const location =
    locations.find((l: any) => l.name === "Canada Workshop") ?? locations[0];
  if (!location) throw new Error("No stock location. Run seed-kebe first.");

  // Sets the first batch only while the variant's inventory item has no level
  // anywhere. An existing level may carry reservations, so it is never touched.
  const ensureFirstBatch = async (productId: string): Promise<boolean> => {
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: [
        "id",
        "inventory_items.inventory_item_id",
        "inventory_items.inventory.location_levels.id",
      ],
      filters: { product_id: productId },
    });
    const link = (variants[0] as any)?.inventory_items?.[0];
    if (!link?.inventory_item_id) {
      throw new Error(`${HANDLE} has no inventory item; set its stock in Admin.`);
    }
    if (link.inventory?.location_levels?.length) return false;
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: [
          {
            inventory_item_id: link.inventory_item_id,
            location_id: location.id,
            stocked_quantity: FIRST_BATCH,
          },
        ],
      },
    });
    return true;
  };

  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["id", "metadata"],
    filters: { handle: HANDLE },
  });

  if (existing.length) {
    const product = existing[0];
    const current = product.metadata?.ships_by;
    const shipsBy = validDate(current) ? current : SHIPS_BY;
    if (current !== undefined && current !== shipsBy) {
      logger.warn(`ships_by "${String(current)}" is not a real date; set back to ${SHIPS_BY}.`);
    }
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: product.id },
        update: {
          status: ProductStatus.PUBLISHED,
          description: DESCRIPTION,
          thumbnail: THUMBNAIL,
          images: IMAGES,
          metadata: {
            ...(product.metadata ?? {}),
            presale: "true",
            ships_by: shipsBy,
            model_glb: MODEL_GLB,
            model_poster: MODEL_POSTER,
            video: VIDEO,
          },
        },
      },
    });
    const stocked = await ensureFirstBatch(product.id);
    await revalidateStorefront(logger);
    logger.info(
      `${HANDLE} already exists: published, ships by ${shipsBy}, pictures, description, model and clip updated. ` +
        (stocked
          ? `It had no stock level, so ${FIRST_BATCH} are now in stock at ${location.name}.`
          : "Price and stock left as they are; change them in Admin.")
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

  // No weight: nothing in the kebe repo gives v2's, and the product page shows
  // whatever is set. Weigh a built board and add it in Admin.
  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "KeBe v2 — 68-Key Ortholinear Keyboard with USB Hub",
          handle: HANDLE,
          category_ids: categories.length ? [categories[0].id] : [],
          description: DESCRIPTION,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: THUMBNAIL,
          metadata: {
            presale: "true",
            ships_by: SHIPS_BY,
            model_glb: MODEL_GLB,
            model_poster: MODEL_POSTER,
            video: VIDEO,
          },
          images: IMAGES,
          options: [{ title: "Colour", values: ["Black"] }],
          variants: [
            {
              title: "Black",
              sku: "KEBE-V2-BLK-SHINE",
              manage_inventory: true,
              // Sells the counted stock only; ship-dates.ts turns backorders
              // on and sets the date for the boards after it.
              allow_backorder: false,
              options: { Colour: "Black" },
              prices: [{ amount: PRICE_CAD, currency_code: "cad" }],
            },
          ],
          sales_channels: [{ id: salesChannel.id }],
        },
      ],
    },
  });

  await ensureFirstBatch(result[0].id);
  await revalidateStorefront(logger);

  logger.info(
    `Presale open: ${HANDLE} at CA$${PRICE_CAD}, ${FIRST_BATCH} in stock at ${location.name}, ships by ${SHIPS_BY}.`
  );
}
