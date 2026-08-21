import { createError, defineEventHandler, getQuery } from "h3";
import { requireAdmin } from "../../utils/requireAdmin";

/**
 * Liste les anomalies persistées pour la compagnie courante.
 * Query params:
 *   - status: filtrer par statut (open, acknowledged, resolved, false_positive)
 *   - severity: filtrer par sévérité
 *   - limit (défaut 100)
 */
export default defineEventHandler(async (event) => {
  const { adminClient, companyId } = await requireAdmin(event, [
    "admin",
    "super_admin",
  ]);

  if (!companyId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Aucune compagnie associée à cet utilisateur",
    });
  }

  const query = getQuery(event);
  const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500);

  let req = adminClient
    .from("cash_anomalies")
    .select("*")
    .eq("company_id", companyId)
    .order("detected_at", { ascending: false })
    .limit(limit);

  if (query.status) req = req.eq("status", String(query.status));
  if (query.severity) req = req.eq("severity", String(query.severity));

  const { data, error } = await req;

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message });
  }

  // Compteurs par statut pour l'UI
  const { data: stats } = await adminClient
    .from("cash_anomalies")
    .select("status, severity")
    .eq("company_id", companyId);

  const byStatus: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const row of (stats as Array<Record<string, string | null>>) ?? []) {
    const st = row.status;
    if (st) byStatus[st] = (byStatus[st] ?? 0) + 1;
    const sv = row.severity;
    if (sv) bySeverity[sv] = (bySeverity[sv] ?? 0) + 1;
  }

  return {
    ok: true,
    anomalies: data ?? [],
    stats: { byStatus, bySeverity },
  };
});
