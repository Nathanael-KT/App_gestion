import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Moteur d'éligibilité à l'avance de trésorerie (cash advance).
 *
 * Estime les ventes moyennes mensuelles à partir de l'historique des factures
 * puis propose une avance et ses conditions (frais, remboursement, échéance).
 * Indicatif : sans partenaire de financement configuré, l'offre est calculée
 * localement à partir des données de la compagnie.
 */

export interface EligibilityResult {
  eligible: boolean;
  score: number; // 0-100
  averageMonthlySales: number;
  invoiceCount: number;
  activeDays: number;
  maxAmount: number;
  factorRate: number; // ex 0.06 = 6%
  termDays: number;
  reasons: string[];
  computedAt: string;
}

const FACTOR_RATE = 0.06; // frais de service (6%)
const TERM_DAYS = 30; // remboursement sur 30 jours
const ADVANCE_RATIO = 0.8; // jusqu'à 80% d'un mois de ventes

/**
 * Calcule les conditions de remboursement pour un montant demandé.
 */
export function computeTerms(requestedAmount: number) {
  const amount = Math.max(0, Number(requestedAmount) || 0);
  const fee = Math.round(amount * FACTOR_RATE * 100) / 100;
  const repayment = Math.round((amount + fee) * 100) / 100;
  return {
    amount,
    fee,
    repayment,
    factorRate: FACTOR_RATE,
    termDays: TERM_DAYS,
    dueInDays: TERM_DAYS,
  };
}

export async function computeEligibility(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: SupabaseClient<any, "public", any>,
  companyId: string,
): Promise<EligibilityResult> {
  // invoices n'a pas company_id : on scope par les magasins de la compagnie
  const { data: magasins } = await adminClient
    .from("magasins")
    .select("id")
    .eq("company_id", companyId);
  const magasinIds = ((magasins as Array<{ id: string }>) ?? []).map((m) => m.id);

  const reasons: string[] = [];
  if (magasinIds.length === 0) {
    return {
      eligible: false,
      score: 0,
      averageMonthlySales: 0,
      invoiceCount: 0,
      activeDays: 0,
      maxAmount: 0,
      factorRate: FACTOR_RATE,
      termDays: TERM_DAYS,
      reasons: ["Aucun magasin configuré pour cette compagnie."],
      computedAt: new Date().toISOString(),
    };
  }

  const since = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
  const { data: invoices } = await adminClient
    .from("invoices")
    .select("total, created_at")
    .in("magasin_id", magasinIds)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);

  const list = (invoices as Array<{ total: number; created_at: string }>) ?? [];

  // Fenêtre de 90 jours pour la moyenne mensuelle
  const cutoff90 = Date.now() - 90 * 24 * 60 * 60 * 1000;
  let sum90 = 0;
  const daySet = new Set<string>();
  for (const inv of list) {
    const t = new Date(inv.created_at).getTime();
    if (Number.isFinite(t) && t >= cutoff90) {
      sum90 += Number(inv.total) || 0;
      daySet.add(new Date(t).toISOString().slice(0, 10));
    }
  }

  const averageMonthlySales = Math.round((sum90 / 3) * 100) / 100;
  const invoiceCount = list.length;
  const activeDays = daySet.size;

  // Score : volume (max 60) + régularité jours actifs (max 40)
  const volumeScore = Math.min(60, Math.round((sum90 / (500000 + 1)) * 60));
  const regularityScore = Math.min(40, Math.round((activeDays / 30) * 40));
  const score = Math.min(100, volumeScore + regularityScore);

  const maxAmount = Math.round(averageMonthlySales * ADVANCE_RATIO * 100) / 100;

  const eligible = invoiceCount >= 5 && averageMonthlySales > 0 && score >= 15;
  if (invoiceCount < 5) {
    reasons.push("Historique de ventes insuffisant (minimum 5 ventes sur 3 mois).");
  }
  if (averageMonthlySales <= 0) {
    reasons.push("Aucune vente enregistrée sur les 3 derniers mois.");
  }
  if (score < 15) {
    reasons.push("Volume ou régularité des ventes trop faibles pour le moment.");
  }
  if (eligible) {
    reasons.push("Vos ventes régulières ouvrent droit à une avance de trésorerie.");
  }

  return {
    eligible,
    score,
    averageMonthlySales,
    invoiceCount,
    activeDays,
    maxAmount,
    factorRate: FACTOR_RATE,
    termDays: TERM_DAYS,
    reasons,
    computedAt: new Date().toISOString(),
  };
}

export function makeReference(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CA-${ymd}-${rnd}`;
}
