-- Configuration des hooks pour la synchronisation automatique des utilisateurs

-- Insère un trigger sur auth.users via les hooks Supabase
-- Ce script s'exécute après les migrations

-- Activer les webhooks pour auth.users si nécessaire
-- (Ceci sera géré par la configuration Supabase plutôt que par des triggers directs)

-- Test de la fonction de synchronisation pour les utilisateurs existants
DO $$
DECLARE 
  auth_user RECORD;
BEGIN
  -- Synchroniser tous les utilisateurs auth existants vers public.users
  FOR auth_user IN 
    SELECT id, email, raw_user_meta_data, created_at
    FROM auth.users
    WHERE NOT EXISTS (
      SELECT 1 FROM public.users WHERE auth_user_id = auth.users.id
    )
  LOOP
    INSERT INTO public.users (
      auth_user_id,
      name,
      email,
      roles,
      created_at
    ) VALUES (
      auth_user.id,
      COALESCE(auth_user.raw_user_meta_data->>'name', ''),
      auth_user.email,
      ARRAY['employe']::text[],
      auth_user.created_at
    );
  END LOOP;
END $$;
