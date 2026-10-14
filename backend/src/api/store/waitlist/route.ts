import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { WAITLIST_MODULE } from "../../../modules/waitlist";
import WaitlistModuleService from "../../../modules/waitlist/service";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// "lite": KeBe Lite's waitlist while it is on hold (14 Oct 2026).
const ALLOWED_SOURCES = new Set(["v2", "v1-restock", "lite"]);

type Body = { email?: unknown; source?: unknown };

export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const raw = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  const email = raw.toLowerCase();

  if (!email || email.length > 254 || !EMAIL.test(email)) {
    return res.status(400).json({ error: "A valid email address is required." });
  }

  const source =
    typeof req.body?.source === "string" && ALLOWED_SOURCES.has(req.body.source)
      ? req.body.source
      : "v2";

  const service: WaitlistModuleService = req.scope.resolve(WAITLIST_MODULE);

  try {
    const existing = await service.listSubscribers({ email });
    if (!existing.length) {
      await service.createSubscribers({ email, source });
    } else if (!existing[0].source.split(",").includes(source)) {
      // A second list for an address already on one ("v2,lite"), so a count of
      // one list's signups misses no one: count with includes, never ===.
      await service.updateSubscribers({
        id: existing[0].id,
        source: `${existing[0].source},${source}`,
      });
    }
  } catch (e) {
    req.scope.resolve("logger").error(`waitlist signup failed: ${e}`);
    return res
      .status(500)
      .json({ error: "Could not record that right now. Please try again." });
  }

  // Same response whether or not the address was already on the list, so the
  // endpoint cannot be used to test which addresses have signed up.
  return res.status(200).json({ ok: true });
}
