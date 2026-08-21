import { createError, defineEventHandler, getRouterParam } from "h3";
import { requireAdmin } from "../../../utils/requireAdmin";

/**
 * Annule une session de paiement QR en attente (côté caissier).
 */
export default defineEventHandler(async (event) => {
  const { adminClient, companyId } = await requireAdmin(event, [
    "admin",
    "employe",
    "super_admin",
  ]);
  const id = getRouterParam(event, "id");
  if (!id || !companyId) {
    throw createError({ statusCode: 400, statusMessage: "Paramètres manquants" });
  }

  const { data, error } = await adminClient
    .from("qr_payments")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", companyId)
    .in("status", ["pending", "initiated"])
    .select("id, status")
    .maybeSingle();

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message });
  }
  if (!data) {
    throw createError({
      statusCode: 404,
      statusMessage: "Session introuvable ou non annulable",
    });
  }

  return { ok: true, status: data.status };
});
