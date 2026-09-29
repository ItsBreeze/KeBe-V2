import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows";

// Makes Stripe the Canada region's only way to pay, replacing the seed's
// pp_system_default. That provider is "Manual Payment": left on, anything in
// stock can be ordered without paying. Safe to re-run.
//
//   medusa exec ./src/scripts/use-stripe.ts
//
// Needs STRIPE_SECRET_KEY on medusa-backend and a deploy since, so that
// medusa-config.ts has registered the provider this points the region at.

const STRIPE = "pp_stripe_stripe";

export default async function useStripe({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const regionService = container.resolve(Modules.REGION);
  const paymentService = container.resolve(Modules.PAYMENT);

  const providers = await paymentService.listPaymentProviders({ id: STRIPE });
  if (!providers.length) {
    throw new Error(
      `${STRIPE} is not registered. Set STRIPE_SECRET_KEY on medusa-backend and redeploy first.`
    );
  }

  const [region] = await regionService.listRegions({ name: "Canada" });
  if (!region) throw new Error("No Canada region. Run seed-kebe first.");

  await updateRegionsWorkflow(container).run({
    input: {
      selector: { id: region.id },
      update: { payment_providers: [STRIPE] },
    },
  });
  logger.info(`Canada (${region.id}) now takes payment through Stripe only.`);
}
