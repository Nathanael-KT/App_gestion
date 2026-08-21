# Gestion des abonnements (issue #89)

Cycle de vie entièrement automatisé des abonnements entreprises : paiement
Stripe, contrôle d'accès à l'application, actions super_admin.

## Règles métier

| Situation | Accès application |
| --- | --- |
| Nouvelle entreprise (jamais payée) | Page **Abonnement uniquement** |
| Mois payé (échéance non dépassée) | Accès complet (selon l'offre) |
| Échéance dépassée | **1 jour de grâce**, puis coupure → page Abonnement |
| Paiement régularisé | Déblocage **automatique** (webhook Stripe, cron ou sync) |
| Abonnement résilié côté Stripe | Coupure immédiate (raison `subscription`) |
| Période gratuite (super_admin) | Accès complet jusqu'à la nouvelle échéance |

## Automatismes en place

1. **Création d'entreprise** → un trigger SQL crée automatiquement un
   abonnement `inactif` / non payé
   (`supabase/migrations/20260822000000_subscription_access_control.sql`).
   Le middleware global (`app/middleware/block-company.global.ts`) limite
   alors l'accès à `/parametres/abonnement`.
2. **Paiement Stripe** → `server/api/stripe/webhook.post.ts` active
   l'abonnement (`actif`), applique les menus de l'offre et lève le
   blocage automatique.
3. **Chaque jour à 05:00 UTC** → Vercel Cron appelle
   `server/api/cron/update-subscription-status.ts` : payé → `actif` ;
   impayé au-delà de la grâce → `bloque` + blocage entreprise
   `blocked_reason = "subscription"` (levé automatiquement au paiement).
4. **Bouton « Synchroniser Stripe »** sur `/superadmin/abonnements` →
   `server/api/superadmin/sync-stripe-subscriptions.post.ts` interroge
   l'API Stripe (super_admin uniquement) et réconcilie la base : le
   super_admin voit en un coup d'œil si les paiements mensuels passent.

## Blocage manuel vs automatique

`company_settings.blocked_reason` :

- `manual` — posé depuis la fiche entreprise
  (`/superadmin/company/[id]`). **Jamais levé automatiquement**, même si un
  paiement arrive.
- `subscription` — posé par le cron / la sync / le webhook résiliation.
  Levé automatiquement dès régularisation.
- `null` — pas de blocage.

## Accès selon l'offre choisie

`subscription_plans.allowed_menus` (NULL = tous les menus) définit les
modules accessibles. À chaque paiement confirmé ou sync, les menus hors
offre sont écrits dans `company_settings.blocked_menus` et bloqués par le
middleware. Offre « Rapide » de départ : pas de Caisse / Utilisateurs /
Rapports / Discussion. Offre « Pro » : tout inclus.

## Périodes gratuites

Depuis `/superadmin/abonnements` → sélectionner une compagnie →
« Période gratuite » : le super_admin (et lui seul) accorde des **semaines
ou des mois** d'accès gratuit. L'échéance est prolongée d'autant (à partir
de l'échéance future existante s'il y en a une), sans paiement Stripe.
Chaque octroi est tracé dans le journal des actions.

## Configuration requise

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (webhook →
  `/api/stripe/webhook`, événements : `checkout.session.completed`,
  `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`,
  `customer.subscription.deleted`).
- `CRON_SECRET` — envoyé automatiquement en `Authorization: Bearer` par
  Vercel Cron (section `crons` de `vercel.json`).
- `subscription_plans.stripe_price_id` renseigné pour chaque offre.

## Logique partagée

`app/utils/subscriptionAccess.ts` centralise l'évaluation d'accès
(pure, testée dans `tests/subscriptionAccess.test.ts`) ; utilisée par le
middleware et le cron. La grâce y est configurable via
`SUBSCRIPTION_GRACE_PERIOD_DAYS` (1 jour par défaut).
