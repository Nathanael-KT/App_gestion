import { logger } from "../../utils/logger";
// Webhook Stripe : reçoit les événements de paiement/abonnement et met à
// jour company_subscription automatiquement. Remplace le cochage manuel
// "is_paid" par le superadmin (voir app/pages/superadmin/abonnements.vue)
// par une synchronisation fiable pilotée par Stripe (issue #89).
//
// Automatismes appliqués ici :
// - Paiement reçu (checkout / facture)  → abonnement "actif", menus de
//   l'offre appliqués, blocage automatique levé (sauf blocage manuel).
// - Échec de paiement / abonnement résilié → statut mis à jour ; l'accès
//   est coupé après 1 jour de grâce (cron + middleware), puis rétabli
//   automatiquement dès que le paiement repasse.
//
// Sécurité: la requête est vérifiée via la signature Stripe
// (STRIPE_WEBHOOK_SECRET), pas par un token applicatif — c'est Stripe qui
// authentifie l'appel, pas notre système d'auth utilisateur.
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { createError, defineEventHandler, getHeader, readRawBody } from "h3";
import {
  applyPlanMenuAccess,
  blockCompanyForSubscription,
  unblockCompanyIfAutomatic,
} from "../../utils/subscriptionAccess";

export default defineEventHandler(async (event) => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeSecretKey || !webhookSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "Configuration Stripe manquante côté serveur",
    });
  }
  const stripe = new Stripe(stripeSecretKey);

  const signature = getHeader(event, "stripe-signature");
  const rawBody = await readRawBody(event);
  if (!signature || !rawBody) {
    throw createError({ statusCode: 400, statusMessage: "Requête invalide" });
  }

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (err) {
    logger.error("Signature webhook Stripe invalide:", err);
    throw createError({ statusCode: 400, statusMessage: "Signature invalide" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Configuration Supabase manquante côté serveur",
    });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  async function upsertSubscriptionForCompany(
    companyId: string,
    fields: Record<string, unknown>
  ) {
    const { data: existing } = await supabase
      .from("company_subscription")
      .select("id")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("company_subscription")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", (existing as { id: string }).id);
    } else {
      await supabase
        .from("company_subscription")
        .insert({ company_id: companyId, ...fields });
    }
  }

  // Depuis l'API Stripe 2025+, l'invoice ne porte plus directement un champ
  // "subscription" : l'ID est désormais sous invoice.parent.subscription_details.
  function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
    const parent = invoice.parent;
    if (parent?.type === "subscription_details") {
      const sub = parent.subscription_details?.subscription;
      return typeof sub === "string" ? sub : (sub?.id ?? null);
    }
    return null;
  }

  switch (stripeEvent.type) {
    case "checkout.session.completed": {
      const session = stripeEvent.data.object as Stripe.Checkout.Session;
      const companyId = session.metadata?.company_id;
      const planSlug = session.metadata?.plan_slug;
      if (!companyId) break;

      let planId: string | null = null;
      if (planSlug) {
        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("id")
          .eq("slug", planSlug)
          .maybeSingle();
        planId = plan?.id ?? null;
      }

      await upsertSubscriptionForCompany(companyId, {
        is_paid: true,
        status: "actif",
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        plan_id: planId,
        last_payment_date: new Date().toISOString().split("T")[0],
      });

      // Applique les restrictions de menus de l'offre choisie, puis lève
      // le blocage éventuel (uniquement s'il n'est pas manuel).
      await applyPlanMenuAccess(supabase, companyId, planId);
      await unblockCompanyIfAutomatic(supabase, companyId);
      break;
    }

    case "invoice.paid": {
      const invoice = stripeEvent.data.object as Stripe.Invoice;
      const subscriptionId = getSubscriptionIdFromInvoice(invoice);
      if (!subscriptionId) break;

      const { data: subRaw } = await supabase
        .from("company_subscription")
        .select("id, company_id, plan_id")
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle();
      const sub = subRaw as {
        id: string;
        company_id: string;
        plan_id: string | null;
      } | null;
      if (!sub) break;

      const periodEnd = invoice.lines?.data?.[0]?.period?.end;
      await supabase
        .from("company_subscription")
        .update({
          is_paid: true,
          status: "actif",
          last_payment_date: new Date().toISOString().split("T")[0],
          next_due_date: periodEnd
            ? new Date(periodEnd * 1000).toISOString().split("T")[0]
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);

      // Paiement mensuel confirmé par Stripe : ré-application des menus de
      // l'offre et levée du blocage automatique (jamais du blocage manuel).
      await applyPlanMenuAccess(supabase, sub.company_id, sub.plan_id);
      await unblockCompanyIfAutomatic(supabase, sub.company_id);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = stripeEvent.data.object as Stripe.Invoice;
      const subscriptionId = getSubscriptionIdFromInvoice(invoice);
      if (!subscriptionId) break;

      // Le statut passe "en_attente" ; si l'échec persiste au-delà de la
      // grâce (1 jour après échéance), le cron quotidien bloque l'accès.
      await supabase
        .from("company_subscription")
        .update({
          status: "en_attente",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscriptionId);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = stripeEvent.data.object as Stripe.Subscription;

      const { data: subRaw } = await supabase
        .from("company_subscription")
        .select("id, company_id")
        .eq("stripe_subscription_id", subscription.id)
        .maybeSingle();
      const sub = subRaw as { id: string; company_id: string } | null;

      await supabase
        .from("company_subscription")
        .update({
          is_paid: false,
          status: "inactif",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);

      // Abonnement résilié côté Stripe : l'accès est coupé (raison
      // "subscription" → rétablissement automatique à la réactivation).
      if (sub) {
        await blockCompanyForSubscription(supabase, sub.company_id);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = stripeEvent.data.object as Stripe.Subscription;
      await supabase
        .from("company_subscription")
        .update({
          cancel_at_period_end: subscription.cancel_at_period_end ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }

    default:
      // Événement non géré : ignoré volontairement (pas d'erreur).
      break;
  }

  return { received: true };
});
