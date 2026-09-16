import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { ApiKey } from "../../.medusa/types/query-entry-points";

// Placeholder shipping rates. Real Canada Post rates for a boxed board are an
// owner action; nothing here is a quoted price.
const SHIPPING_EXPEDITED_CAD = 20;
const SHIPPING_XPRESSPOST_CAD = 30;

// Only the uncorrected July 2024 fab run physically exists, and the owner has
// not stated the unit count. Seeded low and deliberately: Medusa marks a
// product sold out rather than overselling a hand-built board.
const UNITS_ON_HAND = 5;

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map(
            (currency) => {
              return {
                currency_code: currency.currency_code,
                is_default: currency.is_default ?? false,
              };
            }
          ),
        },
      };
    });

    const stores = updateStoresStep(normalizedInput);

    return new WorkflowResponse(stores);
  }
);

export default async function seedKebeData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  const countries = ["ca"];

  logger.info("Seeding KeBe store data...");
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [{ name: "Default Sales Channel" }],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [{ currency_code: "cad", is_default: true }],
    },
  });

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: { default_sales_channel_id: defaultSalesChannel[0].id },
    },
  });

  logger.info("Seeding region data...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Canada",
          currency_code: "cad",
          countries,
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const region = regionResult[0];
  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code,
      provider_id: "tp_system",
    })),
  });
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Canada Workshop",
          address: {
            city: "Ottawa",
            country_code: "CA",
            address_1: "",
          },
        },
      ],
    },
  });
  const stockLocation = stockLocationResult[0];

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  });

  logger.info("Seeding fulfillment data...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [{ name: "Default Shipping Profile", type: "default" }],
        },
      });
    shippingProfile = shippingProfileResult[0];
  }

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Canadian Warehouse delivery",
    type: "shipping",
    service_zones: [
      {
        name: "Canada",
        geo_zones: [{ country_code: "ca", type: "country" }],
      },
    ],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
  });

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Canada Post Expedited Parcel",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Expedited",
          description: "Canada Post Expedited Parcel.",
          code: "expedited",
        },
        prices: [
          { currency_code: "cad", amount: SHIPPING_EXPEDITED_CAD },
          { region_id: region.id, amount: SHIPPING_EXPEDITED_CAD },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
      {
        name: "Canada Post Xpresspost",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Xpresspost",
          description: "Canada Post Xpresspost.",
          code: "xpresspost",
        },
        prices: [
          { currency_code: "cad", amount: SHIPPING_XPRESSPOST_CAD },
          { region_id: region.id, amount: SHIPPING_XPRESSPOST_CAD },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  });
  logger.info("Finished seeding fulfillment data.");

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  });

  logger.info("Seeding publishable API key data...");
  const { result: publishableApiKeyResult } = await createApiKeysWorkflow(
    container
  ).run({
    input: {
      api_keys: [
        {
          title: "KeBe Storefront",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  });
  const publishableApiKey = publishableApiKeyResult[0] as ApiKey;

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info(
    `Publishable API key (put in storefront/.env.local): ${publishableApiKey.token}`
  );

  logger.info("Seeding product categories...");
  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        { name: "Keyboards", is_active: true },
        { name: "Parts", is_active: true },
      ],
    },
  });

  const keyboards = categoryResult.find((c) => c.name === "Keyboards")!.id;
  const parts = categoryResult.find((c) => c.name === "Parts")!.id;

  logger.info("Seeding KeBe product data...");

  // Every product ships as DRAFT with no prices. Pricing is not derivable from
  // the repo -- no invoice or line pricing survives for any JLCPCB order -- and
  // publishing a guessed price then raising it costs more goodwill than waiting.
  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "KeBe v1 — 68-Key Ortholinear Keyboard",
          handle: "kebe-v1-keyboard",
          category_ids: [keyboards],
          description:
            "A 68-key ortholinear keyboard built around the Matrix-Dvorak layout. " +
            "Every key sits on a regular grid, so the distance between them is the " +
            "shortest it can be and your fingers learn positions instead of angles.\n\n" +
            "Kailh Choc low-profile switches drop into hot-swap sockets, so you can " +
            "change the feel without a soldering iron. Sixty-eight individually " +
            "addressable SK6812MINI-E LEDs sit under the keys. The controller is an " +
            "STM32F072 running QMK, so the layout is yours to remap.\n\n" +
            "The case is 3D printed and the boards are assembled by hand in Canada, " +
            "in small batches.",
          weight: 600,
          status: ProductStatus.DRAFT,
          shipping_profile_id: shippingProfile.id,
          images: [
            { url: "/products/kebe-v1-hero.jpg" },
            { url: "/products/kebe-v1-angle.jpg" },
            { url: "/products/kebe-v1-rgb.jpg" },
          ],
          // No colour option. The repo ships `kebe-plate v22` + `kebe-bottom-black
          // v4`, but the only photographed unit has a light grey case -- so
          // "black" is a design-variant filename, not an established resin
          // colour. Do not add a colour option until the owner confirms which
          // colours can actually be ordered.
          options: [{ title: "Build", values: ["Assembled", "Kit"] }],
          variants: [
            {
              title: "Assembled",
              sku: "KEBE-V1-ASM",
              options: { Build: "Assembled" },
              prices: [],
            },
            {
              title: "Kit",
              sku: "KEBE-V1-KIT",
              options: { Build: "Kit" },
              prices: [],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "KeBe v1 Case Set",
          handle: "kebe-v1-case-set",
          category_ids: [parts],
          description:
            "The 3D printed plate and bottom for a KeBe v1, sold on their own for " +
            "anyone rebuilding or replacing a case. Machined to the corrected v1 " +
            "geometry: 108.000 mm M2 pattern, 4.150 mm plate cavity.",
          weight: 250,
          status: ProductStatus.DRAFT,
          shipping_profile_id: shippingProfile.id,
          images: [{ url: "/products/kebe-v1-case.jpg" }],
          options: [
            {
              title: "Contents",
              values: ["Plate + Bottom", "Plate only", "Bottom only"],
            },
          ],
          variants: [
            {
              title: "Plate + Bottom",
              sku: "KEBE-CASE-BOTH",
              options: { Contents: "Plate + Bottom" },
              prices: [],
            },
            {
              title: "Plate only",
              sku: "KEBE-CASE-PLATE",
              options: { Contents: "Plate only" },
              prices: [],
            },
            {
              title: "Bottom only",
              sku: "KEBE-CASE-BOT",
              options: { Contents: "Bottom only" },
              prices: [],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          // Blocked: the corrected gerbers in PCBs/fab-corrected/gerbers-v2/
          // have never been fabricated. Do not publish until a run exists.
          title: "KeBe v1 PCB",
          handle: "kebe-v1-pcb",
          category_ids: [parts],
          description:
            "The bare KeBe v1 board: 252.010 × 84.990 mm, two layers, 68 hot-swap " +
            "sockets and 68 SK6812MINI-E LEDs, STM32F072 controller.",
          weight: 120,
          status: ProductStatus.DRAFT,
          shipping_profile_id: shippingProfile.id,
          options: [{ title: "Revision", values: ["Corrected"] }],
          variants: [
            {
              title: "Corrected",
              sku: "KEBE-PCB-V1-CORR",
              options: { Revision: "Corrected" },
              prices: [],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Gift Card",
          handle: "gift-card",
          category_ids: [],
          description: "A KeBe gift card.",
          status: ProductStatus.DRAFT,
          shipping_profile_id: shippingProfile.id,
          options: [{ title: "Amount", values: ["50", "100", "250"] }],
          variants: [
            {
              title: "CA$50",
              sku: "KEBE-GC-50",
              options: { Amount: "50" },
              prices: [],
            },
            {
              title: "CA$100",
              sku: "KEBE-GC-100",
              options: { Amount: "100" },
              prices: [],
            },
            {
              title: "CA$250",
              sku: "KEBE-GC-250",
              options: { Amount: "250" },
              prices: [],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
      ],
    },
  });
  logger.info("Finished seeding product data.");

  logger.info("Seeding inventory levels.");
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const inventoryLevels: CreateInventoryLevelInput[] = [];
  for (const inventoryItem of inventoryItems) {
    inventoryLevels.push({
      location_id: stockLocation.id,
      stocked_quantity: UNITS_ON_HAND,
      inventory_item_id: inventoryItem.id,
    });
  }

  await createInventoryLevelsWorkflow(container).run({
    input: { inventory_levels: inventoryLevels },
  });

  logger.info("Finished seeding inventory levels data.");
  logger.info(
    "All products seeded as DRAFT with no prices. Set prices and publish once real costs are known."
  );
}
