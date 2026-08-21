import { createError, defineEventHandler, getRouterParam, readBody } from "h3";
import { requireAdmin } from "../../utils/requireAdmin";

type UpdateBody = {
  status?: "open" | "acknowledged" | "resolved" | "false_positive";
};

/**
 * Met à jour le statut d'une anomalie (acquitter / résoudre / faux positif).
 */
export default defineEventHandler(async (event) => {
  const { adminClient, companyId, userId } = await requireAdmin(event, [
    "admin",
    "super_admin",
  ]);

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "ID manquant" });
  }

  const body = await readBody<UpdateBody>(event);
  const allowedStatuses = [
    "open",
    "acknowledged",
    "resolved",
    "false_positive",
  ];
  if (!body.status || !allowedStatuses.includes(body.status)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Statut invalide",
    });
  }

  const patch: Record<string, unknown> = {
    status: body.status,
    updated_at: new Date().toISOString(),
  };
  if (body.status === "acknowledged" && userId) {
    patch.acknowledged_by = userId;
    patch.acknowledged_at = new Date().toISOString();
  }

  const { data, error } = await adminClient
    .from("cash_anomalies")
    .update(patch)
    .eq("id", id)
    .eq("company_id", companyId)
    .select()
    .maybeSingle();

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message });
  }
  if (!data) {
    throw createError({
      statusCode: 404,
      statusMessage: "Anomalie introuvable pour cette compagnie",
    });
  }

  return { ok: true, anomaly: data };
});
