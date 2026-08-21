// Helpers serveur pour appliquer les règles d'accès liées aux abonnements
// (issue #89). Utilisés par le webhook Stripe, le cron quotidien et
// l'endpoint de synchronisation superadmin.
//
// Convention de blocage (colonne company_settings.blocked_reason) :
//   - "subscription" : blocage automatique lié au paiement — levé
//     automatiquement dès que le paiement est régularisé.
//   - "manual"       : blocage volontaire du super_admin depuis la fiche
//     entreprise — jamais levé automatiquement.
//   - null           : pas de blocage (ou blocage hérité avant migration).
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeBlockedMenus } from "../../app/utils/subscriptionAccess";
import { logger } from "./logger";

export type BlockedReason = "manual" | "subscription";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any>;

/**
 * Applique les restrictions de menus de l'offre choisie à l'entreprise :
 * company_settings.blocked_menus = tous les menus - allowed_menus du plan.
 * Un plan sans allowed_menus (NULL) = accès à tous les menus.
 */
export async function applyPlanMenuAccess(
  adminClient: AdminClient,
  companyId: string,
  planId: string | null | undefined,
): Promise<void> {
  if (!planId) return;

  const { data: plan, error } = await adminClient
    .from("subscription_plans")
    .select("allowed_menus")
    .eq("id", planId)
    .maybeSingle();

  if (error) {
    logger.error("applyPlanMenuAccess: lecture plan impossible:", error);
    return;
  }

  const allowedMenus = (plan?.allowed_menus as string[] | null) ?? null;
  const blockedMenus = computeBlockedMenus(allowedMenus);

  const { error: updateError } = await adminClient
    .from("company_settings")
    .update({ blocked_menus: blockedMenus })
    .eq("id", companyId);

  if (updateError) {
    logger.error("applyPlanMenuAccess: maj blocked_menus:", updateError);
  }
}

/**
 * Bloque une entreprise pour raison d'abonnement (non-paiement).
 * N'écrase jamais un blocage manuel existant par une autre raison : un
 * blocage "manual" reste "manual".
 */
export async function blockCompanyForSubscription(
  adminClient: AdminClient,
  companyId: string,
): Promise<void> {
  const { data: settings } = await adminClient
    .from("company_settings")
    .select("blocked, blocked_reason")
    .eq("id", companyId)
    .maybeSingle();

  if (!settings) return;
  if (settings.blocked === true && settings.blocked_reason === "manual") {
    return; // le blocage manuel prime
  }

  await adminClient
    .from("company_settings")
    .update({ blocked: true, blocked_reason: "subscription" })
    .eq("id", companyId);
}

/**
 * Lève le blocage automatique d'une entreprise après régularisation.
 * Ne touche JAMAIS un blocage "manual" ( décision explicite du super_admin
 * depuis la fiche entreprise, ex. abus ).
 *
 * Note historique : les blocages sans raison (NULL, avant la migration) sont
 * levés pour conserver le comportement antérieur du webhook de paiement.
 */
export async function unblockCompanyIfAutomatic(
  adminClient: AdminClient,
  companyId: string,
): Promise<boolean> {
  const { data: settings } = await adminClient
    .from("company_settings")
    .select("blocked, blocked_reason")
    .eq("id", companyId)
    .maybeSingle();

  if (!settings || settings.blocked !== true) return false;
  if (settings.blocked_reason === "manual") return false;

  const { error } = await adminClient
    .from("company_settings")
    .update({ blocked: false, blocked_reason: null })
    .eq("id", companyId);

  if (error) {
    logger.error("unblockCompanyIfAutomatic:", error);
    return false;
  }
  return true;
}
