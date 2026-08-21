-- Fix RLS for super_admin and connection issues (issues #87, #74, #86)
-- This migration ensures:
-- 1. Helper functions never raise exceptions for service_role / unauthenticated
-- 2. users table has proper claim flow and super_admin override
-- 3. All tenant tables have super_admin bypass policies
-- 4. company_settings blocked logic is safe
-- 5. Handles legacy users without company_id

-- =========================================================================
-- 1. Fix get_user_company_id() - never raise, return NULL for unauthenticated/service_role
-- =========================================================================
create or replace function public.get_user_company_id()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  user_company_id uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  select company_id into user_company_id
  from public.users
  where auth_user_id = auth.uid();

  return user_company_id;
end;
$$;

comment on function public.get_user_company_id() is
  'Returns company_id of current user, NULL for unauthenticated/service_role. Safe for RLS - NULL means no match.';

-- =========================================================================
-- 2. Fix is_user_admin() - return FALSE for unauthenticated, no exception
-- =========================================================================
create or replace function public.is_user_admin()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  user_roles text[];
begin
  if auth.uid() is null then
    return false;
  end if;

  select roles into user_roles
  from public.users
  where auth_user_id = auth.uid();

  if user_roles is null then
    return false;
  end if;

  return 'admin' = any(user_roles) or 'super_admin' = any(user_roles);
end;
$$;

-- =========================================================================
-- 3. New helper: is_super_admin()
-- =========================================================================
create or replace function public.is_super_admin()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  user_roles text[];
begin
  if auth.uid() is null then
    return false;
  end if;

  select roles into user_roles
  from public.users
  where auth_user_id = auth.uid();

  if user_roles is null then
    return false;
  end if;

  return 'super_admin' = any(user_roles);
end;
$$;

-- =========================================================================
-- 4. Fix get_user_magasin_ids()
-- =========================================================================
create or replace function public.get_user_magasin_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public, auth
as $$
  select id
  from public.magasins
  where company_id = public.get_user_company_id()
  and public.get_user_company_id() is not null
$$;

-- =========================================================================
-- 5. Rebuild users policies - with claim flow + super_admin override
-- =========================================================================
alter table public.users enable row level security;

drop policy if exists "Users can access users from their company" on public.users;
drop policy if exists "Users can view own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Admin can manage users" on public.users;
drop policy if exists "users_select_policy" on public.users;
drop policy if exists "users_update_policy" on public.users;
drop policy if exists "users_insert_policy" on public.users;
drop policy if exists "users_delete_policy" on public.users;
drop policy if exists "users_admin_policy" on public.users;
drop policy if exists "users_super_admin_policy" on public.users;

-- SELECT: own profile OR claim via email when auth_user_id null OR same company OR super_admin
create policy "users_select_policy" on public.users
  for select using (
    auth_user_id = auth.uid()
    or (
      auth_user_id is null
      and email = (auth.jwt() ->> 'email')
    )
    or (
      company_id is not null
      and company_id = public.get_user_company_id()
    )
    or public.is_super_admin()
  );

-- INSERT: own auth_user_id OR super_admin
create policy "users_insert_policy" on public.users
  for insert with check (
    auth_user_id = auth.uid()
    or public.is_super_admin()
  );

-- UPDATE: own profile OR claim OR admin in same company OR super_admin
create policy "users_update_policy" on public.users
  for update using (
    auth_user_id = auth.uid()
    or (
      auth_user_id is null
      and email = (auth.jwt() ->> 'email')
    )
    or (
      company_id = public.get_user_company_id()
      and public.is_user_admin()
    )
    or public.is_super_admin()
  )
  with check (
    auth_user_id = auth.uid()
    or public.is_super_admin()
    or (
      company_id = public.get_user_company_id()
      and public.is_user_admin()
    )
  );

-- DELETE: admin in same company OR super_admin
create policy "users_delete_policy" on public.users
  for delete using (
    (
      company_id = public.get_user_company_id()
      and public.is_user_admin()
    )
    or public.is_super_admin()
  );

-- =========================================================================
-- 6. Rebuild company_settings policies with super_admin override
-- =========================================================================
alter table public.company_settings enable row level security;

drop policy if exists "Users can only access their company settings" on public.company_settings;
drop policy if exists "super_admins can access all data" on public.company_settings;
drop policy if exists "company_settings_tenant_policy" on public.company_settings;
drop policy if exists "company_settings_admin_policy" on public.company_settings;
drop policy if exists "Company settings accessible by company members" on public.company_settings;
drop policy if exists "Company settings update by company admins" on public.company_settings;
drop policy if exists "company_settings_super_admin_policy" on public.company_settings;

create policy "company_settings_tenant_policy" on public.company_settings
  for all using (
    id = public.get_user_company_id()
  );

create policy "company_settings_admin_policy" on public.company_settings
  for all using (
    public.is_user_admin()
  );

create policy "company_settings_super_admin_policy" on public.company_settings
  for all using (
    public.is_super_admin()
  );

-- =========================================================================
-- 7. Add super_admin policies for all tenant tables
-- =========================================================================

-- Helper to create super_admin policy for a table
-- We'll do it explicitly for each table

-- company_subscription
alter table public.company_subscription enable row level security;
drop policy if exists "company_subscription_tenant_policy" on public.company_subscription;
drop policy if exists "company_subscription_super_admin_policy" on public.company_subscription;
drop policy if exists "Users can access their company subscription" on public.company_subscription;

create policy "company_subscription_tenant_policy" on public.company_subscription
  for all using (company_id = public.get_user_company_id());

create policy "company_subscription_super_admin_policy" on public.company_subscription
  for all using (public.is_super_admin());

-- magasins
alter table public.magasins enable row level security;
drop policy if exists "magasins_tenant_policy" on public.magasins;
drop policy if exists "magasins_super_admin_policy" on public.magasins;
drop policy if exists "Users can access magasins from their company" on public.magasins;

create policy "magasins_tenant_policy" on public.magasins
  for all using (company_id = public.get_user_company_id());

create policy "magasins_super_admin_policy" on public.magasins
  for all using (public.is_super_admin());

-- clients
alter table public.clients enable row level security;
drop policy if exists "clients_tenant_policy" on public.clients;
drop policy if exists "clients_super_admin_policy" on public.clients;
drop policy if exists "Users can access clients from their company magasins" on public.clients;

create policy "clients_tenant_policy" on public.clients
  for all using (
    magasin_id in (select public.get_user_magasin_ids())
  )
  with check (
    magasin_id in (select public.get_user_magasin_ids())
  );

create policy "clients_super_admin_policy" on public.clients
  for all using (public.is_super_admin());

-- products_carreaux
alter table public.products_carreaux enable row level security;
drop policy if exists "products_carreaux_tenant_policy" on public.products_carreaux;
drop policy if exists "products_carreaux_super_admin_policy" on public.products_carreaux;
drop policy if exists "Users can access products from their company" on public.products_carreaux;

create policy "products_carreaux_tenant_policy" on public.products_carreaux
  for all using (company_id = public.get_user_company_id());

create policy "products_carreaux_super_admin_policy" on public.products_carreaux
  for all using (public.is_super_admin());

-- product_types
alter table public.product_types enable row level security;
drop policy if exists "product_types_tenant_policy" on public.product_types;
drop policy if exists "product_types_super_admin_policy" on public.product_types;
drop policy if exists "Users can access product types from their company" on public.product_types;

create policy "product_types_tenant_policy" on public.product_types
  for all using (company_id = public.get_user_company_id());

create policy "product_types_super_admin_policy" on public.product_types
  for all using (public.is_super_admin());

-- stocks
alter table public.stocks enable row level security;
drop policy if exists "stocks_tenant_policy" on public.stocks;
drop policy if exists "stocks_super_admin_policy" on public.stocks;
drop policy if exists "Users can access stocks from their company" on public.stocks;

create policy "stocks_tenant_policy" on public.stocks
  for all using (company_id = public.get_user_company_id());

create policy "stocks_super_admin_policy" on public.stocks
  for all using (public.is_super_admin());

-- invoices
alter table public.invoices enable row level security;
drop policy if exists "invoices_tenant_policy" on public.invoices;
drop policy if exists "invoices_super_admin_policy" on public.invoices;
drop policy if exists "Users can access invoices from their company magasins" on public.invoices;

create policy "invoices_tenant_policy" on public.invoices
  for all using (
    magasin_id in (select public.get_user_magasin_ids())
  );

create policy "invoices_super_admin_policy" on public.invoices
  for all using (public.is_super_admin());

-- invoice_items
alter table public.invoice_items enable row level security;
drop policy if exists "invoice_items_tenant_policy" on public.invoice_items;
drop policy if exists "invoice_items_super_admin_policy" on public.invoice_items;
drop policy if exists "Users can access invoice items from their company magasins" on public.invoice_items;

create policy "invoice_items_tenant_policy" on public.invoice_items
  for all using (
    magasin_id in (select public.get_user_magasin_ids())
  );

create policy "invoice_items_super_admin_policy" on public.invoice_items
  for all using (public.is_super_admin());

-- payments
alter table public.payments enable row level security;
drop policy if exists "payments_tenant_policy" on public.payments;
drop policy if exists "payments_super_admin_policy" on public.payments;
drop policy if exists "Users can access payments from their company" on public.payments;

create policy "payments_tenant_policy" on public.payments
  for all using (company_id = public.get_user_company_id());

create policy "payments_super_admin_policy" on public.payments
  for all using (public.is_super_admin());

-- cash_transactions
alter table public.cash_transactions enable row level security;
drop policy if exists "cash_transactions_tenant_policy" on public.cash_transactions;
drop policy if exists "cash_transactions_super_admin_policy" on public.cash_transactions;
drop policy if exists "Users can access cash transactions from their company magasins" on public.cash_transactions;

create policy "cash_transactions_tenant_policy" on public.cash_transactions
  for all using (
    magasin_id in (select public.get_user_magasin_ids())
  );

create policy "cash_transactions_super_admin_policy" on public.cash_transactions
  for all using (public.is_super_admin());

-- cash_counts
alter table public.cash_counts enable row level security;
drop policy if exists "cash_counts_tenant_policy" on public.cash_counts;
drop policy if exists "cash_counts_super_admin_policy" on public.cash_counts;
drop policy if exists "Users can access cash counts from their company magasins" on public.cash_counts;

create policy "cash_counts_tenant_policy" on public.cash_counts
  for all using (
    magasin_id in (select public.get_user_magasin_ids())
  );

create policy "cash_counts_super_admin_policy" on public.cash_counts
  for all using (public.is_super_admin());

-- cash_emptying
alter table public.cash_emptying enable row level security;
drop policy if exists "cash_emptying_tenant_policy" on public.cash_emptying;
drop policy if exists "cash_emptying_super_admin_policy" on public.cash_emptying;
drop policy if exists "Users can access cash emptying from their company magasins" on public.cash_emptying;

create policy "cash_emptying_tenant_policy" on public.cash_emptying
  for all using (
    magasin_id in (select public.get_user_magasin_ids())
  );

create policy "cash_emptying_super_admin_policy" on public.cash_emptying
  for all using (public.is_super_admin());

-- daily_closings
alter table public.daily_closings enable row level security;
drop policy if exists "daily_closings_tenant_policy" on public.daily_closings;
drop policy if exists "daily_closings_super_admin_policy" on public.daily_closings;
drop policy if exists "Users can access daily closings from their company magasins" on public.daily_closings;

create policy "daily_closings_tenant_policy" on public.daily_closings
  for all using (
    magasin_id in (select public.get_user_magasin_ids())
  );

create policy "daily_closings_super_admin_policy" on public.daily_closings
  for all using (public.is_super_admin());

-- forum_messages
alter table public.forum_messages enable row level security;
drop policy if exists "forum_messages_tenant_policy" on public.forum_messages;
drop policy if exists "forum_messages_super_admin_policy" on public.forum_messages;
drop policy if exists "Users can access forum messages from their company" on public.forum_messages;

create policy "forum_messages_tenant_policy" on public.forum_messages
  for all using (company_id = public.get_user_company_id());

create policy "forum_messages_super_admin_policy" on public.forum_messages
  for all using (public.is_super_admin());

-- Ensure blocked column exists and is safe
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'company_settings'
    and column_name = 'blocked'
  ) then
    alter table public.company_settings add column blocked boolean default false;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name = 'company_settings'
    and column_name = 'blocked_menus'
  ) then
    alter table public.company_settings add column blocked_menus text[] default array[]::text[];
  end if;
end $$;

-- Grant usage for new functions
grant execute on function public.get_user_company_id() to authenticated, anon, service_role;
grant execute on function public.is_user_admin() to authenticated, anon, service_role;
grant execute on function public.is_super_admin() to authenticated, anon, service_role;
grant execute on function public.get_user_magasin_ids() to authenticated, anon, service_role;

-- Verification notice
do $$
begin
  raise notice 'RLS super_admin fix applied successfully - all tenant tables now have super_admin bypass';
end $$;
