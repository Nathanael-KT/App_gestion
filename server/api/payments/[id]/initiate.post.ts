import { createClient } from "@supabase/supabase-js";
import {
  createError,
  defineEventHandler,
  getRouterParam,
  getHeader,
  readBody,
} from "h3";
import { initiateMobilePayment, type MobileProvider } from "../../../utils/mobileMoney";
import { applyPaymentSuccess } from "../../../utils/qrPayment";

interface InitiateBody {
  provider: MobileProvider;
  customerPhone: string;
}

/**
 * Le client initie un paiement Mobile Money (MTN/Orange) depuis la page de
 * paiement publique. Met à jour la session puis renvoie le statut (et l'URL
 * de paiement Orange si redirection nécessaire).
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

  const body = await readBody<InitiateBody>(event);
  if (!body?.provider || !["mtn", "orange"].includes(body.provider)) {
    throw createError({ statusCode: 400, statusMessage: "Opérateur invalide" });
  }
  const phone = String(body.customerPhone || "").replace(/[^\d+]/g, "");
  if (phone.length < 8) {
    throw createError({ statusCode: 400, statusMessage: "Numéro de téléphone invalide" });
  }

  const { data: payment, error } = await adminClient
    .from("qr_payments")
    .select("id, amount, currency, reference, status, expires_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !payment) {
    throw createError({ statusCode: 404, statusMessage: "Paiement introuvable" });
  }
  if (payment.status === "success") {
    throw createError({ statusCode: 409, statusMessage: "Paiement déjà effectué" });
  }
  if (
    payment.status === "pending" &&
    payment.expires_at &&
    new Date(payment.expires_at).getTime() < Date.now()
  ) {
    throw createError({ statusCode: 410, statusMessage: "Session de paiement expirée" });
  }

  const baseUrl = (
    (config.public.siteUrl as string) ||
    `${getHeader(event, "x-forwarded-proto") || "https"}://${getHeader(event, "host")}`
  ).replace(/\/$/, "");
  const notifyUrl = `${baseUrl}/api/payments/callback`;
  const returnUrl = `${baseUrl}/paiement/${id}`;

  const result = await initiateMobilePayment(
    config as Record<string, unknown>,
    {
      provider: body.provider,
      amount: Number(payment.amount),
      currency: payment.currency,
      externalId: payment.reference,
      customerPhone: phone,
      notifyUrl,
      returnUrl,
      payerMessage: `Paiement ${payment.reference}`,
    },
  );

  const update: Record<string, unknown> = {
    provider: body.provider,
    customer_phone: phone,
    provider_reference: result.providerReference,
    status: result.status === "success" ? "success" : "initiated",
    provider_payload: {
      mode: result.mode,
      message: result.message,
      paymentUrl: result.paymentUrl ?? null,
    },
    paid_at: result.status === "success" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  await adminClient.from("qr_payments").update(update).eq("id", id);

  // Succès immédiat (rare, ex. Orange synchrone) : marquer la facture liée payée
  let invoiceMarked = false;
  if (result.status === "success") {
    const r = await applyPaymentSuccess(adminClient, id);
    invoiceMarked = r.invoiceMarked === true;
  }

  return {
    ok: result.ok,
    status: update.status,
    mode: result.mode,
    paymentUrl: result.paymentUrl ?? null,
    message: result.message ?? null,
    invoiceMarked,
  };
});
