// Synchronisation à la demande des abonnements avec Stripe, réservée au
// super_admin (issue #89) : permet de vérifier que les paiements mensuels
// des entreprises passent bien, sans intervention manuelle.
//
// Pour chaque abonnement lié à Stripe (stripe_subscription_id), on récupère
// l'état réel côté Stripe (statut + dernière facture) et on réconcilie la
// base : is_paid, status, next_due_date, menus de l'offre, blocage
// automatique levé ou appliqué.
//
// Sécurité : requireAdmin(["super_admin"]) — token utilisateur vérifié et
// rôle super_admin obligatoire.
import Stripe from "stripe";
import { createError, defineEventHandler } from "h3";
import { requireAdmin } from "../../utils/requireAdmin";
import {
  applyPlanMenuAccess,
  blockCompanyForSubscription,
  unblockCompanyIfAutomatic,
} from "../../utils/subscriptionAccess";
import { logger } from "../../utils/logger";

interface SubscriptionRow {
  id: string;
  company_id: string;
  is_paid: boolean | null;
  status: string | null;
  plan_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  cancel_at_period_end: boolean | null;
}

interface SyncResultItem {
  companyId: string;
  stripeSubscriptionId: string | null;
  stripeStatus: string | null;
  action:
    | "activated"
    | "marked_past_due"
    | "deactivated"
    | "no_stripe_link"
    | "not_found_in_stripe"
    | "unchanged"
    | "error";
  detail?: string;
}

function toISODate(unixSeconds: number | null | undefined): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString().split("T")[0] ?? null;
}

export default defineEventHandler(async (event) => {
  // Vérification stricte : super_admin uniquement.
  const { adminClient } = await requireAdmin(event, ["super_admin"]);

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "STRIPE_SECRET_KEY n'est pas configuré sur le serveur",
    });
  }
  const stripe = new Stripe(stripeSecretKey);

  // Ligne d'abonnement la plus récente par entreprise.
  const { data: rows, error } = await adminClient
    .from("company_subscription")
    .select(
      "id, company_id, is_paid, status, plan_id, stripe_customer_id, stripe_subscription_id, cancel_at_period_end, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Lecture des abonnements impossible",
    });
  }

  const latestByCompany = new Map<string, SubscriptionRow>();
  for (const row of (rows as SubscriptionRow[]) || []) {
    if (!latestByCompany.has(row.company_id)) {
      latestByCompany.set(row.company_id, row);
    }
  }

  const results: SyncResultItem[] = [];

  for (const sub of latestByCompany.values()) {
    if (!sub.stripe_subscription_id) {
      results.push({
        companyId: sub.company_id,
        stripeSubscriptionId: null,
        stripeStatus: null,
        action: "no_stripe_link",
        detail:
          "Aucun abonnement Stripe lié (paiement manuel ou jamais souscrit).",
      });
      continue;
    }

    try {
      const stripeSub = await stripe.subscriptions.retrieve(
        sub.stripe_subscription_id,
      );

      // Dernière facture payée → borne de la période couverte.
      let paidPeriodEnd: string | null = null;
      const invoices = await stripe.invoices.list({
        subscription: stripeSub.id,
        status: "paid",
        limit: 1,
      });
      const lastPaidInvoice = invoices.data[0];
      if (lastPaidInvoice) {
        const periodEnd = lastPaidInvoice.lines?.data?.[0]?.period?.end;
        paidPeriodEnd = toISODate(periodEnd);
      }

      const nowIso = new Date().toISOString();
      const today = nowIso.split("T")[0];

      switch (stripeSub.status) {
        case "active":
        case "trialing": {
          await adminClient
            .from("company_subscription")
            .update({
              is_paid: true,
              status: "actif",
              next_due_date: paidPeriodEnd,
              cancel_at_period_end: stripeSub.cancel_at_period_end ?? false,
              updated_at: nowIso,
            })
            .eq("id", sub.id);
          await applyPlanMenuAccess(adminClient, sub.company_id, sub.plan_id);
          await unblockCompanyIfAutomatic(adminClient, sub.company_id);
          results.push({
            companyId: sub.company_id,
            stripeSubscriptionId: stripeSub.id,
            stripeStatus: stripeSub.status,
            action: "activated",
            detail: paidPeriodEnd
              ? `Payé jusqu'au ${paidPeriodEnd}`
              : "Abonnement Stripe actif",
          });
          break;
        }

        case "past_due":
        case "unpaid": {
          await adminClient
            .from("company_subscription")
            .update({
              status: "en_attente",
              next_due_date: paidPeriodEnd,
              updated_at: nowIso,
            })
            .eq("id", sub.id);
          // Si la période payée est dépassée (grâce gérée côté middleware
          // / cron), on bloque immédiatement de manière automatique.
          if (!paidPeriodEnd || paidPeriodEnd < (today ?? "")) {
            await blockCompanyForSubscription(adminClient, sub.company_id);
          }
          results.push({
            companyId: sub.company_id,
            stripeSubscriptionId: stripeSub.id,
            stripeStatus: stripeSub.status,
            action: "marked_past_due",
            detail: "Paiement en retard côté Stripe.",
          });
          break;
        }

        case "canceled":
        case "incomplete_expired": {
          await adminClient
            .from("company_subscription")
            .update({
              is_paid: false,
              status: "inactif",
              cancel_at_period_end: false,
              updated_at: nowIso,
            })
            .eq("id", sub.id);
          await blockCompanyForSubscription(adminClient, sub.company_id);
          results.push({
            companyId: sub.company_id,
            stripeSubscriptionId: stripeSub.id,
            stripeStatus: stripeSub.status,
            action: "deactivated",
            detail: "Abonnement résilié côté Stripe.",
          });
          break;
        }

        default: {
          results.push({
            companyId: sub.company_id,
            stripeSubscriptionId: stripeSub.id,
            stripeStatus: stripeSub.status,
            action: "unchanged",
            detail: `Statut Stripe "${stripeSub.status}" sans action.`,
          });
        }
      }
    } catch (err) {
      const stripeCode = (err as Stripe.errors.StripeError)?.code;
      if (stripeCode === "resource_missing") {
        results.push({
          companyId: sub.company_id,
          stripeSubscriptionId: sub.stripe_subscription_id,
          stripeStatus: null,
          action: "not_found_in_stripe",
          detail: "Abonnement introuvable dans Stripe (supprimé ?).",
        });
      } else {
        logger.error("sync-stripe-subscriptions:", err);
        results.push({
          companyId: sub.company_id,
          stripeSubscriptionId: sub.stripe_subscription_id,
          stripeStatus: null,
          action: "error",
          detail: err instanceof Error ? err.message : "Erreur Stripe",
        });
      }
    }
  }

  const summary = {
    total: results.length,
    activated: results.filter((r) => r.action === "activated").length,
    pastDue: results.filter((r) => r.action === "marked_past_due").length,
    deactivated: results.filter((r) => r.action === "deactivated").length,
    withoutStripe: results.filter((r) => r.action === "no_stripe_link").length,
    errors: results.filter((r) => r.action === "error").length,
  };

  return { success: true, summary, results };
});
