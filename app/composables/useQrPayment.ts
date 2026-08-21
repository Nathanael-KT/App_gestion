/**
 * Composable client pour le paiement par QR (côté caissier).
 * Encapsule les appels authentifiés vers /api/payments/*.
 */

export interface QrPaymentSession {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  expiresAt: string;
  paymentUrl: string;
}

export interface QrPaymentStatus {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: "pending" | "initiated" | "success" | "failed" | "cancelled" | "expired";
  provider?: string | null;
  customerName?: string | null;
  paidAt?: string | null;
}

export interface QrPaymentHistory extends QrPaymentStatus {
  created_at: string;
}

export interface SelectableInvoice {
  id: string;
  reference: string | null;
  total: number;
  status: string;
  client_name: string | null;
  date: string | null;
}

export const useQrPayment = () => {
  const supabase = useSupabaseClient();
  const { notifyError } = useErrorToast();

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

  const create = async (payload: {
    amount?: number;
    currency?: string;
    note?: string;
    customerName?: string;
    invoiceId?: string;
  }): Promise<QrPaymentSession | null> => {
    try {
      const res = await $fetch<{ ok: boolean; payment: QrPaymentSession }>(
        "/api/payments/qr/create",
        { method: "POST", headers: await authHeaders(), body: payload },
      );
      return res.payment;
    } catch (err) {
      notifyError(err, "Création du paiement impossible");
      return null;
    }
  };

  /** Liste les factures/commandes impayées sélectionnables pour l'encaissement. */
  const unpaidInvoices = async (magasinId?: string): Promise<SelectableInvoice[]> => {
    try {
      const res = await $fetch<{ ok: boolean; invoices: SelectableInvoice[] }>(
        "/api/payments/qr/invoices",
        {
          method: "GET",
          headers: await authHeaders(),
          query: magasinId ? { magasinId } : {},
        },
      );
      return res.invoices ?? [];
    } catch (err) {
      notifyError(err, "Impossible de charger les commandes à encaisser");
      return [];
    }
  };

  const cancel = async (id: string): Promise<boolean> => {
    try {
      await $fetch(`/api/payments/${id}/cancel`, {
        method: "POST",
        headers: await authHeaders(),
      });
      return true;
    } catch (err) {
      notifyError(err, "Annulation impossible");
      return false;
    }
  };

  const list = async (): Promise<QrPaymentHistory[]> => {
    try {
      const res = await $fetch<{ ok: boolean; payments: QrPaymentHistory[] }>(
        "/api/payments/qr/list",
        { method: "GET", headers: await authHeaders() },
      );
      return res.payments ?? [];
    } catch {
      return [];
    }
  };

  return { create, cancel, list, unpaidInvoices };
};
