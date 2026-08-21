// Logique pure d'évaluation de l'accès lié aux abonnements.
// Partagée entre le middleware client (app/middleware/block-company.global.ts),
// les endpoints serveur (cron, webhook, sync Stripe) et les tests unitaires.
// Aucune dépendance Vue/Nuxt ici : uniquement du TypeScript pur.

/**
 * Période de grâce après l'échéance avant coupure de l'accès (issue #89 :
 * "mois pas payé = pas accès après 1 jour jusqu'au jour de paie").
 */
export const SUBSCRIPTION_GRACE_PERIOD_DAYS = 1;

export type SubscriptionAccessState =
  | "granted" // Abonnement payé et dans sa période de validité (ou grâce)
  | "payment_required" // Jamais payé / aucun abonnement → choisir une offre
  | "overdue" // Échéance dépassée (grâce incluse) → régulariser
  | "blocked"; // Abonnement bloqué (non-paiement prolongé)

export interface SubscriptionAccessInput {
  is_paid?: boolean | null;
  status?: string | null;
  next_due_date?: string | null;
}

/**
 * Menus applicatifs connus (clés de MENU_TO_PATH du middleware global).
 * Utilisé pour dériver les menus bloqués à partir des menus autorisés
 * par l'offre d'abonnement (subscription_plans.allowed_menus).
 */
export const ALL_APP_MENUS = [
  "Accueil",
  "Stock",
  "Clients",
  "Commandes",
  "Facture",
  "Caisse",
  "Utilisateurs",
  "Rapports",
  "Discussion",
  "Paramètres",
  "Aide",
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDateSafe(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date.getTime());
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Évalue l'état d'accès d'une entreprise à partir de son abonnement courant.
 *
 * Règles métier (automatiques) :
 * - Pas d'abonnement ou jamais payé      → "payment_required" (page abonnement)
 * - Abonnement bloqué                    → "blocked"
 * - Payé et échéance non dépassée        → "granted"
 * - Payé mais échéance dépassée + grâce  → "overdue" (accès refusé)
 * - Payé sans échéance (activation man. legacy) → "granted"
 */
export function evaluateSubscriptionAccess(
  sub: SubscriptionAccessInput | null | undefined,
  now: Date = new Date(),
  graceDays: number = SUBSCRIPTION_GRACE_PERIOD_DAYS,
): SubscriptionAccessState {
  if (!sub) return "payment_required";

  if (sub.status === "bloque") return "blocked";

  if (sub.is_paid !== true) return "payment_required";

  const due = parseDateSafe(sub.next_due_date ?? null);
  if (!due) return "granted"; // paiement manuel sans échéance connue

  // Accès valide jusqu'à la fin du jour de grâce après l'échéance.
  const limit = endOfDay(new Date(due.getTime() + graceDays * DAY_MS));
  return now.getTime() <= limit.getTime() ? "granted" : "overdue";
}

/**
 * Calcule les menus à bloquer pour une entreprise en fonction des menus
 * autorisés par son offre. `null`/tableau vide = tous les menus autorisés
 * (offre sans restriction). Les menus inconnus sont ignorés.
 */
export function computeBlockedMenus(
  allowedMenus: string[] | null | undefined,
): string[] {
  if (!allowedMenus || allowedMenus.length === 0) return [];
  const allowed = new Set(allowedMenus);
  return ALL_APP_MENUS.filter((menu) => !allowed.has(menu));
}
