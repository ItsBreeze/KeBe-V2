import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  batchPriceListPricesWorkflow,
  createPriceListsWorkflow,
  createProductsWorkflow,
  updatePriceListsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";

// Opens KeBe Lite's pre-orders (owner, 6 Oct 2026): the rubber-dome KeBe in the kebe repo's PCBs/lite, at
// US$89.99 / C$129.99 plus shipping, shipping January 2027.
//
//   medusa exec ./src/scripts/start-lite.ts            creates or refreshes it as a DRAFT
//   medusa exec ./src/scripts/start-lite.ts publish    the same, then publishes it
//
// Draft first: the storefront treats a pre-order product specially (the cancel promise, the ship line, the Stripe
// description), and the build that knows the Lite must be live before the Lite is. Publish once it is.
//
// Like KeBe v2 (start-presale.ts, preorder-sale.ts, add-us-region.ts): the variant's own price is the price after
// pre-orders close, never shown while they are open, and a "KeBe Lite pre-order" sale price list puts the
// pre-order price over it; the site calls that the pre-order price (lib/util/presale.ts). The later price below is
// KeBe v2's ratio (386.89 / 349) applied to the Lite, rounded; change it in Admin, the site does not show it.
//
// No counted stock: every Lite is built after it is ordered, so the variant does not manage inventory and the site
// says "Ships <ships_by_next>" (lib/util/presale.ts presaleShipLine). ships_by marks it as a pre-order; both dates
// live in the product's metadata, so moving them is an Admin edit, not a deploy. The site never says how many
// there are (owner, 1 Oct 2026).
//
// Safe to re-run: it creates the product once; afterwards it refreshes the description, pictures, model and dates
// (keeping real dates already set in Admin), and sets the pre-order list's two prices. It never changes the
// variant's own prices once they exist.

const HANDLE = "kebe-lite";
const TITLE = "KeBe Lite — 68-Key Ortholinear Keyboard, Backlit Rubber Dome";
const SKU = "KEBE-LITE-BACKLIT";
const PRICE_LIST = "KeBe Lite pre-order";
const PREORDER = { cad: 129.99, usd: 89.99 }; // plus shipping, calculated at checkout
const LATER = { cad: 143.99, usd: 99.99 }; // after pre-orders close; never shown while the list is active
const SHIPS = "2027-01-31";
const MODEL_GLB = "/products/kebe-lite.glb";
const MODEL_POSTER = "/products/kebe-lite-hero.jpg";
const THUMBNAIL = "/products/kebe-lite-hero.jpg";
// storefront/scripts/render-lite: straight renders of the Lite's design files, no scenes.
const IMAGES = [
  { url: "/products/kebe-lite-hero.jpg" },
  { url: "/products/kebe-lite-top.jpg" },
  { url: "/products/kebe-lite-glow.jpg" },
  { url: "/products/kebe-lite-ports.jpg" },
];

// Every claim here is in the kebe repo's PCBs/lite/README.md (rev 3: the P+R keypad, the Lite case) or the live
// KeBe v2 description. No count, no
// battery or radio, nothing about a build that has not happened.
export const DESCRIPTION =
  "KeBe Lite is KeBe's 68-key Matrix-Dvorak keyboard at a lower price. It is the same board as KeBe v2, with " +
  "its USB hub and a light under every key, but the keys are one moulded keypad instead of switches and " +
  "keycaps.\n\n" +
  "Each key is a rubber dome with a hard plastic key top. Pressing it collapses the dome, and a carbon contact " +
  "under it closes gold pads on the board. The keys are backlit: the key tops are translucent plastic painted " +
  "black, with the legends laser-etched through, so each key's LED lights its own legend. Where a key has an " +
  "Fn-layer legend, it sits below the main one.\n\n" +
  "Four USB-C ports sit on the back edge: one goes to your computer, and the other three are a USB 2.0 hub. The " +
  "STM32F072 runs QMK, the same firmware as KeBe v2, so the layout and the Fn layer are the same, and the free " +
  "typing trainer on this site teaches both.\n\n" +
  "It snaps into KeBe v2's screwless case, cut down so its rim is flush with the keypad, printed in black " +
  "nylon. There is no top plate: the keypad covers the board edge to edge. " +
  "Each board is assembled by hand in Canada. None of the pictures are photographs: they and the 3D model are " +
  "renders of the Lite's design files.";

const validDate = (v: unknown): v is string => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

