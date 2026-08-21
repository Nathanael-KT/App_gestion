import { logger } from "../../utils/logger";
// Endpoint appelé quotidiennement par un scheduler externe (Vercel Cron,
// GitHub Actions...) pour appliquer automatiquement la règle métier de
// l'issue #89 :
//
//   mois payé     → accès (abonnement "actif", blocage auto levé)
//   mois non payé → pas d'accès après 1 jour de grâce, jusqu'au paiement
//
// Le blocage automatique utilise company_settings.blocked_reason =
// "subscription" : il est levé automatiquement dès régularisation (webhook
// Stripe ou cron), contrairement au blocage "manual" du super_admin qui
// n'est jamais touché.
//
// Sécurité: protégé par le secret partagé CRON_SECRET, accepté via le
// header "x-cron-secret" (appels manuels/CI) ou "Authorization: Bearer ..."
// (format natif de Vercel Cron). Sans ce secret, n'importe qui pourrait
// déclencher le blocage de comptes à volonté.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createError, defineEventHandler, getHeader } from "h3";
import { evaluateSubscriptionAccess } from "../../../app/utils/subscriptionAccess";
import {
  blockCompanyForSubscription,
  unblockCompanyIfAutomatic,
} from "../../utils/subscriptionAccess";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any>;

interface SubscriptionRow {
  id: string;
  company_id: string;
  is_paid: boolean | null;
  status: string | null;
  next_due_date: string | null;
}

interface CronReport {
  checked: number;
  activated: number;
  pending: number;
  blocked: number;
  unchanged: number;
  errors: number;
}

async function updateSubscriptions(supabase: AdminClient): Promise<CronReport> {
  const report: CronReport = {
    checked: 0,
    activated: 0,
    pending: 0,
    blocked: 0,
    unchanged: 0,
    errors: 0,
  };
  const now = new Date();

  // On ne traite que la ligne d'abonnement la plus récente par entreprise.
  const { data: subscriptions, error } = await supabase
    .from("company_subscription")
    .select("id, company_id, is_paid, status, next_due_date, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Erreur récupération abonnements:", error);
    return report;
  }

  const latestByCompany = new Map<string, SubscriptionRow>();
  for (const row of (subscriptions as SubscriptionRow[]) || []) {
    if (!latestByCompany.has(row.company_id)) {
      latestByCompany.set(row.company_id, row);
    }
  }

  for (const sub of latestByCompany.values()) {
    report.checked++;
    const access = evaluateSubscriptionAccess(sub, now);

    try {
      switch (access) {
        case "granted": {
          // Paiement à jour : abonnement actif + levée du blocage
          // automatique éventuel (les blocages "manual" sont préservés).
          if (sub.status !== "actif") {
            await supabase
              .from("company_subscription")
              .update({ status: "actif", updated_at: now.toISOString() })
              .eq("id", sub.id);
            report.activated++;
          } else {
            report.unchanged++;
          }
          await unblockCompanyIfAutomatic(supabase, sub.company_id);
          break;
        }

        case "overdue": {
          // Échéance dépassée (+ grâce) : blocage automatique jusqu'au
          // paiement ("pas payé = pas d'accès après 1 jour").
          if (sub.status !== "bloque") {
            await supabase
              .from("company_subscription")
              .update({ status: "bloque", updated_at: now.toISOString() })
              .eq("id", sub.id);
          }
          await blockCompanyForSubscription(supabase, sub.company_id);
          report.blocked++;
          break;
        }

        case "payment_required": {
          // Jamais payé (nouvelle entreprise notamment) : on s'assure juste
          // du statut "inactif" — l'accès est déjà limité à la page
          // Abonnement par le middleware.
          if (sub.status !== "inactif" && sub.status !== "en_attente") {
            await supabase
              .from("company_subscription")
              .update({ status: "inactif", updated_at: now.toISOString() })
              .eq("id", sub.id);
            report.pending++;
          } else {
            report.unchanged++;
          }
          break;
        }

        case "blocked": {
          // Déjà bloqué : s'assurer que le blocage entreprise est en place.
          await blockCompanyForSubscription(supabase, sub.company_id);
          report.unchanged++;
          break;
        }
      }
    } catch (err) {
      report.errors++;
      logger.error(`Cron abonnements: erreur entreprise ${sub.company_id}:`, err);
    }
  }

  logger.debug("Mise à jour quotidienne des abonnements terminée.", report);
  return report;
}

export default defineEventHandler(async (event) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "CRON_SECRET n'est pas configuré sur le serveur",
    });
  }

  const headerSecret = getHeader(event, "x-cron-secret");
  const authHeader = getHeader(event, "authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  const providedSecret = headerSecret || bearerSecret;
  if (!providedSecret || providedSecret !== cronSecret) {
    throw createError({
      statusCode: 401,
      statusMessage: "Secret cron invalide ou manquant",
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant",
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const report = await updateSubscriptions(supabase);

  return {
    success: true,
    message: "Statuts des abonnements mis à jour",
    report,
  };
});
