import { createError, defineEventHandler, getHeader, readBody } from "h3";
import { requireAdmin } from "../../../utils/requireAdmin";

interface CreateBody {
  amount: number;
  currency?: string;
  note?: string;
  customerName?: string;
  cart?: unknown;
  provider?: string;
}

function makeReference(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `QR-${ymd}-${rnd}`;
}

function publicSiteUrl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any,
  siteUrl: string | undefined,
): string {
  if (siteUrl) return siteUrl.replace(/\/$/, "");
  // Fallback : reconstruire depuis les en-têtes de la requête
  const proto = (getHeader(event, "x-forwarded-proto") as string) || "https";
  const host = (getHeader(event, "host") as string) || "localhost";
  return `${proto}://${host}`;
}

/**
 * Crée une session de paiement QR (caissier).
 * Renvoie l'URL publique de paiement que le client ouvrira en scannant le QR.
 */
export default defineEventHandler(async (event) => {
  const { adminClient, companyId, userId } = await requireAdmin(event, [
    "admin",
    "employe",
    "super_admin",
  ]);

  if (!companyId) {
    throw createError({ statusCode: 400, statusMessage: "Aucune compagnie associée" });
  }

  const body = await readBody<CreateBody>(event);
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw createError({ statusCode: 400, statusMessage: "Montant invalide" });
  }

  const reference = makeReference();
  const config = useRuntimeConfig(event);
  const baseUrl = publicSiteUrl(event, config.public.siteUrl as string);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 min

  const { data, error } = await adminClient
    .from("qr_payments")
    .insert({
      company_id: companyId,
      magasin_id: null,
      reference,
      amount: Math.round(amount * 100) / 100,
      currency: body.currency || "XOF",
      status: "pending",
      note: body.note || null,
      customer_name: body.customerName || null,
      cart: body.cart ?? null,
      created_by: userId,
      cashier_user_id: userId,
      expires_at: expiresAt.toISOString(),
    })
    .select("id, reference, amount, currency, expires_at")
    .single();

  if (error || !data) {
    throw createError({
      statusCode: 400,
      statusMessage: `Création du paiement échouée: ${error?.message ?? "inconnue"}`,
    });
  }

  return {
    ok: true,
    payment: {
      id: data.id,
      reference: data.reference,
      amount: Number(data.amount),
      currency: data.currency,
      expiresAt: data.expires_at,
      paymentUrl: `${baseUrl}/paiement/${data.id}`,
    },
  };
});
