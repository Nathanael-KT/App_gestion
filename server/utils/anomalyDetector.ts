import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Moteur de détection d'anomalies / anti-fraude pour la caisse et les ventes.
 *
 * Analyse les données existantes (daily_closings, cash_counts, cash_transactions,
 * invoices, payments, products_carreaux) et produit une liste d'anomalies
 * classées par sévérité, plus un score de risque global (0-100).
 *
 * Toutes les fonctions tolèrent l'absence de données (retournent un tableau vide).
 */

export type AnomalySeverity = "low" | "medium" | "high" | "critical";

export interface DetectedAnomaly {
  type: string;
  severity: AnomalySeverity;
  title: string;
  description: string;
  amount: number | null;
  magasin_id?: string | null;
  related_id?: string | null;
  related_table?: string | null;
  metadata?: Record<string, unknown>;
  /** Signature stable pour éviter les doublons lors des re-scans. */
  signature: string;
}

export interface AnomalyScanResult {
  anomalies: DetectedAnomaly[];
  score: number;
  counts: Record<AnomalySeverity, number>;
  scannedAt: string;
}

interface ScanOptions {
  /** Fenêtre d'analyse en jours (défaut: 30). */
  days?: number;
  /** Seuil d'écart de caisse déclenchant une alerte (défaut: 1% ou montant fixe). */
  discrepancyThreshold?: number;
}

const severityWeight: Record<AnomalySeverity, number> = {
  low: 1,
  medium: 3,
  high: 7,
  critical: 12,
};

const emptyCounts = (): Record<AnomalySeverity, number> => ({
  low: 0,
  medium: 0,
  high: 0,
  critical: 0,
});

function money(n: unknown): number | null {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
}

/** Écart de caisse sur une clôture journalière. */
function detectCashDiscrepancies(
  closings: Array<Record<string, unknown>>,
  threshold: number,
): DetectedAnomaly[] {
  const out: DetectedAnomaly[] = [];
  for (const c of closings) {
    const diff = Number(c.difference ?? 0);
    const theoretical = Number(c.theoretical_balance ?? 0);
    if (!Number.isFinite(diff) || Math.abs(diff) < threshold) continue;

    const ratio =
      theoretical > 0 ? Math.abs(diff) / theoretical : Math.abs(diff) / threshold;

    const severity: AnomalySeverity =
      Math.abs(diff) >= threshold * 10 || ratio >= 0.1
        ? "critical"
        : ratio >= 0.05 || Math.abs(diff) >= threshold * 5
          ? "high"
          : "medium";

    const direction = diff < 0 ? "manquant" : "excédentaire";
    out.push({
      type: "cash_discrepancy",
      severity,
      title: `Caisse ${direction} le ${c.date}`,
      description: `Écart de ${diff.toFixed(2)} entre le solde théorique (${theoretical.toFixed(2)}) et le comptage réel (${Number(c.actual_count ?? 0).toFixed(2)}) lors de la clôture du ${c.date}.`,
      amount: money(diff),
      magasin_id: (c.magasin_id as string) ?? null,
      related_id: (c.id as string) ?? null,
      related_table: "daily_closings",
      metadata: { date: c.date, theoretical, actual: c.actual_count },
      signature: `cash_discrepancy:${c.id}`,
    });
  }
  return out;
}

/** Écarts sur les comptages de caisse ponctuels (cash_counts). */
function detectCashCountDiscrepancies(
  counts: Array<Record<string, unknown>>,
  threshold: number,
): DetectedAnomaly[] {
  const out: DetectedAnomaly[] = [];
  for (const c of counts) {
    const diff = Number(c.difference ?? 0);
    if (!Number.isFinite(diff) || Math.abs(diff) < threshold) continue;
    const severity: AnomalySeverity =
      Math.abs(diff) >= threshold * 10 ? "high" : "medium";
    out.push({
      type: "cash_count_discrepancy",
      severity,
      title: `Comptage ${c.count_type} avec écart le ${c.date}`,
      description: `Écart de ${diff.toFixed(2)} (attendu ${Number(c.expected_amount ?? 0).toFixed(2)} / réel ${Number(c.actual_amount ?? 0).toFixed(2)}).`,
      amount: money(diff),
      magasin_id: (c.magasin_id as string) ?? null,
      related_id: (c.id as string) ?? null,
      related_table: "cash_counts",
      metadata: { date: c.date, count_type: c.count_type },
      signature: `cash_count_discrepancy:${c.id}`,
    });
  }
  return out;
}

