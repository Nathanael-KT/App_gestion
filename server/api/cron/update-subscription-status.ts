// Script Node.js à placer dans server/api/cron/update-subscription-status.ts
// Ce script doit être appelé chaque 1er du mois (via cron ou scheduler)
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant");
}
const supabase = createClient(supabaseUrl, supabaseKey);

const GRACE_PERIOD_DAYS = 7;

async function updateSubscriptions() {
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

updateSubscriptions();
