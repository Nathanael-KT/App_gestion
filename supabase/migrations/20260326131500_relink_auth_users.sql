-- Migration: 20260326131500_relink_auth_users.sql
-- Description: Repair broken links between auth.users and public.users

-- Relink orphan/mismatched public.users.auth_user_id by email when mapping is unambiguous.
DO $$
DECLARE
  relinked_count integer := 0;
  still_unlinked_count integer := 0;
BEGIN
  WITH auth_unique AS (
    SELECT
      lower(trim(email)) AS email_key,
      (ARRAY_AGG(id))[1] AS auth_id,
      COUNT(*) AS auth_count
    FROM auth.users
    WHERE email IS NOT NULL
    GROUP BY lower(trim(email))
    HAVING COUNT(*) = 1
  ),
  public_unique AS (
    SELECT
      lower(trim(email)) AS email_key,
      (ARRAY_AGG(id))[1] AS user_id,
      COUNT(*) AS public_count
    FROM public.users
    WHERE email IS NOT NULL
    GROUP BY lower(trim(email))
    HAVING COUNT(*) = 1
  ),
  candidates AS (
    SELECT
      pu.user_id,
      au.auth_id
    FROM public_unique pu
    JOIN auth_unique au ON au.email_key = pu.email_key
    JOIN public.users u ON u.id = pu.user_id
    LEFT JOIN auth.users a_linked ON a_linked.id = u.auth_user_id
    LEFT JOIN public.users u_other ON u_other.auth_user_id = au.auth_id AND u_other.id <> pu.user_id
    WHERE u_other.id IS NULL
      AND (
        u.auth_user_id IS NULL
        OR a_linked.id IS NULL
        OR lower(trim(a_linked.email)) <> pu.email_key
      )
  ),
  updated AS (
    UPDATE public.users u
    SET auth_user_id = c.auth_id
    FROM candidates c
    WHERE u.id = c.user_id
    RETURNING u.id
  )
  SELECT COUNT(*) INTO relinked_count FROM updated;

  SELECT COUNT(*)
  INTO still_unlinked_count
  FROM public.users u
  LEFT JOIN auth.users a ON a.id = u.auth_user_id
  WHERE u.auth_user_id IS NULL
     OR a.id IS NULL;

  RAISE NOTICE 'Relinked public.users rows: %', relinked_count;
  RAISE NOTICE 'Rows still unlinked/invalid after repair: %', still_unlinked_count;
END $$;

-- Keep lookup performant for current-user resolution.
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
