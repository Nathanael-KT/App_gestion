import { createError, defineEventHandler, getRouterParam } from "h3";
import { requireAdmin } from "../../../utils/requireAdmin";

/**
 * Le commerçant accepte une offre d'avance de trésorerie (statut "accepted").
 * Le déblocage des fonds (statut "disbursed") dépend du partenaire de financement.
 */
export default defineEventHandler(async (event) => {
  const { adminClient, companyId } = await requireAdmin(event, [
    "admin",
    "super_admin",
  ]);
  const id = getRouterParam(event, "id");
  if (!id || !companyId) {
    throw createError({ statusCode: 400, statusMessage: "Paramètres manquants" });
  }

  const { data, error } = await adminClient
    .from("cash_advances")
    .update({
      status: "accepted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", companyId)
    .in("status", ["offered"])
    .select("id, status, offered_amount, repayment_amount, term_days")
    .maybeSingle();

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message });
  }
  if (!data) {
    throw createError({
      statusCode: 404,
      statusMessage: "Offre introuvable ou déjà traitée",
    });
  }

  return { ok: true, advance: data };
});