/** Sorties d'espèces manuelles inhabituelles (retraits/versements importants). */
function detectLargeManualMovements(
  txs: Array<Record<string, unknown>>,
  threshold: number,
): DetectedAnomaly[] {
  const out: DetectedAnomaly[] = [];
  for (const t of txs) {
    const amount = Number(t.amount ?? 0);
    const type = String(t.type ?? "").toLowerCase();
    const isOut = type.includes("sortie") || type.includes("out") || type.includes("retrait");
    if (!isOut || !Number.isFinite(amount) || amount < threshold * 5) continue;

    out.push({
      type: "large_cash_out",
      severity: amount >= threshold * 20 ? "high" : "medium",
      title: `Sortie d'espèces importante : ${amount.toFixed(2)}`,
      description: `Mouvement manuel de ${amount.toFixed(2)} (${t.reason ?? "sans motif"})${t.created_by ? ` par ${t.created_by}` : ""}.`,
      amount: money(amount),
      magasin_id: (t.magasin_id as string) ?? null,
      related_id: (t.id as string) ?? null,
      related_table: "cash_transactions",
      metadata: { reason: t.reason, created_by: t.created_by, created_at: t.created_at },
      signature: `large_cash_out:${t.id}`,
    });
  }
  return out;
}

/** Ventes encaissées en dehors des heures d'ouverture (7h-22h). */
function detectAfterHoursSales(
  invoices: Array<Record<string, unknown>>,
): DetectedAnomaly[] {
  const out: DetectedAnomaly[] = [];
  for (const inv of invoices) {
    const raw = inv.created_at as string | undefined;
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    const h = d.getHours();
    if (h >= 7 && h < 22) continue;
    const total = Number(inv.total ?? 0);
    out.push({
      type: "after_hours_sale",
      severity: total >= 500 ? "high" : "low",
      title: `Vente hors horaires (${String(h).padStart(2, "0")}h)`,
      description: `Facture de ${total.toFixed(2)} encaissée à ${d.toLocaleTimeString("fr-FR")} le ${d.toLocaleDateString("fr-FR")}, en dehors des heures normales (07h-22h).`,
      amount: money(total),
      magasin_id: (inv.magasin_id as string) ?? null,
      related_id: (inv.id as string) ?? null,
      related_table: "invoices",
      metadata: { at: raw, hour: h },
      signature: `after_hours_sale:${inv.id}`,
    });
  }
  return out;
}

/** Ventes au montant anormalement élevé vs la moyenne. */
function detectLargeSales(
  invoices: Array<Record<string, unknown>>,
): DetectedAnomaly[] {
  const totals = invoices
    .map((i) => Number(i.total ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (totals.length < 10) return [];
  totals.sort((a, b) => a - b);
  const median = totals[Math.floor(totals.length / 2)] ?? 0;
  const out: DetectedAnomaly[] = [];
  for (const inv of invoices) {
    const total = Number(inv.total ?? 0);
    if (!Number.isFinite(total) || median <= 0) continue;
    if (total >= median * 8 && total >= 1000) {
      out.push({
        type: "large_sale",
        severity: "medium",
        title: `Vente atypique : ${total.toFixed(2)}`,
        description: `Montant ${Math.round(total / median)}x supérieur à la vente médiane (${median.toFixed(2)}). À vérifier pour exclure une erreur de saisie.`,
        amount: money(total),
        magasin_id: (inv.magasin_id as string) ?? null,
        related_id: (inv.id as string) ?? null,
        related_table: "invoices",
        metadata: { total, median },
        signature: `large_sale:${inv.id}`,
      });
    }
  }
  return out;
}

/** Paiements en double (même facture / même référence, montants proches). */
function detectDuplicatePayments(
  payments: Array<Record<string, unknown>>,
): DetectedAnomaly[] {
  const out: DetectedAnomaly[] = [];
  const byKey = new Map<string, Array<Record<string, unknown>>>();
  for (const p of payments) {
    const key =
      (p.reference as string) ||
      `inv:${p.invoice_id}:${Number(p.amount ?? 0).toFixed(2)}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(p);
  }
  for (const [, group] of byKey) {
    if (group.length < 2) continue;
    const first = group[0];
    if (!first) continue;
    const ref = first.reference as string;
    const sum = group.reduce((s, p) => s + Number(p.amount ?? 0), 0);
    out.push({
      type: "duplicate_payment",
      severity: "high",
      title: `Paiement en double détecté`,
      description: `${group.length} paiements correspondent (référence/montant) pour un total de ${sum.toFixed(2)}. Risque de double encaissement ou d'erreur.`,
      amount: money(sum),
      magasin_id: (first.magasin_id as string) ?? null,
      related_id: (first.id as string) ?? null,
      related_table: "payments",
      metadata: { reference: ref, count: group.length, ids: group.map((g) => g.id) },
      signature: `duplicate_payment:${ref || first.id}`,
    });
  }
  return out;
}

