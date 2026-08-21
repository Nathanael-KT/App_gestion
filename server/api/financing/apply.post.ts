import { createError, defineEventHandler, readBody } from "h3";
import { requireAdmin } from "../../utils/requireAdmin";
import {
  computeEligibility,
  computeTerms,
  makeReference,
} from "../../utils/cashAdvanceEngine";

interface ApplyBody {
  requestedAmount: number;
}

/**
 * Crée une demande d'avance de trésorerie. Calcule l'éligibilité et génère une
 * offre indicative (statut "offered") prête à être acceptée par le commerçant.
 */
export default defineEventHandler(async (event) => {
  const { adminClient, companyId, userId } = await requireAdmin(event, [
    "admin",
    "super_admin",
  ]);
  if (!companyId) {
    throw createError({ statusCode: 400, statusMessage: "Aucune compagnie associée" });
  }

  const body = await readBody<ApplyBody>(event);
  const requested = Number(body?.requestedAmount);
  if (!Number.isFinite(requested) || requested <= 0) {
    throw createError({ statusCode: 400, statusMessage: "Montant demandé invalide" });
  }

  const eligibility = await computeEligibility(adminClient, companyId);
  if (!eligibility.eligible) {
    throw createError({
      statusCode: 422,
      statusMessage:
        "Éligibilité insuffisante : " + eligibility.reasons.join(" "),
    });
  }

  const amount = Math.min(requested, eligibility.maxAmount);
  if (amount < requested) {
    // On plafonne au maximum éligible plutôt que de refuser.
  }
  const terms = computeTerms(amount);
  const now = new Date().toISOString();

  const { data, error } = await adminClient
    .from("cash_advances")
    .insert({
      company_id: companyId,
      reference: makeReference(),
      requested_amount: requested,
      offered_amount: terms.amount,
      approved_amount: terms.amount,
      factor_rate: terms.factorRate,
      repayment_amount: terms.repayment,
      term_days: terms.termDays,
      eligibility_score: eligibility.score,
      average_monthly_sales: eligibility.averageMonthlySales,
      status: "offered",
      submitted_at: now,
      offered_at: now,
      created_by: userId,
      application_data: { fee: terms.fee, reasons: eligibility.reasons },
    })
    .select("*")
    .single();

  if (error || !data) {
    throw createError({
      statusCode: 400,
      statusMessage: `Demande échouée: ${error?.message ?? "inconnue"}`,
    });
  }

  return { ok: true, advance: data };
});
