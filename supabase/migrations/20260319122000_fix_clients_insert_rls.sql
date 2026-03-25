-- Fix RLS for clients INSERT (Supabase/PostgREST 403)
-- Ensure INSERT checks tenant ownership through magasin_id.

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access clients from their company magasins" ON public.clients;

CREATE POLICY "Users can access clients from their company magasins"
ON public.clients
FOR ALL
USING (
  magasin_id IN (
    SELECT id
    FROM public.magasins
    WHERE company_id = public.get_user_company_id()
  )
)
WITH CHECK (
  magasin_id IN (
    SELECT id
    FROM public.magasins
    WHERE company_id = public.get_user_company_id()
  )
);
