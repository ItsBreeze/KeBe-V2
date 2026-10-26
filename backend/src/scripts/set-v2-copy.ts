import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";
import { DESCRIPTION, TITLE, revalidateStorefront } from "./start-presale";

// KeBe v2's title and description only (owner, 7 Oct 2026: v2 "mechanical"), for when start-presale.ts's other
// updates are not wanted. Safe to re-run.
//   npx medusa exec ./src/scripts/set-v2-copy.ts
export default async function setV2Copy({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({ entity: "product", fields: ["id", "title"], filters: { handle: "kebe-v2-keyboard" } });
  if (!data.length) {
    logger.warn("kebe-v2-keyboard not found; nothing changed.");
    return;
  }
  await updateProductsWorkflow(container).run({
    input: { selector: { id: data[0].id }, update: { title: TITLE, description: DESCRIPTION } },
  });
  await revalidateStorefront(logger);
  logger.info(`kebe-v2-keyboard: title "${data[0].title}" -> "${TITLE}", description updated.`);
}
