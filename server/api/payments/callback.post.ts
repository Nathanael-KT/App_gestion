import { createClient } from "@supabase/supabase-js";
import { defineEventHandler, readBody, getHeader } from "h3";
import { applyPaymentSuccess } from "../../utils/qrPayment";

/**
 * Webhook de notification des opérateurs Mobile Money (MTN MoMo / Orange Money).
 *
 * MTN : POST du statut de la transaction (body: { financialTransactionId, status, ... }).
 * Orange : POST avec { pay_token, status, txnid, ... } sur l'URL notif_url.
 *
 * Sécurité : ce point de départ accepte un header optionnel `x-payment-secret`.
 * Si la variable d'env PAYMENT_WEBHOOK_SECRET est définie, elle doit correspondre.
 * En production, il FAUT en plus vérifier la signature propre à chaque opérateur.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);

  // Vérification optionnelle par secret partagé
  const expectedSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (expectedSecret) {
    const provided = getHeader(event, "x-payment-secret");
    if (provided !== expectedSecret) {
      return { ok: false, ignored: true };
    }
  }

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || (config.public.supabaseUrl as string);
  const serviceKey = config.supabaseServiceRoleKey as string;
  if (!supabaseUrl || !serviceKey) {
    return { ok: false, error: "config" };
  }
  const adminClient = createClient(supabaseUrl, serviceKey);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = (await readBody<any>(event).catch(() => null)) ?? {};

  const reference =
    body?.externalId || body?.reference || body?.pay_token || body?.txnid;
  const providerReference =
    body?.pay_token || body?.financialTransactionId || body?.id || reference;

  const rawStatus = String(body?.status ?? body?.transactionStatus ?? "").toUpperCase();
  const success =
    ["SUCCESSFUL", "SUCCESS", "COMPLETE", "COMPLETED", "APPROVED"].includes(rawStatus);
  const failed = ["FAILED", "REJECTED", "CANCELLED", "CANCELED", "DECLINED", "EXPIRED"].includes(
    rawStatus,
  );

  if (!reference) {
    // Notification sans identifiant exploitable : on accuse réception sans rien faire.
    return { ok: true, matched: false };
  }

  // Recherche par référence ou provider_reference
  const { data: payment } = await adminClient
    .from("qr_payments")
    .select("id, status")
    .or(`reference.eq.${reference},provider_reference.eq.${providerReference}`)
    .limit(1)
    .maybeSingle();

  if (!payment) {
    return { ok: true, matched: false };
  }
  if (payment.status === "success") {
    return { ok: true, already: true };
  }

  const newStatus = success ? "success" : failed ? "failed" : null;
  if (!newStatus) {
    return { ok: true, ignored: true };
  }

  if (newStatus === "success") {
    // Marque la session ET la facture/commande liée comme payées
    await adminClient
      .from("qr_payments")
      .update({ provider_payload: body, updated_at: new Date().toISOString() })
      .eq("id", payment.id);
    await applyPaymentSuccess(adminClient, payment.id);
  } else {
    await adminClient
      .from("qr_payments")
      .update({
        status: newStatus,
        provider_payload: body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);
  }

  return { ok: true, matched: true, status: newStatus };
});
