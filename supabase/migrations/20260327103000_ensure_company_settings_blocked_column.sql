-- Migration: 20260327103000_ensure_company_settings_blocked_column.sql
-- Objectif: s'assurer que la colonne 'blocked' existe dans company_settings
-- et que 'blocked_menus' et 'updated_at' sont correctement configurés

-- 1. Ajouter la colonne 'blocked' si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings'
    AND column_name = 'blocked'
  ) THEN
    ALTER TABLE public.company_settings
    ADD COLUMN blocked boolean DEFAULT false;
    RAISE NOTICE 'Column blocked added to company_settings';
  ELSE
    RAISE NOTICE 'Column blocked already exists in company_settings';
  END IF;
END $$;

-- 2. S'assurer que 'blocked_menus' est un array et pas NULL
DO $$
BEGIN
  UPDATE public.company_settings
  SET blocked_menus = COALESCE(blocked_menus, ARRAY[]::text[])
  WHERE blocked_menus IS NULL;
  RAISE NOTICE 'Ensured blocked_menus is not NULL';
END $$;

-- 3. S'assurer que 'updated_at' existe et est à jour
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.company_settings
    ADD COLUMN updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP;
    RAISE NOTICE 'Column updated_at added to company_settings';
  ELSE
    RAISE NOTICE 'Column updated_at already exists in company_settings';
  END IF;
END $$;

-- 4. Créer une fonction de trigger pour mettre à jour 'updated_at'
CREATE OR REPLACE FUNCTION public.update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Ajouter le trigger si n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'company_settings_update_timestamp'
    AND tgrelid = 'public.company_settings'::regclass
  ) THEN
    CREATE TRIGGER company_settings_update_timestamp
    BEFORE UPDATE ON public.company_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_company_settings_updated_at();
    RAISE NOTICE 'Trigger company_settings_update_timestamp created';
  ELSE
    RAISE NOTICE 'Trigger company_settings_update_timestamp already exists';
  END IF;
END $$;

-- 6. Vérifier les contraintes RLS sur company_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'company_settings'
  ) THEN
    ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
    
    -- Policy: Admin seul peut voir et modifier
    CREATE POLICY "Company settings accessible by company members"
    ON public.company_settings
    FOR SELECT
    USING (
      id IN (
        SELECT company_id FROM public.users
        WHERE auth_user_id = auth.uid()
      )
    );
    
    CREATE POLICY "Company settings update by company admins"
    ON public.company_settings
    FOR UPDATE
    USING (
      id IN (
        SELECT company_id FROM public.users
        WHERE auth_user_id = auth.uid()
        AND 'ROLE_ADMIN'::text = ANY(roles)
      )
    );
    
    RAISE NOTICE 'RLS policies added to company_settings';
  ELSE
    RAISE NOTICE 'RLS policies already exist for company_settings';
  END IF;
END $$;
