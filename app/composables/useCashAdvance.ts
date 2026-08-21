/**
 * Composable client pour l'avance de trésorerie (cash advance).
 */

export interface EligibilityResult {
  eligible: boolean;
  score: number;
  averageMonthlySales: number;
  invoiceCount: number;
  activeDays: number;
  maxAmount: number;
  factorRate: number;
  termDays: number;
  reasons: string[];
  computedAt: string;
}

export interface CashAdvance {
  id: string;
  reference: string;
  requested_amount: number;
  offered_amount: number | null;
  repayment_amount: number | null;
  factor_rate: number | null;
  term_days: number | null;
  eligibility_score: number | null;
  average_monthly_sales: number | null;
  status: string;
  created_at: string;
  offered_at: string | null;
}

export const useCashAdvance = () => {
  const supabase = useSupabaseClient();
  const { notifyError, notifySuccess } = useErrorToast();

  const getToken = async (): Promise<string> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Session invalide");
    return session.access_token;
  };
  const authHeaders = async () => ({
    Authorization: `Bearer ${await getToken()}`,
  });

  const eligibility = async (): Promise<EligibilityResult | null> => {
    try {
      const res = await $fetch<{ ok: boolean; eligibility: EligibilityResult }>(
        "/api/financing/eligibility",
        { method: "GET", headers: await authHeaders() },
      );
      return res.eligibility;
    } catch (err) {
      notifyError(err, "Impossible de calculer l'éligibilité");
      return null;
    }
  };

  const list = async (): Promise<CashAdvance[]> => {
    try {
      const res = await $fetch<{ ok: boolean; advances: CashAdvance[] }>(
        "/api/financing",
        { method: "GET", headers: await authHeaders() },
      );
      return res.advances ?? [];
    } catch {
      return [];
    }
  };

  const apply = async (amount: number): Promise<CashAdvance | null> => {
    try {
      const res = await $fetch<{ ok: boolean; advance: CashAdvance }>(
        "/api/financing/apply",
        {
          method: "POST",
          headers: await authHeaders(),
          body: { requestedAmount: amount },
        },
      );
      notifySuccess("Demande créée", "Offre d'avance générée.");
      return res.advance;
    } catch (err) {
      notifyError(err, "Demande impossible");
      return null;
    }
  };

  const accept = async (id: string): Promise<boolean> => {
    try {
      await $fetch(`/api/financing/${id}/accept`, {
        method: "POST",
        headers: await authHeaders(),
      });
      notifySuccess("Offre acceptée", "Votre demande est en cours de traitement.");
      return true;
    } catch (err) {
      notifyError(err, "Acceptation impossible");
      return false;
    }
  };

  /** Aperçu local des conditions (frais / remboursement) avant demande. */
  const previewTerms = (amount: number) => {
    const amt = Math.max(0, Number(amount) || 0);
    const fee = Math.round(amt * 0.06 * 100) / 100;
    return { amount: amt, fee, repayment: Math.round((amt + fee) * 100) / 100 };
  };

  return { eligibility, list, apply, accept, previewTerms };
};
