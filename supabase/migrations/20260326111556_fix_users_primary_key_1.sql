-- Migration: 20260325_fix_users_primary_key.sql
-- Description: Fix missing primary key constraint on users table

-- ============================================
-- Étape 1 : Vérifier et corriger les données problématiques
-- ============================================

-- Supprimer les enregistrements avec id NULL (si existants)
DELETE FROM public.users WHERE id IS NULL;

-- Supprimer les doublons sur id en gardant le plus récent
DELETE FROM public.users u
USING (
    SELECT ctid
    FROM (
        SELECT ctid,
               ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at DESC) as rn
        FROM public.users
    ) t
    WHERE t.rn > 1
) d
WHERE u.ctid = d.ctid;

-- ============================================
-- Étape 2 : Supprimer l'ancien index et la contrainte existante
-- ============================================

-- Supprimer l'index unique existant s'il existe
DROP INDEX IF EXISTS public.users_pkey CASCADE;

-- Supprimer l'ancienne contrainte si elle existe mais mal configurée
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_pkey;

-- ============================================
-- Étape 3 : Ajouter la clé primaire correctement
-- ============================================

-- Ajouter la contrainte PRIMARY KEY
ALTER TABLE public.users ADD PRIMARY KEY (id);

-- ============================================
-- Étape 4 : Recréer les index nécessaires
-- ============================================

-- Supprimer/recréer la contrainte unique sur email (et son index sous-jacent)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);

-- Supprimer/recréer la contrainte unique sur auth_user_id (et son index sous-jacent)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_user_id_key;
ALTER TABLE public.users ADD CONSTRAINT users_auth_user_id_key UNIQUE (auth_user_id);

-- Recréer les index de performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users USING btree (email);
CREATE INDEX IF NOT EXISTS idx_users_magasin_id ON public.users USING btree (magasin_id);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users USING btree (auth_user_id);

-- ============================================
-- Étape 5 : Vérifier la contrainte
-- ============================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'users_pkey' 
        AND conrelid = 'public.users'::regclass
        AND contype = 'p'
    ) THEN
        RAISE NOTICE '✓ Primary key successfully added to users table';
    ELSE
        RAISE EXCEPTION '✗ Failed to add primary key to users table';
    END IF;
END $$;

-- ============================================
-- Étape 6 : Commentaires de documentation
-- ============================================

COMMENT ON CONSTRAINT users_pkey ON public.users IS 'Primary key constraint for users table';
COMMENT ON TABLE public.users IS 'Users table with proper primary key constraint';