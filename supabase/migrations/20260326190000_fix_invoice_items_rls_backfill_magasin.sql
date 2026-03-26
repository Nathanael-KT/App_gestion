-- Migration: 20260326190000_fix_invoice_items_rls_backfill_magasin.sql
-- Objectif:
-- 1) Rattraper les lignes invoice_items historiques sans magasin_id
-- 2) Rendre la policy invoice_items robuste en se basant aussi sur l'invoice parent

-- 1) Backfill magasin_id depuis la facture parente
UPDATE public.invoice_items ii
SET magasin_id = i.magasin_id
FROM public.invoices i
WHERE ii.invoice_id = i.id
  AND ii.magasin_id IS NULL
  AND i.magasin_id IS NOT NULL;

-- 2) Recréer la policy avec vérification via invoice parent
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_items_tenant_policy" ON public.invoice_items;

CREATE POLICY "invoice_items_tenant_policy" ON public.invoice_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND i.magasin_id IN (SELECT public.get_user_magasin_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND i.magasin_id IN (SELECT public.get_user_magasin_ids())
    )
  );

-- 3) Vérification rapide
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'invoice_items'
      AND policyname = 'invoice_items_tenant_policy'
  ) THEN
    RAISE NOTICE 'invoice_items_tenant_policy est en place';
  ELSE
    RAISE EXCEPTION 'invoice_items_tenant_policy manquante apres migration';
  END IF;
END;
$$;
