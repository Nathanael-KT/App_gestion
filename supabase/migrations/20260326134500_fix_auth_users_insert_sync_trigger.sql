-- Migration: 20260326134500_fix_auth_users_insert_sync_trigger.sql
-- Description: Ensure every new auth.users record is synced to public.users.

-- Trigger function used by auth.users INSERT events.
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_public_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  matched_user_id uuid;
BEGIN
  -- Already linked: refresh basic fields and return.
  IF EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = NEW.id) THEN
    UPDATE public.users
    SET
      email = COALESCE(NEW.email, email),
      name = COALESCE(NEW.raw_user_meta_data->>'name', name)
    WHERE auth_user_id = NEW.id;

    RETURN NEW;
  END IF;

  -- Try to link an existing public.users row by email first.
  SELECT u.id
  INTO matched_user_id
  FROM public.users u
  WHERE lower(trim(u.email)) = lower(trim(NEW.email))
  ORDER BY u.created_at DESC NULLS LAST
  LIMIT 1;

  IF matched_user_id IS NOT NULL THEN
    UPDATE public.users
    SET
      auth_user_id = NEW.id,
      email = COALESCE(NEW.email, email),
      name = COALESCE(NEW.raw_user_meta_data->>'name', name)
    WHERE id = matched_user_id;

    RETURN NEW;
  END IF;

  -- Create a new profile row when no match exists.
  INSERT INTO public.users (
    auth_user_id,
    email,
    name,
    roles,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    ARRAY['ROLE_USER']::text[],
    COALESCE(NEW.created_at, now())
  )
  ON CONFLICT (auth_user_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never break signup because of profile sync issues.
    RAISE WARNING 'sync_auth_user_to_public_users failed for auth user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users.
DROP TRIGGER IF EXISTS on_auth_user_created_sync_public_user ON auth.users;

CREATE TRIGGER on_auth_user_created_sync_public_user
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_auth_user_to_public_users();

-- Backfill any users currently missing from public.users.
INSERT INTO public.users (
  auth_user_id,
  email,
  name,
  roles,
  created_at
)
SELECT
  a.id,
  a.email,
  COALESCE(a.raw_user_meta_data->>'name', ''),
  ARRAY['ROLE_USER']::text[],
  a.created_at
FROM auth.users a
LEFT JOIN public.users p ON p.auth_user_id = a.id
WHERE p.id IS NULL
ON CONFLICT (auth_user_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
