-- Fix GRANTs missing for subscription_plans (issue #86)
-- Table was created with RLS but no GRANTs for authenticated/anon/service_role

-- Ensure table exists
create table if not exists "public"."subscription_plans" (
    "id" uuid not null default gen_random_uuid(),
    "slug" text not null unique,
    "name" text not null,
    "description" text,
    "price_cents" integer not null,
    "currency" text not null default 'eur',
    "interval" text not null default 'month' check (interval in ('month', 'year')),
    "stripe_price_id" text,
    "features" jsonb not null default '[]'::jsonb,
    "is_active" boolean not null default true,
    "sort_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    primary key ("id")
);

-- GRANTs: allow authenticated to read, service_role full access
grant usage on schema public to anon, authenticated, service_role;
grant all on table public.subscription_plans to service_role;
grant select on table public.subscription_plans to authenticated;
grant select on table public.subscription_plans to anon;

-- Also ensure company_subscription has proper grants (should already exist but safe)
grant all on table public.company_subscription to service_role;
grant all on table public.company_subscription to authenticated;

-- Re-apply RLS policies for subscription_plans to be safe
alter table "public"."subscription_plans" enable row level security;

drop policy if exists "authenticated users can read active plans" on "public"."subscription_plans";
create policy "authenticated users can read active plans"
  on "public"."subscription_plans"
  for select
  to authenticated
  using (is_active = true);

drop policy if exists "super_admins manage plans" on "public"."subscription_plans";
create policy "super_admins manage plans"
  on "public"."subscription_plans"
  for all
  to authenticated
  using (
    exists (
      select 1 from public.users
      where users.auth_user_id = auth.uid()
      and 'super_admin' = any(users.roles)
    )
  )
  with check (
    exists (
      select 1 from public.users
      where users.auth_user_id = auth.uid()
      and 'super_admin' = any(users.roles)
    )
  );

-- Also allow anon to read active plans if needed for public pricing page (optional, but safe to allow)
drop policy if exists "anon can read active plans" on "public"."subscription_plans";
create policy "anon can read active plans"
  on "public"."subscription_plans"
  for select
  to anon
  using (is_active = true);
