// Endpoint appelé chaque 1er du mois par un scheduler externe
// (GitHub Actions cron / Vercel Cron) pour mettre à jour le statut des
// abonnements selon la période de grâce de paiement.
//
// Sécurité: protégé par un secret partagé (CRON_SECRET) transmis via le
// header "x-cron-secret". Sans ce secret, n'importe qui pourrait déclencher
// le blocage de comptes en retard à volonté (déni de service applicatif).
import { createClient } from "@supabase/supabase-js";
import { createError, defineEventHandler, getHeader } from "h3";

const GRACE_PERIOD_DAYS = 7;

async function updateSubscriptions(
  supabase: ReturnType<typeof createClient>
) {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Récupérer tous les abonnements
  const { data: subscriptions, error } = await supabase
    .from("company_subscription")
    .select("*");

  if (error) {
    console.error("Erreur récupération abonnements:", error);
    return;
  }

  for (const sub of subscriptions) {
    // Si le paiement n'est pas fait pour le mois
    if (
      !sub.last_payment_date ||
      new Date(sub.last_payment_date) < firstOfMonth
    ) {
      // Calculer la date limite de grâce
      const graceLimit = new Date(firstOfMonth);
      graceLimit.setDate(graceLimit.getDate() + GRACE_PERIOD_DAYS);
      // Si on est après la période de grâce, bloquer
      if (today > graceLimit) {
        await supabase
          .from("company_subscription")
          .update({ status: "bloque" })
          .eq("id", sub.id);
      } else {
        await supabase
          .from("company_subscription")
          .update({ status: "en_attente" })
          .eq("id", sub.id);
      }
    } else {
      // Paiement ok, abonnement actif
      await supabase
        .from("company_subscription")
        .update({ status: "actif" })
        .eq("id", sub.id);
    }
  }
  console.log("Mise à jour des statuts terminée.");
}

export default defineEventHandler(async (event) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "CRON_SECRET n'est pas configuré sur le serveur",
    });
  }

  const providedSecret = getHeader(event, "x-cron-secret");
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
  await updateSubscriptions(supabase);

  return { success: true, message: "Statuts des abonnements mis à jour" };
});
