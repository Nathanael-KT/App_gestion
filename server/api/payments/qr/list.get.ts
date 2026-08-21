import { createError, defineEventHandler } from "h3";
import { requireAdmin } from "../../../utils/requireAdmin";

/**
 * Liste les sessions de paiement QR de la compagnie (caissier), récentes d'abord.
 */
export default defineEventHandler(async (event) => {
  const { adminClient, companyId } = await requireAdmin(event, [
    "admin",
    "employe",
    "super_admin",
  ]);
  if (!companyId) {
    throw createError({ statusCode: 400, statusMessage: "Aucune compagnie associée" });
  }

  const { data, error } = await adminClient
    .from("qr_payments")
    .select(
      "id, reference, amount, currency, status, provider, customer_name, created_at, paid_at",
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message });
  }

  return { ok: true, payments: data ?? [] };
});
