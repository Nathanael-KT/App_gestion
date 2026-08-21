// Crée une session Stripe Checkout pour abonner l'entreprise de
// l'utilisateur connecté à un plan (voir subscription_plans).
// Réservé aux admin/super_admin de l'entreprise concernée.
import Stripe from "stripe";
import { createError, defineEventHandler, getHeader, readBody } from "h3";
import { requireAdmin } from "../../utils/requireAdmin";

export default defineEventHandler(async (event) => {
  const { userId, companyId, adminClient } = await requireAdmin(event, [
    "admin",
    "super_admin",
  ]);

  if (!companyId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Aucune entreprise associée à ce compte",
    });
  }

  const body = await readBody<{ planSlug?: string }>(event);
  const planSlug = body?.planSlug;
  if (!planSlug) {
    throw createError({
      statusCode: 400,
      statusMessage: "planSlug requis (ex: 'rapide' ou 'pro')",
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

  const { data: planRaw, error: planError } = await adminClient
    .from("subscription_plans")
    .select("id, slug, name, stripe_price_id, is_active")
    .eq("slug", planSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (planError || !planRaw) {
    throw createError({ statusCode: 404, statusMessage: "Offre introuvable" });
  }
  const plan = planRaw as {
    id: string;
    slug: string;
    name: string;
    stripe_price_id: string | null;
    is_active: boolean;
  };
  if (!plan.stripe_price_id) {
    throw createError({
      statusCode: 500,
      statusMessage:
        "Cette offre n'a pas encore de prix Stripe configuré (stripe_price_id manquant)",
    });
  }

  const { data: companyRaw, error: companyError } = await adminClient
    .from("company_settings")
    .select("id, company_name, company_email")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError || !companyRaw) {
    throw createError({
      statusCode: 404,
      statusMessage: "Entreprise introuvable",
    });
  }
  const company = companyRaw as {
    id: string;
    company_name: string | null;
    company_email: string | null;
  };

  const { data: existingSubRaw } = await adminClient
    .from("company_subscription")
    .select("id, stripe_customer_id")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const existingSub = existingSubRaw as {
    id: string;
    stripe_customer_id: string | null;
  } | null;

  // Réutilise le customer Stripe existant s'il y en a déjà un, sinon en
  // crée un nouveau lié à l'entreprise (pas à l'utilisateur individuel,
  // pour que l'abonnement survive à un changement de gestionnaire).
  let stripeCustomerId = existingSub?.stripe_customer_id ?? null;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      name: company.company_name ?? undefined,
      email: company.company_email ?? undefined,
      metadata: { company_id: companyId },
    });
    stripeCustomerId = customer.id;
  }

  const origin =
    getHeader(event, "origin") ||
    process.env.PUBLIC_APP_URL ||
    "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    success_url: `${origin}/parametres/abonnement?checkout=success`,
    cancel_url: `${origin}/parametres/abonnement?checkout=cancelled`,
    subscription_data: {
      metadata: { company_id: companyId, plan_slug: plan.slug },
    },
    metadata: {
      company_id: companyId,
      plan_slug: plan.slug,
      requested_by_user_id: userId,
    },
  });

  return { checkoutUrl: session.url };
});