const revalidateStorefront = async (logger: { info: (m: string) => void; warn: (m: string) => void }) => {
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

export default async function startLite({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const publish = (args ?? []).includes("publish");
  const status = publish ? ProductStatus.PUBLISHED : ProductStatus.DRAFT;

  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || "";
  if (publish && !key.includes("_live_")) {
    throw new Error("STRIPE_SECRET_KEY is not a live key: a published pre-order would take orders and no money.");
  }

  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["id", "metadata", "variants.id"],
    filters: { handle: HANDLE },
  });

  let variantId: string;
  if (existing.length) {
    const product: any = existing[0];
    const meta = product.metadata ?? {};
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: product.id },
        update: {
          status,
          description: DESCRIPTION,
          thumbnail: THUMBNAIL,
          images: IMAGES,
          metadata: {
            ...meta,
            presale: "true",
            ships_by: validDate(meta.ships_by) ? meta.ships_by : SHIPS,
            ships_by_next: validDate(meta.ships_by_next) ? meta.ships_by_next : SHIPS,
            model_glb: MODEL_GLB,
            model_poster: MODEL_POSTER,
          },
        },
      },
    });
    variantId = product.variants[0].id;
    logger.info(`${HANDLE} refreshed (${status}).`);
  } else {
    const [salesChannel] = await salesChannelModuleService.listSalesChannels({ name: "Default Sales Channel" });
    const [shippingProfile] = await fulfillmentModuleService.listShippingProfiles({ type: "default" });
    if (!salesChannel || !shippingProfile) {
      throw new Error("No default sales channel or shipping profile. Run seed-kebe first.");
    }
    const { data: categories } = await query.graph({
      entity: "product_category",
      fields: ["id"],
      filters: { name: "Keyboards" },
    });
    const { result } = await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: TITLE,
            handle: HANDLE,
            category_ids: categories.length ? [categories[0].id] : [],
            description: DESCRIPTION,
            status,
            shipping_profile_id: shippingProfile.id,
            thumbnail: THUMBNAIL,
            images: IMAGES,
            metadata: {
              presale: "true",
              ships_by: SHIPS,
              ships_by_next: SHIPS,
              model_glb: MODEL_GLB,
              model_poster: MODEL_POSTER,
            },
            options: [{ title: "Keys", values: ["Backlit"] }],
            variants: [
              {
                title: "Backlit",
                sku: SKU,
                // built to order: nothing to count
                manage_inventory: false,
                options: { Keys: "Backlit" },
                prices: [
                  { amount: LATER.cad, currency_code: "cad" },
                  { amount: LATER.usd, currency_code: "usd" },
                ],
              },
            ],
            sales_channels: [{ id: salesChannel.id }],
          },
        ],
      },
    });
    variantId = (result[0] as any).variants[0].id;
    logger.info(`${HANDLE} created (${status}): later price CA$${LATER.cad} / US$${LATER.usd}.`);
  }

  // the pre-order price list, its CAD and USD prices for this variant
  const { data: lists } = await query.graph({
    entity: "price_list",
    fields: ["id", "status", "prices.id", "prices.currency_code", "prices.price_set.variant.id"],
    filters: { title: PRICE_LIST },
  });
  const want = (["cad", "usd"] as const).map((c) => ({ amount: PREORDER[c], currency_code: c, variant_id: variantId }));
  if (!lists.length) {
    await createPriceListsWorkflow(container).run({
      input: {
        price_lists_data: [
          {
            title: PRICE_LIST,
            description: `KeBe Lite at CA$${PREORDER.cad} / US$${PREORDER.usd} while pre-orders are open.`,
            status: "active",
            type: "sale",
            prices: want,
          } as any,
        ],
      },
    });
  } else {
    const list: any = lists[0];
    if (list.status !== "active") {
      await updatePriceListsWorkflow(container).run({ input: { price_lists_data: [{ id: list.id, status: "active" }] } });
    }
    const mine = (list.prices ?? []).filter((p: any) => p.price_set?.variant?.id === variantId);
    await batchPriceListPricesWorkflow(container).run({
      input: {
        data: {
          id: list.id,
          create: want.filter((w) => !mine.some((p: any) => p.currency_code === w.currency_code)),
          update: want
            .map((w) => ({ w, p: mine.find((p: any) => p.currency_code === w.currency_code) }))
            .filter(({ p }) => p)
            .map(({ w, p }) => ({ id: p.id, ...w })),
          delete: [],
        },
      },
    });
  }
  logger.info(`"${PRICE_LIST}" active: ${SKU} at CA$${PREORDER.cad} / US$${PREORDER.usd}, ships ${SHIPS}.`);
  await revalidateStorefront(logger);
}
