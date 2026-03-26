-- Migration: 20260326150000_fix_rls_policies.sql
-- Description: Fix broken RLS functions and policies that prevent table access
--
-- Problems fixed:
--   1. get_user_company_id() raised EXCEPTION for service_role → now returns NULL
--   2. is_user_admin() raised EXCEPTION for service_role → now returns FALSE
--   3. users table policies queried auth.users (no permission) → rewritten without it
--   4. Missing INSERT policy on users table for signup flow
--   5. All other table policies refreshed to use corrected helper functions

-- =========================================================================
-- 1. Fix get_user_company_id()
--    service_role already bypasses RLS at the connection level in Supabase;
--    raising an exception here just breaks server-side calls. Return NULL so
--    the caller's policy simply finds no matching rows (safe, non-crashing).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_company_id uuid;
BEGIN
  -- auth.uid() returns NULL for unauthenticated / service_role connections.
  -- In both cases we return NULL, which means RLS policies will simply filter
  -- out all rows (no match on NULL = NULL).
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT company_id INTO user_company_id
  FROM public.users
  WHERE auth_user_id = auth.uid();

  RETURN user_company_id;
END;
$$;

COMMENT ON FUNCTION public.get_user_company_id() IS
  'Returns the company_id of the currently authenticated user for use in RLS policies.
   Returns NULL for unauthenticated or service_role connections.
   NOTE: RLS USING/WITH CHECK clauses treat a NULL result as FALSE,
   so returning NULL safely blocks all rows for unauthenticated callers.';

-- =========================================================================
-- 2. Fix is_user_admin()
--    Same pattern: never raise, return FALSE when not authenticated.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_roles text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT roles INTO user_roles
  FROM public.users
  WHERE auth_user_id = auth.uid();

  RETURN 'admin' = ANY(user_roles) OR 'super_admin' = ANY(user_roles);
END;
$$;

COMMENT ON FUNCTION public.is_user_admin() IS
  'Returns TRUE if the current user holds the admin or super_admin role.
   Returns FALSE for unauthenticated or service_role connections.';

-- =========================================================================
-- 3. Add get_user_magasin_ids() helper
--    Six tables filter by magasin_id rather than company_id directly.
--    A single SECURITY DEFINER helper avoids repeating the subquery in every
--    policy and gives the planner a stable, cacheable execution path.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_user_magasin_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT id
  FROM public.magasins
  WHERE company_id = public.get_user_company_id();
$$;

COMMENT ON FUNCTION public.get_user_magasin_ids() IS
  'Returns the set of magasin IDs belonging to the current user''s company.
   Used in RLS policies on tables scoped by magasin_id.';

-- =========================================================================
-- 4. Rebuild users table RLS policies
--    The old policies contained:
--      auth.uid() IN (SELECT id FROM auth.users WHERE role = 'authenticated')
--    The `authenticated` role has no SELECT on auth.users, so that subquery
--    raised "permission denied", breaking every profile/role lookup.
-- =========================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies (clean slate)
DROP POLICY IF EXISTS "Users can access users from their company"  ON public.users;
DROP POLICY IF EXISTS "Users can view own profile"                 ON public.users;
DROP POLICY IF EXISTS "Users can update own profile"               ON public.users;
DROP POLICY IF EXISTS "Admin can manage users"                     ON public.users;
DROP POLICY IF EXISTS "users_select_policy"                        ON public.users;
DROP POLICY IF EXISTS "users_update_policy"                        ON public.users;
DROP POLICY IF EXISTS "users_insert_policy"                        ON public.users;
DROP POLICY IF EXISTS "users_delete_policy"                        ON public.users;
DROP POLICY IF EXISTS "users_admin_policy"                         ON public.users;

-- SELECT: own profile OR any user in the same company
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT USING (
    auth_user_id = auth.uid()
    OR (
      company_id IS NOT NULL
      AND company_id = public.get_user_company_id()
    )
  );

-- INSERT: only for own auth_user_id.
-- New-user sync via handle_new_user() / handle_new_user_webhook() uses
-- SECURITY DEFINER and therefore bypasses this policy entirely.
CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT WITH CHECK (
    auth_user_id = auth.uid()
  );

-- UPDATE: own profile only
CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE USING (
    auth_user_id = auth.uid()
  );

-- DELETE + full management for admins within same company
CREATE POLICY "users_admin_policy" ON public.users
  FOR ALL USING (
    company_id = public.get_user_company_id()
    AND public.is_user_admin()
  );

-- =========================================================================
-- 5. Rebuild company_settings policies
--    Two-policy pattern: tenant access + admin/super_admin override.
--    The old functions raised exceptions; the fixed versions are safe.
-- =========================================================================
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their company settings" ON public.company_settings;
DROP POLICY IF EXISTS "super_admins can access all data"             ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_tenant_policy"               ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_admin_policy"                ON public.company_settings;

-- Regular users can access their own company's settings.
CREATE POLICY "company_settings_tenant_policy" ON public.company_settings
  FOR ALL USING (
    id = public.get_user_company_id()
  );

-- Admins / super_admins can access all company settings (e.g. for system management).
CREATE POLICY "company_settings_admin_policy" ON public.company_settings
  FOR ALL USING (
    public.is_user_admin()
  );

