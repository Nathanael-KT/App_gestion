import { createError, defineEventHandler } from "h3";
import { requireAdmin } from "../../utils/requireAdmin";
import { computeEligibility } from "../../utils/cashAdvanceEngine";

/**
 * Calcule et renvoie l'éligibilité courante à une avance de trésorerie.
 */
export default defineEventHandler(async (event) => {
  const { adminClient, companyId } = await requireAdmin(event, [
    "admin",
    "super_admin",
  ]);
  if (!companyId) {
    throw createError({ statusCode: 400, statusMessage: "Aucune compagnie associée" });
  }
  const eligibility = await computeEligibility(adminClient, companyId);
  return { ok: true, eligibility };
});
