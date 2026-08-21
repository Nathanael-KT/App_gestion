import { createError, defineEventHandler, getQuery } from "h3";
import { requireAdmin } from "../../utils/requireAdmin";
import { runAnomalyScan } from "../../utils/anomalyDetector";

/**
 * Lance un scan d'anomalies pour la compagnie courante (admin/super_admin).
 * Les nouvelles anomalies détectées sont persistées dans `cash_anomalies`,
 * sans recréer celles déjà ouvertes (dédoublonnage par signature).
 *
 * Query params:
 *   - days: fenêtre d'analyse en jours (défaut 30)
 *   - persist: "false" pour ne pas persister (scan à sec)
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
  const days = Math.min(Math.max(Number(query.days) || 30, 1), 365);
  const persist = String(query.persist ?? "true") !== "false";

  const result = await runAnomalyScan(adminClient, companyId, { days });

  if (!persist) {
    return { ok: true, persisted: false, ...result };
  }

  // Dédoublonnage : on ne réinsère pas une anomalie déjà ouverte (même signature).
  const { data: existing } = await adminClient
    .from("cash_anomalies")
    .select("metadata")
    .eq("company_id", companyId)
    .in("status", ["open", "acknowledged"]);

  const knownSignatures = new Set<string>();
  for (const row of (existing as Array<{ metadata?: { signature?: string } }>) ?? []) {
    const sig = row.metadata?.signature;
    if (typeof sig === "string") knownSignatures.add(sig);
  }

  const toInsert = result.anomalies
    .filter((a) => !knownSignatures.has(a.signature))
    .map((a) => ({
      company_id: companyId,
      type: a.type,
      severity: a.severity,
      title: a.title,
      description: a.description,
      amount: a.amount,
      magasin_id: a.magasin_id ?? null,
      related_id: a.related_id ?? null,
      related_table: a.related_table ?? null,
      metadata: { ...(a.metadata ?? {}), signature: a.signature },
      status: "open",
    }));

  let inserted = 0;
  if (toInsert.length > 0) {
    const { error } = await adminClient
      .from("cash_anomalies")
      .insert(toInsert);
    if (error) {
      throw createError({
        statusCode: 400,
        statusMessage: `Erreur lors de l'enregistrement des anomalies: ${error.message}`,
      });
    }
    inserted = toInsert.length;
  }

  return {
    ok: true,
    persisted: true,
    inserted,
    ...result,
  };
});
