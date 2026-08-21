-- Intégration des abonnements payants via Stripe
-- - Ajoute une table subscription_plans (offres disponibles : Rapide / Pro)
-- - Ajoute les colonnes Stripe nécessaires sur company_subscription
--   (customer id, subscription id, plan choisi, annulation programmée)
-- - Le paiement manuel (is_paid coché à la main par le superadmin) reste
--   possible en secours, mais devient normalement piloté automatiquement
--   par les webhooks Stripe (voir server/api/stripe/webhook.post.ts).

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

comment on table "public"."subscription_plans" is
  'Offres d''abonnement proposées aux entreprises (ex: Rapide, Pro). Le prix Stripe réel (stripe_price_id) doit être créé côté dashboard Stripe et reporté ici.';

-- Deux offres de départ. Prix indicatifs à ajuster depuis le dashboard
-- superadmin (aucune valeur commerciale figée en dur côté application).
insert into "public"."subscription_plans"
  ("slug", "name", "description", "price_cents", "currency", "interval", "features", "sort_order")
values
  (
    'rapide',
    'Rapide',
    'Pour démarrer rapidement avec l''essentiel de la gestion de magasin.',
    2900,
    'eur',
    'month',
    '["1 magasin", "Gestion stock & commandes", "Facturation", "Support par email"]'::jsonb,
    1
  ),
  (
    'pro',
    'Pro',
    'Pour les entreprises multi-magasins avec des besoins avancés.',
    7900,
    'eur',
    'month',
    '["Magasins illimités", "Rapports avancés", "Sauvegardes automatiques", "Support prioritaire"]'::jsonb,
    2
  )
on conflict (slug) do nothing;

-- Colonnes Stripe sur l'abonnement de chaque entreprise
alter table "public"."company_subscription"
  add column if not exists "plan_id" uuid references "public"."subscription_plans"("id"),
  add column if not exists "stripe_customer_id" text,
  add column if not exists "stripe_subscription_id" text,
  add column if not exists "status" text not null default 'inactif'
    check (status in ('actif', 'en_attente', 'bloque', 'inactif')),
  add column if not exists "cancel_at_period_end" boolean not null default false;

create index if not exists idx_company_subscription_stripe_customer
  on "public"."company_subscription" ("stripe_customer_id");
create index if not exists idx_company_subscription_stripe_subscription
  on "public"."company_subscription" ("stripe_subscription_id");

-- RLS: les offres actives sont visibles par tout utilisateur authentifié
-- (nécessaire pour afficher la page de choix d'abonnement), la gestion
-- (insert/update/delete) reste réservée aux super_admin.
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
    (select roles from public.users where auth_user_id = auth.uid()) && array['super_admin']::text[]
  )
  with check (
    (select roles from public.users where auth_user_id = auth.uid()) && array['super_admin']::text[]
  );
