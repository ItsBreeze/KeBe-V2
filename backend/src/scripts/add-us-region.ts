import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  batchPriceListPricesWorkflow,
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createTaxRegionsWorkflow,
  updateRegionsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { revalidateStorefront } from "./start-presale";

// Sells to the United States (owner, 3 Oct 2026): a USD region paying through
// Stripe alone, like Canada (use-stripe.ts), shipped by Canada Post from the
// same workshop and stock, so the first batch and the backorders are shared.
//
//   medusa exec ./src/scripts/add-us-region.ts
//
// Prices are CAD at 0.7023 (Bank of Canada via Frankfurter, 2 Oct 2026) plus
// about 2% for Stripe's conversion of a USD charge into the CAD account, in
// whole dollars. The pre-order price follows preorder-sale.ts: a USD price in
// the same "KeBe v2 pre-order" sale list, so the site still never names the
// price after pre-orders close.
//
// Shipping is flat, like Canada's: Canada Post's published Tracked Packet USA
// rate for 1 kg was CA$20.62 in April 2026. US duties are not in it. Canada
// Post issues no US label until the duties are prepaid through Zonos (a
// Declaration ID), so the shop pays them and the buyer pays nothing on
// delivery.
//
// Safe to re-run. It creates what is missing and never changes a price or an
// option that already exists, so edits in Admin stand.

const STRIPE = "pp_stripe_stripe";
const REGION = "United States";
const ZONE = "United States";
const PRICE_LIST = "KeBe v2 pre-order";
const PREORDER_USD = 249; // CA$349
// the variants' own prices: v2's CA$386.89 (never shown while the pre-order
// list is active) and v1's sold-out listing
const USD_BY_SKU: Record<string, number> = {
  "KEBE-V2-BLK-SHINE": 276,
  "KEBE-V1-BLK-SHINE": 213,
  "KEBE-V1-WHT-SHINE": 213,
  "KEBE-V1-BLK-BLANK": 142,
  "KEBE-V1-WHT-BLANK": 142,
};
const SHIPPING = [
  {
    name: "Canada Post Tracked Packet USA",
    label: "Tracked Packet USA",
    description: "Canada Post Tracked Packet USA, 4 to 7 business days.",
    code: "tracked-packet-usa",
    usd: 20,
  },
  {
    name: "Canada Post Xpresspost USA",
    label: "Xpresspost USA",
    description: "Canada Post Xpresspost USA, 2 to 3 business days.",
    code: "xpresspost-usa",
    usd: 40,
  },
];

