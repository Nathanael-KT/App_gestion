-- ============================================================================
-- 20260822100000_innovations.sql
-- Nouvelles fonctionnalités orientées utilisateur :
--   1. cash_anomalies  -> Détection d'anomalies / anti-fraude caisse
--   3. qr_payments      -> Paiement par QR code (MTN MoMo / Orange Money)
--   5. cash_advances    -> Avance de trésorerie (cash advance) pour le commerçant
--
-- Conventions RLS respectées :
--   - public.get_user_company_id()  (SECURITY DEFINER) pour le scoping tenant
--   - public.is_user_admin()        pour l'accès admin/super_admin
-- Toutes les opérations côté client "public" (page de paiement QR) transitent
-- par les routes serveur (clé service_role), RLS reste donc strict.
-- ============================================================================

-- ============================================================================
-- 1. cash_anomalies : anomalies détectées sur la caisse / les ventes
-- ============================================================================
create table if not exists "public"."cash_anomalies" (
    "id" uuid not null default gen_random_uuid(),
    "company_id" uuid,
    "magasin_id" uuid,
    "type" text not null,
    "severity" text not null default 'medium',
    "title" text not null,
    "description" text,
    "amount" numeric(14,2),
    "related_id" uuid,
    "related_table" text,
    "metadata" jsonb default '{}'::jsonb,
    "status" text not null default 'open',
    "acknowledged_by" uuid,
    "acknowledged_at" timestamptz,
    "detected_at" timestamptz not null default now(),
    "created_at" timestamptz not null default now(),
    "updated_at" timestamptz not null default now(),
    constraint "cash_anomalies_pkey" primary key ("id")
);

create index if not exists "cash_anomalies_company_id_idx"
    on "public"."cash_anomalies" ("company_id");
create index if not exists "cash_anomalies_status_idx"
    on "public"."cash_anomalies" ("status");
create index if not exists "cash_anomalies_detected_at_idx"
    on "public"."cash_anomalies" ("detected_at" desc);

alter table "public"."cash_anomalies"
    add constraint "cash_anomalies_company_id_fkey"
    foreign key ("company_id") references "public"."company_settings" ("id")
    on delete cascade not valid;
alter table "public"."cash_anomalies" validate constraint "cash_anomalies_company_id_fkey";

alter table "public"."cash_anomalies"
    add constraint "cash_anomalies_severity_check"
    check ("severity" in ('low', 'medium', 'high', 'critical')) not valid;
alter table "public"."cash_anomalies" validate constraint "cash_anomalies_severity_check";

alter table "public"."cash_anomalies"
    add constraint "cash_anomalies_status_check"
    check ("status" in ('open', 'acknowledged', 'resolved', 'false_positive')) not valid;
alter table "public"."cash_anomalies" validate constraint "cash_anomalies_status_check";

alter table "public"."cash_anomalies" enable row level security;

drop policy if exists "cash_anomalies_tenant_policy" on "public"."cash_anomalies";
create policy "cash_anomalies_tenant_policy" on "public"."cash_anomalies"
    for all using (
        company_id = public.get_user_company_id()
    );

drop policy if exists "cash_anomalies_admin_policy" on "public"."cash_anomalies";
create policy "cash_anomalies_admin_policy" on "public"."cash_anomalies"
    for all using (
        public.is_user_admin()
    );

comment on table "public"."cash_anomalies" is
    'Anomalies et alertes anti-fraude détectées sur la caisse et les ventes.';

-- ============================================================================
-- 2. qr_payments : sessions de paiement QR (mobile money + autres moyens)
-- ============================================================================
create table if not exists "public"."qr_payments" (
    "id" uuid not null default gen_random_uuid(),
    "company_id" uuid,
    "magasin_id" uuid,
    "reference" text not null,
    "amount" numeric(14,2) not null default 0,
    "currency" text not null default 'XOF',
    "status" text not null default 'pending',
    "provider" text,
    "customer_phone" text,
    "customer_name" text,
    "provider_transaction_id" text,
    "provider_reference" text,
    "provider_payload" jsonb default '{}'::jsonb,
    "cart" jsonb,
    "note" text,
    "created_by" uuid,
    "cashier_user_id" uuid,
    "expires_at" timestamptz,
    "paid_at" timestamptz,
    "created_at" timestamptz not null default now(),
    "updated_at" timestamptz not null default now(),
    constraint "qr_payments_pkey" primary key ("id")
);

create unique index if not exists "qr_payments_reference_key"
    on "public"."qr_payments" ("reference");
