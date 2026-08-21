import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Helpers partagés pour le paiement QR :
 *  - resolveInvoice() : valide qu'une facture appartient à la compagnie.
 *  - applyPaymentSuccess() : passe une session QR à "success" ET, si elle est
 *    liée à une facture/commande, marque celle-ci comme payée + enregistre un
 *    paiement (Mobile Money). Idempotent.
 */

function providerToMethod(provider: string | null): string {
  if (provider === "mtn") return "mtn";
  if (provider === "orange") return "orange";
  return "mobile_money";
}

export interface InvoiceSummary {
  id: string;
  reference: string | null;
  total: number;
  status: string;
  client_name: string | null;
  magasin_id: string | null;
  date: string | null;
}

/** Liste les factures impayées (commandes à encaisser) avec le nom du client. */
export async function listUnpaidInvoices(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: SupabaseClient<any, "public", any>,
  companyId: string,
  magasinId?: string | null,
): Promise<InvoiceSummary[]> {
  // On reproduit le pattern éprouvé de la page Factures (jointure clients(name)).
  let req = adminClient
    .from("invoices")
    .select("id, reference, total, status, date, magasin_id, clients(name)")
    .neq("status", "paid")
    .order("date", { ascending: false })
    .limit(100);

  if (magasinId) {
    req = req.eq("magasin_id", magasinId);
  } else {
    // Fallback : tous les magasins de la compagnie
    const { data: magasins } = await adminClient
      .from("magasins")
      .select("id")
      .eq("company_id", companyId);
    const magasinIds = ((magasins as Array<{ id: string }>) ?? []).map((m) => m.id);
    if (magasinIds.length === 0) return [];
    req = req.in("magasin_id", magasinIds);
  }

  const { data, error } = await req;
  if (error) {
    throw new Error(`Impossible de charger les commandes: ${error.message}`);
  }

  return ((data as Array<Record<string, unknown>>) ?? []).map((inv) => ({
    id: String(inv.id),
    reference: (inv.reference as string) ?? null,
    total: Number(inv.total ?? 0),
    status: String(inv.status ?? ""),
    date: (inv.date as string) ?? null,
    magasin_id: (inv.magasin_id as string) ?? null,
    client_name:
      (inv.clients as { name?: string } | null)?.name ?? null,
  }));
}

/** Valide qu'une facture appartient à la compagnie et renvoie son résumé. */
export async function resolveInvoice(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: SupabaseClient<any, "public", any>,
  companyId: string,
  invoiceId: string,
  magasinId?: string | null,
): Promise<InvoiceSummary | null> {
  let req = adminClient
    .from("invoices")
    .select("id, reference, total, status, date, magasin_id, clients(name)")
    .eq("id", invoiceId);

  if (magasinId) {
    req = req.eq("magasin_id", magasinId);
  } else {
    const { data: magasins } = await adminClient
      .from("magasins")
      .select("id")
      .eq("company_id", companyId);
    const magasinIds = ((magasins as Array<{ id: string }>) ?? []).map((m) => m.id);
    if (magasinIds.length === 0) return null;
    req = req.in("magasin_id", magasinIds);
  }

  const { data, error } = await req.maybeSingle();
  if (error || !data) return null;

  const inv = data as Record<string, unknown>;
  return {
    id: String(inv.id),
    reference: (inv.reference as string) ?? null,
    total: Number(inv.total ?? 0),
    status: String(inv.status ?? ""),
    date: (inv.date as string) ?? null,
    magasin_id: (inv.magasin_id as string) ?? null,
    client_name:
      (inv.clients as { name?: string } | null)?.name ?? null,
  };
}

/**
 * Passe une session QR au statut "success" et, si une facture est liée,
 * la marque payée + enregistre le paiement Mobile Money (idempotent).
 */
export async function applyPaymentSuccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: SupabaseClient<any, "public", any>,
  paymentId: string,
): Promise<{ ok: boolean; invoiceMarked?: boolean }> {
  const { data: payment } = await adminClient
    .from("qr_payments")
    .select("id, status, invoice_id, amount, currency, reference, provider, company_id, magasin_id")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) return { ok: false };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = payment as any;

  // 1. Marquer la session comme réussie (si pas déjà fait)
  if (p.status !== "success") {
    await adminClient
      .from("qr_payments")
      .update({
        status: "success",
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId);
  }

  // 2. Si une facture est liée, la marquer payée + enregistrer le paiement
  if (!p.invoice_id) return { ok: true };

  // Idempotence : ne pas ré-enregistrer un paiement déjà existant
  const { data: existing } = await adminClient
    .from("payments")
    .select("id")
    .eq("reference", p.reference)
    .maybeSingle();

  if (!existing) {
    await adminClient.from("payments").insert({
      invoice_id: p.invoice_id,
      amount: Number(p.amount ?? 0),
      payment_method: providerToMethod(p.provider),
      reference: p.reference,
      payment_date: new Date().toISOString().slice(0, 10),
      company_id: p.company_id,
      magasin_id: p.magasin_id,
    });
  }

  // Marquer la facture/commande comme payée
  await adminClient
    .from("invoices")
    .update({ status: "paid" })
    .eq("id", p.invoice_id);

  return { ok: true, invoiceMarked: true };
}
