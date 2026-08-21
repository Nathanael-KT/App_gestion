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
    amount: number;
    currency?: string;
    note?: string;
    customerName?: string;
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

  return { create, cancel, list };
};