/** Stock négatif (sur-vente ou saisie erronée). */
function detectNegativeStock(
  products: Array<Record<string, unknown>>,
): DetectedAnomaly[] {
  const out: DetectedAnomaly[] = [];
  for (const p of products) {
    const qty = Number(p.stock ?? 0);
    if (Number.isFinite(qty) && qty < 0) {
      out.push({
        type: "negative_stock",
        severity: "high",
        title: `Stock négatif : ${p.name}`,
        description: `Le produit "${p.name}" a un stock de ${qty}. Cela indique une sur-vente ou un inventaire incorrect.`,
        amount: null,
        related_id: (p.id as string) ?? null,
        related_table: "products_carreaux",
        metadata: { name: p.name, stock: qty },
        signature: `negative_stock:${p.id}`,
      });
    }
  }
  return out;
}

/**
 * Lance un scan complet d'anomalies pour une compagnie.
 */
export async function runAnomalyScan(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: SupabaseClient<any, "public", any>,
  companyId: string,
  options: ScanOptions = {},
): Promise<AnomalyScanResult> {
  const days = options.days ?? 30;
  const threshold = options.discrepancyThreshold ?? 5;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // Plusieurs tables de caisse/ventes ne portent que magasin_id (pas company_id).
  // On récupère donc les magasins de la compagnie pour sco per correctement.
  const { data: magasins } = await adminClient
    .from("magasins")
    .select("id")
    .eq("company_id", companyId);
  const magasinIds = ((magasins as Array<{ id: string }>) ?? []).map((m) => m.id);

  const empty: AnomalyScanResult = {
    anomalies: [],
    score: 0,
    counts: emptyCounts(),
    scannedAt: new Date().toISOString(),
  };
  if (magasinIds.length === 0) return empty;

  // Clôtures journalières (scopées par magasin)
  const { data: closings } = await adminClient
    .from("daily_closings")
    .select("id, date, difference, theoretical_balance, actual_count, magasin_id")
    .in("magasin_id", magasinIds)
    .gte("date", since)
    .order("date", { ascending: false });

  // Comptages ponctuels
  const { data: counts } = await adminClient
    .from("cash_counts")
    .select("id, date, count_type, expected_amount, actual_amount, difference, magasin_id")
    .in("magasin_id", magasinIds)
    .gte("date", since)
    .order("date", { ascending: false });

  // Mouvements de caisse manuels
  const { data: txs } = await adminClient
    .from("cash_transactions")
    .select("id, type, amount, reason, created_by, magasin_id, created_at")
    .in("magasin_id", magasinIds)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  // Factures (pour ventes hors heures + ventes atypiques)
  const { data: invoices } = await adminClient
    .from("invoices")
    .select("id, total, status, magasin_id, created_at")
    .in("magasin_id", magasinIds)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  // Paiements (doublons) - dispose de company_id
  const { data: payments } = await adminClient
    .from("payments")
    .select("id, invoice_id, amount, reference, magasin_id, payment_date")
    .eq("company_id", companyId)
    .gte("payment_date", since)
    .order("payment_date", { ascending: false })
    .limit(1000);

  // Produits (stock négatif) - dispose de company_id
  const { data: products } = await adminClient
    .from("products_carreaux")
    .select("id, name, stock")
    .eq("company_id", companyId)
    .lt("stock", 0);

  const anomalies: DetectedAnomaly[] = [
    ...detectCashDiscrepancies((closings as Array<Record<string, unknown>>) ?? [], threshold),
    ...detectCashCountDiscrepancies((counts as Array<Record<string, unknown>>) ?? [], threshold),
    ...detectLargeManualMovements((txs as Array<Record<string, unknown>>) ?? [], threshold),
    ...detectAfterHoursSales((invoices as Array<Record<string, unknown>>) ?? []),
    ...detectLargeSales((invoices as Array<Record<string, unknown>>) ?? []),
    ...detectDuplicatePayments((payments as Array<Record<string, unknown>>) ?? []),
    ...detectNegativeStock((products as Array<Record<string, unknown>>) ?? []),
  ];

  // Score de risque global pondéré (plafonné à 100)
  const weighted = anomalies.reduce(
    (sum, a) => sum + severityWeight[a.severity],
    0,
  );
  const score = Math.min(100, Math.round((weighted / (weighted + 15)) * 100));

  const counts2 = emptyCounts();
  for (const a of anomalies) counts2[a.severity] += 1;

  return {
    anomalies,
    score,
    counts: counts2,
    scannedAt: new Date().toISOString(),
  };
}
