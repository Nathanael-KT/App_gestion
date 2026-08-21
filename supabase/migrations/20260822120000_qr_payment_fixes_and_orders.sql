-- ============================================================================
-- 20260822120000_qr_payment_fixes_and_orders.sql
-- Correctifs & évolution du paiement QR :
--   1. GRANTs manquants sur les nouvelles tables (corrige
--      "permission denied for table qr_payments" — les default privileges
--      Supabase n'avaient pas couvert les tables créées par la migration
--      20260822100000).
--   2. Lien QR payment <-> facture/commande (invoice_id) pour pouvoir
--      encaisser une commande existante et la marquer payée à la confirmation.
--   3. Élargir les moyens de paiement pris en charge (Mobile Money MTN/Orange).
-- ============================================================================

-- 1) GRANTs explicites (RLS conserve le filtrage par compagnie)
GRANT ALL ON TABLE public.cash_anomalies TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.qr_payments TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.cash_advances TO anon, authenticated, service_role;

-- Séquences éventuelles (par sécurité)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 2) Lien QR payment <-> facture/commande
ALTER TABLE public.qr_payments ADD COLUMN IF NOT EXISTS invoice_id uuid;

ALTER TABLE public.qr_payments
    DROP CONSTRAINT IF EXISTS qr_payments_invoice_id_fkey;
ALTER TABLE public.qr_payments
    ADD CONSTRAINT qr_payments_invoice_id_fkey
    FOREIGN KEY (invoice_id) REFERENCES public.invoices (id)
    ON DELETE SET NULL NOT VALID;
ALTER TABLE public.qr_payments VALIDATE CONSTRAINT qr_payments_invoice_id_fkey;

CREATE INDEX IF NOT EXISTS qr_payments_invoice_id_idx
    ON public.qr_payments (invoice_id);

-- 3) Moyens de paiement : ajouter le Mobile Money (MTN / Orange)
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS chk_payment_method;
ALTER TABLE public.payments
    ADD CONSTRAINT chk_payment_method
    CHECK (payment_method::text = ANY (
        ARRAY['virement'::text, 'cheque'::text, 'especes'::text,
              'carte'::text, 'autre'::text,
              'mtn'::text, 'orange'::text, 'mobile_money'::text]
    )) NOT VALID;
ALTER TABLE public.payments VALIDATE CONSTRAINT chk_payment_method;
