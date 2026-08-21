-- Contrôle d'accès par abonnement (issue #89)
-- Objectif : rendre la gestion des abonnements automatique côté super_admin.
--   1. company_settings.blocked_reason distingue le blocage manuel
--      (super_admin, jamais levé automatiquement) du blocage automatique
--      pour non-paiement (levé dès régularisation).
--   2. subscription_plans.allowed_menus restreint les menus accessibles
--      selon l'offre choisie par l'entreprise (NULL = tous les menus).
--   3. Toute nouvelle entreprise reçoit automatiquement une ligne
--      company_subscription "inactif"/non payée : ses utilisateurs n'ont
--      accès qu'à la page Abonnement tant que le paiement n'est pas fait.

-- =========================================================================
-- 1. Raison du blocage sur company_settings
-- =========================================================================
alter table "public"."company_settings"
  add column if not exists "blocked_reason" text;

-- Contrainte souple : seules ces valeurs (ou NULL) sont attendues.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'company_settings_blocked_reason_check'
  ) then
    alter table "public"."company_settings"
      add constraint company_settings_blocked_reason_check
      check (blocked_reason in ('manual', 'subscription'));
  end if;
end $$;

comment on column "public"."company_settings"."blocked_reason" is
  'Origine du blocage : "manual" (super_admin, jamais levé automatiquement) ou "subscription" (non-paiement, levé automatiquement après paiement). NULL si non bloqué.';

-- Les blocages existants avant cette migration étaient forcément manuels
-- (seul le super_admin pouvait bloquer) : on les marque comme tels pour
-- qu'ils ne soient pas levés automatiquement par le prochain paiement.
update "public"."company_settings"
set "blocked_reason" = 'manual'
where "blocked" is true and "blocked_reason" is null;

-- =========================================================================
-- 2. Menus autorisés par offre d'abonnement
-- =========================================================================
alter table "public"."subscription_plans"
  add column if not exists "allowed_menus" text[];

comment on column "public"."subscription_plans"."allowed_menus" is
  'Menus applicatifs accessibles avec cette offre. NULL ou tableau vide = tous les menus. Valeurs possibles : Accueil, Stock, Clients, Commandes, Facture, Caisse, Utilisateurs, Rapports, Discussion, Paramètres, Aide.';

-- L'offre de départ "Rapide" ne couvre pas les modules avancés
-- (Caisse, Rapports, gestion Utilisateurs, Discussion). "Pro" garde tout
-- (allowed_menus reste NULL). Ajustable depuis la base par le super_admin.
update "public"."subscription_plans"
set "allowed_menus" = array[
  'Accueil', 'Stock', 'Clients', 'Commandes', 'Facture', 'Paramètres', 'Aide'
]
where "slug" = 'rapide' and "allowed_menus" is null;

-- =========================================================================
-- 3. Création automatique de l'abonnement "inactif" pour toute nouvelle
--    entreprise (accès limité à la page Abonnement jusqu'au 1er paiement)
-- =========================================================================
create or replace function "public"."create_default_company_subscription"()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Idempotent : ne rien faire si une ligne existe déjà pour l'entreprise.
  if not exists (
    select 1 from "public"."company_subscription"
    where "company_id" = new."id"
  ) then
    insert into "public"."company_subscription"
      ("company_id", "is_paid", "status")
    values
      (new."id", false, 'inactif');
  end if;
  return new;
end;
$$;

comment on function "public"."create_default_company_subscription"() is
  'Crée automatiquement un abonnement inactif/non payé pour chaque nouvelle entreprise : accès appli limité à la page Abonnement jusqu''au paiement (issue #89).';

drop trigger if exists trg_company_settings_default_subscription
  on "public"."company_settings";

create trigger trg_company_settings_default_subscription
  after insert on "public"."company_settings"
  for each row
  execute function "public"."create_default_company_subscription"();

-- Note : les entreprises déjà existantes SANS ligne company_subscription ne
-- sont pas modifiées volontairement (pas de coupure surprise au déploiement).
-- Elles entrent dans le circuit automatique à leur premier paiement Stripe,
-- ou dès que le super_admin crée/active leur abonnement depuis
-- /superadmin/abonnements. Les nouvelles entreprises, elles, sont toujours
-- créées avec un abonnement "inactif" via le trigger ci-dessus.
