/**
 * Composable client pour la détection d'anomalies / anti-fraude caisse.
 * Encapsule les appels aux routes /api/anomalies (avec token Bearer).
 */

export type AnomalySeverity = "low" | "medium" | "high" | "critical";
export type AnomalyStatus = "open" | "acknowledged" | "resolved" | "false_positive";

export interface Anomaly {
  id: string;
  type: string;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  title: string;
  description: string;
  amount: number | null;
  magasin_id?: string | null;
  related_id?: string | null;
  related_table?: string | null;
  metadata?: Record<string, unknown>;
  detected_at: string;
  acknowledged_at?: string | null;
}

export interface AnomalyScanResult {
  ok: boolean;
  persisted: boolean;
  inserted?: number;
  anomalies: Array<Omit<Anomaly, "id" | "status">>;
  score: number;
  counts: Record<AnomalySeverity, number>;
  scannedAt: string;
}

export interface AnomalyStats {
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
}

export const useAnomalyDetection = () => {
  const supabase = useSupabaseClient();
  const { notifyError, extractErrorMessage } = useErrorToast();

  const getAccessToken = async (): Promise<string> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Session invalide: veuillez vous reconnecter.");
    }
    return session.access_token;
  };

  const authHeaders = async () => ({
    Authorization: `Bearer ${await getAccessToken()}`,
  });

  /** Lance un scan et persiste les nouvelles anomalies détectées. */
  const scan = async (days = 30): Promise<AnomalyScanResult | null> => {
    try {
      return await $fetch<AnomalyScanResult>("/api/anomalies/scan", {
        method: "GET",
        headers: await authHeaders(),
        query: { days },
      });
    } catch (err) {
      notifyError(err, "Impossible de lancer le scan d'anomalies");
      return null;
    }
  };

  /** Liste les anomalies persistées (avec filtres optionnels). */
  const list = async (params?: {
    status?: AnomalyStatus;
    severity?: AnomalySeverity;
    limit?: number;
  }): Promise<{ anomalies: Anomaly[]; stats: AnomalyStats } | null> => {
    try {
      return await $fetch("/api/anomalies", {
        method: "GET",
        headers: await authHeaders(),
        query: params ?? {},
      });
    } catch (err) {
      notifyError(err, "Impossible de charger les anomalies");
      return null;
    }
  };

  /** Acquitte ou résout une anomalie. */
  const updateStatus = async (
    id: string,
    status: AnomalyStatus,
  ): Promise<Anomaly | null> => {
    try {
      const res = await $fetch<{ ok: boolean; anomaly: Anomaly }>(
        `/api/anomalies/${id}`,
        {
          method: "PATCH",
          headers: await authHeaders(),
          body: { status },
        },
      );
      return res.anomaly;
    } catch (err) {
      notifyError(err, "Impossible de mettre à jour l'anomalie");
      return null;
    }
  };

  /** Génère un libellé lisible pour un type d'anomalie. */
  const typeLabel = (type: string): string => {
    const map: Record<string, string> = {
      cash_discrepancy: "Écart de caisse",
      cash_count_discrepancy: "Écart de comptage",
      large_cash_out: "Sortie d'espèces importante",
      after_hours_sale: "Vente hors horaires",
      large_sale: "Vente atypique",
      duplicate_payment: "Paiement en double",
      negative_stock: "Stock négatif",
    };
    return map[type] ?? type;
  };

  return {
    scan,
    list,
    updateStatus,
    typeLabel,
    extractErrorMessage,
  };
};
