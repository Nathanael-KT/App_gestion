// Crée une session du portail client Stripe, permettant à l'admin
// d'entreprise de gérer son moyen de paiement, consulter ses factures et
// annuler son abonnement sans passer par le superadmin.
import Stripe from "stripe";
import { createError, defineEventHandler, getHeader } from "h3";
import { requireAdmin } from "../../utils/requireAdmin";

export default defineEventHandler(async (event) => {
  const { companyId, adminClient } = await requireAdmin(event, [
    "admin",
    "super_admin",
  ]);

  if (!companyId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Aucune entreprise associée à ce compte",
    });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "STRIPE_SECRET_KEY n'est pas configuré sur le serveur",
    });
  }
  const stripe = new Stripe(stripeSecretKey);

  const { data: subRaw } = await adminClient
    .from("company_subscription")
    .select("stripe_customer_id")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sub = subRaw as { stripe_customer_id: string | null } | null;

  if (!sub?.stripe_customer_id) {
    throw createError({
      statusCode: 404,
      statusMessage: "Aucun abonnement Stripe trouvé pour cette entreprise",
    });
  }

  const origin =
    getHeader(event, "origin") ||
    process.env.PUBLIC_APP_URL ||
    "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${origin}/parametres/abonnement`,
  });

  return { portalUrl: session.url };
});
