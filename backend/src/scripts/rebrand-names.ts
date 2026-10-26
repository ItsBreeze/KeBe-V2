import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

// The rebrand to Brisebois' Boards (Josh via Lute, 26 Oct 2026 11:59 AM PT):
// the products are renamed, the handles stay, so every old link, feed id and
// order keeps working. Only the leading model name of each title changes.
//
//   medusa exec ./src/scripts/rebrand-names.ts
//
// Safe to re-run: a title already renamed no longer starts with an old name.
// Not to be run on the live database before Josh's go (rebrand plan Phase 3).

// No revision numbers (Josh via Lute, 26 Oct 2026 12:15 PM PT): v1 and v2
// are both the Breeze Board; their full titles still differ after the name.
// Longest first, so "KeBe v2" is matched before any shorter "KeBe".
export const RENAMES: [string, string][] = [
  ["KeBe v2", "Breeze Board"],
  ["KeBe v1", "Breeze Board"],
  ["KeBe Lite", "Breeze Board Lite"],
];

export const rename = (title: string) => {
  const hit = RENAMES.find(([from]) => title.startsWith(from));
  return hit ? hit[1] + title.slice(hit[0].length) : title;
};

export default async function rebrandNames({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "title"],
  });
  for (const p of products as any[]) {
    const title = rename(p.title ?? "");
    if (title === p.title) continue;
    await updateProductsWorkflow(container).run({
      input: { selector: { id: p.id }, update: { title } },
    });
    logger.info(`${p.handle}: "${p.title}" -> "${title}"`);
  }
}
