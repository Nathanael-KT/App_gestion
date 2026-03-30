-- Backfill invoice_items.magasin_id for legacy rows.
-- RLS on invoice_items filters by magasin_id, so null values make rows invisible.

UPDATE public.invoice_items ii
SET magasin_id = i.magasin_id
FROM public.invoices i
WHERE ii.invoice_id = i.id
  AND ii.magasin_id IS NULL
  AND i.magasin_id IS NOT NULL;
