import { createError, defineEventHandler } from "h3";
import { requireAdmin } from "../../utils/requireAdmin";

/**
 * Liste les demandes d'avance de trésorerie de la compagnie.
 */
export default defineEventHandler(async (event) => {
  const { adminClient, companyId } = await requireAdmin(event, [
    "admin",
    "super_admin",
  ]);
  if (!companyId) {
    throw createError({ statusCode: 400, statusMessage: "Aucune compagnie associée" });
  }

  const { data, error } = await adminClient
    .from("cash_advances")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message });
  }
  return { ok: true, advances: data ?? [] };
});
