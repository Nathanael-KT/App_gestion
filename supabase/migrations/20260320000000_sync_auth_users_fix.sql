-- Fix critical sync issue: auth.users <-> public.users mirror
-- This migration ensures that when a user signs up via Auth, they're automatically created in public.users

-- Drop old functions if they exist
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user(json, json) CASCADE;

-- Create the main hook function called by Supabase Auth on new user signup
-- This is triggered via [auth.hook.send_email] webhook configuration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_id uuid;
  user_email text;
BEGIN
  -- Get the user ID and email from the auth context
  user_id := auth.uid();
  user_email := (SELECT email FROM auth.users WHERE id = user_id);

  -- If already exists in public.users, skip (prevent duplicate on re-trigger)
  IF EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = user_id) THEN
    RAISE NOTICE 'User % already exists in public.users', user_id;
    RETURN;
  END IF;

  -- Insert new user into public.users with default role
  INSERT INTO public.users (
    auth_user_id,
    email,
    name,
    roles,
    created_at
  ) VALUES (
    user_id,
    user_email,
    COALESCE((SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = user_id), ''),
    ARRAY['ROLE_USER']::text[],
    NOW()
  );

  RAISE NOTICE 'New user created in public.users: % (%)', user_email, user_id;
END;
$$;

-- Alternative version that can be called from a webhook with JSON payload
CREATE OR REPLACE FUNCTION public.handle_new_user_webhook(payload json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_id uuid;
  user_email text;
BEGIN
  user_id := (payload->>'id')::uuid;
  user_email := payload->>'email';

  -- If already exists in public.users, skip
  IF EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = user_id) THEN
    RETURN json_build_object(
      'status', 'skipped',
      'message', 'User already exists',
      'user_id', user_id
    );
  END IF;

  -- Insert new user into public.users
  INSERT INTO public.users (
    auth_user_id,
    email,
    name,
    roles,
    created_at
  ) VALUES (
    user_id,
    user_email,
    COALESCE(payload->>'name', ''),
    ARRAY['ROLE_USER']::text[],
    NOW()
  );

  RETURN json_build_object(
    'status', 'created',
    'message', 'User successfully created in public.users',
    'user_id', user_id,
    'email', user_email
  );
END;
$$;

-- Create a function to handle user deletion sync (optional)
CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  deleted_user_id uuid;
BEGIN
  -- Note: This is called AFTER a user is deleted from auth.users
  -- We can't directly access the deleted user ID, so this requires webhook integration
  RAISE NOTICE 'User deletion sync function called';
END;
$$;

-- Ensure proper indexing for auth_user_id lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Main sync function: Creates public.users entry when new user signs up via Auth. Called via [auth.hook.send_email] webhook.';
COMMENT ON FUNCTION public.handle_new_user_webhook(json) IS 'Webhook-compatible version of handle_new_user() that accepts JSON payload.';

-- Sync existing auth.users that might not have public.users entries (data recovery)
DO $$
DECLARE
  synced_count integer := 0;
  auth_user RECORD;
BEGIN
  FOR auth_user IN 
    SELECT id, email, raw_user_meta_data, created_at
    FROM auth.users a
    WHERE NOT EXISTS (SELECT 1 FROM public.users p WHERE p.auth_user_id = a.id)
  LOOP
    INSERT INTO public.users (
      auth_user_id,
      email,
      name,
      roles,
      created_at
    ) VALUES (
      auth_user.id,
      auth_user.email,
      COALESCE(auth_user.raw_user_meta_data->>'name', ''),
      ARRAY['ROLE_USER']::text[],
      auth_user.created_at
    );
    synced_count := synced_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Synced % existing auth users to public.users', synced_count;
END;
$$;

-- Ensure all users table has proper RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth_user_id = auth.uid() OR auth.uid() IN (
    SELECT id FROM auth.users WHERE role = 'authenticated'
  ));

DROP POLICY IF EXISTS "Users can update own profile" ON public.users
  FOR UPDATE USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Admin can manage users" ON public.users;
CREATE POLICY "Admin can manage users" ON public.users
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE role = 'authenticated'
    )
    OR 
    (SELECT roles FROM public.users WHERE auth_user_id = auth.uid()) && ARRAY['admin', 'super_admin']::text[]
  );
