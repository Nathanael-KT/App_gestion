import { createClient } from "@supabase/supabase-js";
import { createError, defineEventHandler, getRouterParam } from "h3";
import { getProviderStatus } from "../../utils/mobileMoney";

/**
 * Détail public d'une session de paiement QR (lue par le client qui scanne le QR).
 * Aucune authentification : l'identifiant (uuid) fait office de jeton.
 * On ne renvoie que les champs nécessaires à l'encaissement.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "ID manquant" });

  const config = useRuntimeConfig(event);
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || (config.public.supabaseUrl as string);
  const serviceKey = config.supabaseServiceRoleKey as string;
  if (!supabaseUrl || !serviceKey) {
    throw createError({ statusCode: 500, statusMessage: "Configuration serveur incomplète" });
  }
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data, error } = await adminClient
    .from("qr_payments")
    .select("id, reference, amount, currency, status, provider, note, customer_name, expires_at, paid_at, company:company_settings(company_name), magasin:magasins(nom)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: "Paiement introuvable" });
  }

  const isExpired =
    !data.paid_at &&
    data.status === "pending" &&
    data.expires_at &&
    new Date(data.expires_at).getTime() < Date.now();

  const providers = getProviderStatus(config as Record<string, unknown>);

  return {
    ok: true,
    payment: {
      id: data.id,
      reference: data.reference,
      amount: Number(data.amount),
      currency: data.currency,
      status: isExpired ? "expired" : data.status,
      provider: data.provider,
      note: data.note,
      customerName: data.customer_name,
      merchantName:
        (data.company as { company_name?: string } | null)?.company_name ||
        (data.magasin as { nom?: string } | null)?.nom ||
        "Le marchand",
      expiresAt: data.expires_at,
      paidAt: data.paid_at,
    },
    providers,
  };
});