export default async function addUsRegion({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillment = container.resolve(Modules.FULFILLMENT);
  const pricing = container.resolve(Modules.PRICING);
  const payment = container.resolve(Modules.PAYMENT);

  if (!(await payment.listPaymentProviders({ id: STRIPE })).length) {
    throw new Error(`${STRIPE} is not registered on this backend.`);
  }

  // the store's currencies: CAD stays the default
  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "supported_currencies.currency_code", "supported_currencies.is_default"],
  });
  const store: any = stores[0];
  const currencies = (store.supported_currencies ?? []).map((c: any) => ({
    currency_code: c.currency_code,
    is_default: !!c.is_default,
  }));
  if (!currencies.some((c: any) => c.currency_code === "usd")) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: { supported_currencies: [...currencies, { currency_code: "usd", is_default: false }] },
      },
    });
    logger.info("Store: USD added.");
  }

  // the region, paying through Stripe alone
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "payment_providers.id"],
    filters: { name: REGION },
  });
  let region: any = regions[0];
  if (!region) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: REGION,
            currency_code: "usd",
            countries: ["us"],
            payment_providers: [STRIPE],
            automatic_taxes: true,
          },
        ],
      },
    });
    region = result[0];
    logger.info(`Region ${REGION} (${region.id}) created, paying through Stripe.`);
  } else {
    const ids = (region.payment_providers ?? []).map((p: any) => p?.id).filter(Boolean);
    if (ids.length !== 1 || ids[0] !== STRIPE) {
      await updateRegionsWorkflow(container).run({
        input: { selector: { id: region.id }, update: { payment_providers: [STRIPE] } },
      });
      logger.info(`Region ${REGION}: now Stripe only (was [${ids.join(", ")}]).`);
    }
  }

  // no US sales tax: the shop is far under every state's economic nexus
  // threshold. The tax region only gives the country its (empty) tax lines.
  const { data: taxRegions } = await query.graph({
    entity: "tax_region",
    fields: ["id"],
    filters: { country_code: "us" },
  });
  if (!taxRegions.length) {
    await createTaxRegionsWorkflow(container).run({
      input: [{ country_code: "us", provider_id: "tp_system" }],
    });
    logger.info("Tax region us created (no rate).");
  }

  // a US zone in the workshop's fulfillment set, so it ships from the same stock
  const [set] = await fulfillment.listFulfillmentSets(
    { name: "Canadian Warehouse delivery" },
    { relations: ["service_zones"] }
  );
  if (!set) throw new Error("No 'Canadian Warehouse delivery' fulfillment set. Run seed-kebe first.");
  let zone: any = (set.service_zones ?? []).find((z: any) => z.name === ZONE);
  if (!zone) {
    zone = await fulfillment.createServiceZones({
      name: ZONE,
      fulfillment_set_id: set.id,
      geo_zones: [{ type: "country", country_code: "us" }],
    });
    logger.info(`Service zone ${ZONE} created.`);
  }

  const [profile] = await fulfillment.listShippingProfiles({ type: "default" });
  const existing = await fulfillment.listShippingOptions({ service_zone: { id: zone.id } } as any);
  const missing = SHIPPING.filter((s) => !existing.some((o: any) => o.name === s.name));
  if (missing.length) {
    await createShippingOptionsWorkflow(container).run({
      input: missing.map((s) => ({
        name: s.name,
        price_type: "flat" as const,
        provider_id: "manual_manual",
        service_zone_id: zone.id,
        shipping_profile_id: profile.id,
        type: { label: s.label, description: s.description, code: s.code },
        prices: [
          { currency_code: "usd", amount: s.usd },
          { region_id: region.id, amount: s.usd },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
          { attribute: "is_return", value: "false", operator: "eq" as const },
        ],
      })),
    });
    for (const s of missing) logger.info(`Shipping: ${s.name} at US$${s.usd}.`);
  }

  // the variants' own USD prices
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "price_set.id", "prices.currency_code"],
    filters: { sku: Object.keys(USD_BY_SKU) },
  });
  for (const v of variants as any[]) {
    if ((v.prices ?? []).some((p: any) => p.currency_code === "usd")) continue;
    if (!v.price_set?.id) {
      logger.warn(`${v.sku} has no price set; price it in Admin.`);
      continue;
    }
    await pricing.addPrices({
      priceSetId: v.price_set.id,
      prices: [{ amount: USD_BY_SKU[v.sku], currency_code: "usd" }],
    });
    logger.info(`${v.sku}: US$${USD_BY_SKU[v.sku]}.`);
  }

  // the pre-order price in USD, in the same sale list
  const v2: any = (variants as any[]).find((v) => v.sku === "KEBE-V2-BLK-SHINE");
  const { data: lists } = await query.graph({
    entity: "price_list",
    fields: ["id", "prices.currency_code", "prices.price_set.variant.id"],
    filters: { title: PRICE_LIST },
  });
  const list: any = lists[0];
  if (!list || !v2) {
    logger.warn(`No "${PRICE_LIST}" list or no v2 variant: run preorder-sale.ts, then this again.`);
  } else if (
    !(list.prices ?? []).some((p: any) => p.currency_code === "usd" && p.price_set?.variant?.id === v2.id)
  ) {
    await batchPriceListPricesWorkflow(container).run({
      input: {
        data: {
          id: list.id,
          create: [{ amount: PREORDER_USD, currency_code: "usd", variant_id: v2.id }],
          update: [],
          delete: [],
        },
      },
    });
    logger.info(`"${PRICE_LIST}": KEBE-V2-BLK-SHINE at US$${PREORDER_USD}.`);
  }

  await revalidateStorefront(logger);
  logger.info(`${REGION} is open: /us on the storefront once its region list refreshes.`);
}
