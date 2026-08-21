import { createClient } from "@supabase/supabase-js";
import { createError, defineEventHandler, getRouterParam } from "h3";

/**
 * Mode démo uniquement : valide une session de paiement comme "succès" sans
 * appel opérateur. Permet de tester le flux QR de bout en bout sans
 * identifiants MTN/Orange. Refusé si la session a été initiée en mode "live".
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "ID manquant" });

  const config = useRuntimeConfig(event);
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || (config.public.supabaseUrl as string);
  const serviceKey = config.supabaseServiceRoleKey as string;
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: payment } = await adminClient
    .from("qr_payments")
    .select("id, status, provider_payload")
    .eq("id", id)
    .maybeSingle();
  if (!payment) {
    throw createError({ statusCode: 404, statusMessage: "Paiement introuvable" });
  }

  const mode = (payment.provider_payload as { mode?: string } | null)?.mode;
  if (mode !== "demo") {
    throw createError({
      statusCode: 403,
      statusMessage: "Simulation réservée au mode démo",
    });
  }

  await adminClient
    .from("qr_payments")
    .update({
      status: "success",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return { ok: true, status: "success" };
});