-- =========================================================================
-- 5. Rebuild company_subscription policies
-- =========================================================================
ALTER TABLE public.company_subscription ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their company subscription" ON public.company_subscription;

CREATE POLICY "company_subscription_tenant_policy" ON public.company_subscription
  FOR ALL USING (
    company_id = public.get_user_company_id()
  );

-- =========================================================================
-- 6. Rebuild magasins policies
-- =========================================================================
ALTER TABLE public.magasins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access magasins from their company" ON public.magasins;

CREATE POLICY "magasins_tenant_policy" ON public.magasins
  FOR ALL USING (
    company_id = public.get_user_company_id()
  );

-- =========================================================================
-- 7. Rebuild clients policies
-- =========================================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access clients from their company magasins" ON public.clients;

CREATE POLICY "clients_tenant_policy" ON public.clients
  FOR ALL
  USING (
    magasin_id IN (SELECT public.get_user_magasin_ids())
  )
  WITH CHECK (
    magasin_id IN (SELECT public.get_user_magasin_ids())
  );

-- =========================================================================
-- 8. Rebuild products_carreaux policies
-- =========================================================================
ALTER TABLE public.products_carreaux ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access products from their company" ON public.products_carreaux;

CREATE POLICY "products_carreaux_tenant_policy" ON public.products_carreaux
  FOR ALL USING (
    company_id = public.get_user_company_id()
  );

-- =========================================================================
-- 9. Rebuild product_types policies
-- =========================================================================
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access product types from their company" ON public.product_types;

CREATE POLICY "product_types_tenant_policy" ON public.product_types
  FOR ALL USING (
    company_id = public.get_user_company_id()
  );

-- =========================================================================
-- 10. Rebuild stocks policies
-- =========================================================================
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access stocks from their company" ON public.stocks;

CREATE POLICY "stocks_tenant_policy" ON public.stocks
  FOR ALL USING (
    company_id = public.get_user_company_id()
  );

-- =========================================================================
-- 11. Rebuild invoices policies
-- =========================================================================
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access invoices from their company magasins" ON public.invoices;

CREATE POLICY "invoices_tenant_policy" ON public.invoices
  FOR ALL USING (
    magasin_id IN (SELECT public.get_user_magasin_ids())
  );

-- =========================================================================
-- 12. Rebuild invoice_items policies
-- =========================================================================
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access invoice items from their company magasins" ON public.invoice_items;

CREATE POLICY "invoice_items_tenant_policy" ON public.invoice_items
  FOR ALL USING (
    magasin_id IN (SELECT public.get_user_magasin_ids())
  );

-- =========================================================================
-- 13. Rebuild payments policies
-- =========================================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access payments from their company" ON public.payments;

CREATE POLICY "payments_tenant_policy" ON public.payments
  FOR ALL USING (
    company_id = public.get_user_company_id()
  );

-- =========================================================================
-- 14. Rebuild cash_transactions policies
-- =========================================================================
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access cash transactions from their company magasins" ON public.cash_transactions;

CREATE POLICY "cash_transactions_tenant_policy" ON public.cash_transactions
  FOR ALL USING (
    magasin_id IN (SELECT public.get_user_magasin_ids())
  );

-- =========================================================================
-- 15. Rebuild cash_counts policies
-- =========================================================================
ALTER TABLE public.cash_counts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access cash counts from their company magasins" ON public.cash_counts;

CREATE POLICY "cash_counts_tenant_policy" ON public.cash_counts
  FOR ALL USING (
    magasin_id IN (SELECT public.get_user_magasin_ids())
  );

-- =========================================================================
-- 16. Rebuild cash_emptying policies
-- =========================================================================
ALTER TABLE public.cash_emptying ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access cash emptying from their company magasins" ON public.cash_emptying;

CREATE POLICY "cash_emptying_tenant_policy" ON public.cash_emptying
  FOR ALL USING (
    magasin_id IN (SELECT public.get_user_magasin_ids())
  );

-- =========================================================================
-- 17. Rebuild daily_closings policies
-- =========================================================================
ALTER TABLE public.daily_closings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access daily closings from their company magasins" ON public.daily_closings;

CREATE POLICY "daily_closings_tenant_policy" ON public.daily_closings
  FOR ALL USING (
    magasin_id IN (SELECT public.get_user_magasin_ids())
  );

-- =========================================================================
-- 18. Rebuild forum_messages policies
-- =========================================================================
ALTER TABLE public.forum_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access forum messages from their company" ON public.forum_messages;

CREATE POLICY "forum_messages_tenant_policy" ON public.forum_messages
  FOR ALL USING (
    company_id = public.get_user_company_id()
  );

-- =========================================================================
-- 19. Verify
-- =========================================================================
DO $$
DECLARE
  tbl text;
  policy_count integer;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users', 'company_settings', 'company_subscription', 'magasins',
    'clients', 'products_carreaux', 'product_types', 'stocks',
    'invoices', 'invoice_items', 'payments', 'cash_transactions',
    'cash_counts', 'cash_emptying', 'daily_closings', 'forum_messages'
  ]
  LOOP
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = tbl;

    IF policy_count = 0 THEN
      RAISE WARNING 'Table % has RLS enabled but NO policies – all rows will be blocked!', tbl;
    ELSE
      RAISE NOTICE 'Table % → % RLS polic(ies) active', tbl, policy_count;
    END IF;
  END LOOP;
END;
$$;
