-- Migration: 20260325_fix_users_primary_key.sql
-- Description: Fix missing primary key constraint on users table
--
-- IDEMPOTENTE et sûre en production :
-- - Si la clé primaire existe déjà (cas de la prod où cette migration a
--   déjà été appliquée), elle NE FAIT RIEN (no-op) : le workflow de déploi
--   rejoue les fichiers modifiés, on évite ainsi de dropper les FKs.
-- - En local (supabase db reset), où le schéma squashé crée les unicités
--   sous forme de CONTRAINTES, les DROP sont "constraint-aware" : corrige
--   l'erreur SQLSTATE 2BP01 "cannot drop index users_email_key because
--   constraint users_email_key on table users requires it".

DO $$
BEGIN
    -- Schéma déjà sain (production) : sortie immédiate, aucun effet de bord.
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_pkey'
        AND conrelid = 'public.users'::regclass
        AND contype = 'p'
    ) THEN
        RAISE NOTICE 'users déjà dotée d''une clé primaire : rien à faire.';
        RETURN;
    END IF;

    -- ============================================
    -- Étape 1 : Vérifier et corriger les données problématiques
    -- ============================================
    DELETE FROM public.users WHERE id IS NULL;

    DELETE FROM public.users
    WHERE id IN (
        SELECT id
        FROM (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at DESC) as rn
            FROM public.users
        ) t
        WHERE t.rn > 1
    );

    -- ============================================
    -- Étape 2 : Supprimer l'ancienne clé (index simple OU contrainte)
    -- ============================================
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_pkey' AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE public.users DROP CONSTRAINT users_pkey CASCADE;
    ELSE
        DROP INDEX IF EXISTS public.users_pkey CASCADE;
    END IF;

    -- ============================================
    -- Étape 3 : Ajouter la clé primaire correctement
    -- ============================================
    ALTER TABLE public.users ADD PRIMARY KEY (id);

    -- ============================================
    -- Étape 4 : Recréer les index uniques
    -- (users_email_key / users_auth_user_id_key existent comme CONTRAINTES
    -- dans le schéma squashé : on droppe la contrainte, pas l'index)
    -- ============================================
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_email_key' AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE public.users DROP CONSTRAINT users_email_key;
    ELSE
        DROP INDEX IF EXISTS public.users_email_key;
    END IF;
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON public.users USING btree (email);

    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_auth_user_id_key' AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE public.users DROP CONSTRAINT users_auth_user_id_key;
    ELSE
        DROP INDEX IF EXISTS public.users_auth_user_id_key;
    END IF;
    CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_key ON public.users USING btree (auth_user_id);

    RAISE NOTICE '✓ Primary key successfully added to users table';
END $$;

-- ============================================
-- Index de performance (idempotents)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users USING btree (email);
CREATE INDEX IF NOT EXISTS idx_users_magasin_id ON public.users USING btree (magasin_id);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users USING btree (company_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users USING btree (auth_user_id);

COMMENT ON TABLE public.users IS 'Users table with proper primary key constraint';
