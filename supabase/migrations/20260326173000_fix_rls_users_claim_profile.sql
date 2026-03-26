-- Migration: 20260326173000_fix_rls_users_claim_profile.sql
-- Objectif: permettre le rattachement initial du profil users via email
-- après activation RLS, pour éviter les profils introuvables et company_id null.

-- 1) SELECT: autoriser l'utilisateur connecté à lire sa ligne si auth_user_id est NULL
--    mais que son email correspond au JWT email.
DROP POLICY IF EXISTS "users_select_policy" ON public.users;

CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT USING (
    auth_user_id = auth.uid()
    OR (
      auth_user_id IS NULL
      AND email = (auth.jwt() ->> 'email')
    )
    OR (
      company_id IS NOT NULL
      AND company_id = public.get_user_company_id()
    )
  );

-- 2) UPDATE: autoriser le "claim" initial du profil (auth_user_id NULL -> auth.uid())
--    uniquement quand l'email du profil correspond au JWT email.
DROP POLICY IF EXISTS "users_update_policy" ON public.users;

CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE
  USING (
    auth_user_id = auth.uid()
    OR (
      auth_user_id IS NULL
      AND email = (auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR (
      auth_user_id IS NULL
      AND email = (auth.jwt() ->> 'email')
    )
  );

-- 3) Vérification rapide
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_select_policy'
  ) AND EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_update_policy'
  ) THEN
    RAISE NOTICE 'users_select_policy et users_update_policy sont en place';
  ELSE
    RAISE EXCEPTION 'Policies users_* manquantes après migration';
  END IF;
END;
$$;