create index if not exists "qr_payments_company_id_idx"
    on "public"."qr_payments" ("company_id");
create index if not exists "qr_payments_status_idx"
    on "public"."qr_payments" ("status");
create index if not exists "qr_payments_created_at_idx"
    on "public"."qr_payments" ("created_at" desc);

alter table "public"."qr_payments"
    add constraint "qr_payments_company_id_fkey"
    foreign key ("company_id") references "public"."company_settings" ("id")
    on delete cascade not valid;
alter table "public"."qr_payments" validate constraint "qr_payments_company_id_fkey";

alter table "public"."qr_payments"
    add constraint "qr_payments_magasin_id_fkey"
    foreign key ("magasin_id") references "public"."magasins" ("id")
    on delete set null not valid;
alter table "public"."qr_payments" validate constraint "qr_payments_magasin_id_fkey";

alter table "public"."qr_payments"
    add constraint "qr_payments_status_check"
    check ("status" in ('pending', 'initiated', 'success', 'failed', 'cancelled', 'expired', 'refunded')) not valid;
alter table "public"."qr_payments" validate constraint "qr_payments_status_check";

alter table "public"."qr_payments"
    add constraint "qr_payments_amount_check"
    check ("amount" >= 0) not valid;
alter table "public"."qr_payments" validate constraint "qr_payments_amount_check";

alter table "public"."qr_payments" enable row level security;

drop policy if exists "qr_payments_tenant_policy" on "public"."qr_payments";
create policy "qr_payments_tenant_policy" on "public"."qr_payments"
    for all using (
        company_id = public.get_user_company_id()
    );

drop policy if exists "qr_payments_admin_policy" on "public"."qr_payments";
create policy "qr_payments_admin_policy" on "public"."qr_payments"
    for all using (
        public.is_user_admin()
    );

comment on table "public"."qr_payments" is
    'Sessions de paiement par QR code (MTN MoMo, Orange Money, espèces, carte).';

-- ============================================================================
-- 3. cash_advances : demandes d'avance de trésorerie (cash advance)
-- ============================================================================
create table if not exists "public"."cash_advances" (
    "id" uuid not null default gen_random_uuid(),
    "company_id" uuid,
    "reference" text not null,
    "requested_amount" numeric(14,2) not null default 0,
    "approved_amount" numeric(14,2),
    "offered_amount" numeric(14,2),
    "factor_rate" numeric(7,4),
    "repayment_amount" numeric(14,2),
    "term_days" integer,
    "eligibility_score" numeric(5,2),
    "average_monthly_sales" numeric(14,2),
    "status" text not null default 'draft',
    "application_data" jsonb default '{}'::jsonb,
    "partner_reference" text,
    "submitted_at" timestamptz,
    "offered_at" timestamptz,
    "disbursed_at" timestamptz,
    "repaid_at" timestamptz,
    "created_by" uuid,
    "created_at" timestamptz not null default now(),
    "updated_at" timestamptz not null default now(),
    constraint "cash_advances_pkey" primary key ("id")
);

create unique index if not exists "cash_advances_reference_key"
    on "public"."cash_advances" ("reference");
create index if not exists "cash_advances_company_id_idx"
    on "public"."cash_advances" ("company_id");
create index if not exists "cash_advances_status_idx"
    on "public"."cash_advances" ("status");

alter table "public"."cash_advances"
    add constraint "cash_advances_company_id_fkey"
    foreign key ("company_id") references "public"."company_settings" ("id")
    on delete cascade not valid;
alter table "public"."cash_advances" validate constraint "cash_advances_company_id_fkey";

alter table "public"."cash_advances"
    add constraint "cash_advances_status_check"
    check ("status" in ('draft', 'submitted', 'offered', 'accepted', 'rejected', 'disbursed', 'repaid', 'overdue')) not valid;
alter table "public"."cash_advances" validate constraint "cash_advances_status_check";

alter table "public"."cash_advances" enable row level security;

drop policy if exists "cash_advances_tenant_policy" on "public"."cash_advances";
create policy "cash_advances_tenant_policy" on "public"."cash_advances"
    for all using (
        company_id = public.get_user_company_id()
    );

drop policy if exists "cash_advances_admin_policy" on "public"."cash_advances";
create policy "cash_advances_admin_policy" on "public"."cash_advances"
    for all using (
        public.is_user_admin()
    );

comment on table "public"."cash_advances" is
    'Demandes et offres d''avance de trésorerie basées sur l''historique des ventes.';
