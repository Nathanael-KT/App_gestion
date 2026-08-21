import { evaluateSubscriptionAccess } from "~/utils/subscriptionAccess";

interface AccessUserData {
  roles?: string[] | null;
  company_id?: string | null;
}

interface AccessCompanySettings {
  blocked?: boolean | null;
  blocked_reason?: string | null;
  blocked_menus?: string[] | null;
}

interface SubscriptionStatus {
  status?: string | null;
  is_paid?: boolean | null;
  next_due_date?: string | null;
}

const MENU_TO_PATH: Record<string, string> = {
  Accueil: "/",
  Stock: "/stock",
  Clients: "/client",
  Commandes: "/commande",
  Facture: "/facture",
  Caisse: "/caisse",
  Utilisateurs: "/utilisateurs",
  Rapports: "/rapports",
  Discussion: "/discussion",
  Paramètres: "/parametres",
  Aide: "/aide",
};

const PUBLIC_ROUTES = ["/login", "/error", "/vente", "/auth/"];
// Routes toujours accessibles même si entreprise bloquée ou abonnement en
// retard : c'est précisément là que l'utilisateur régularise son paiement.
const ALWAYS_ALLOWED_ROUTES = [
  "/parametres/abonnement",
  "/parametres/general",
  "/profile",
  "/error",
];

export default defineNuxtRouteMiddleware(async (to) => {
  if (PUBLIC_ROUTES.some((route) => to.path.startsWith(route))) {
    return;
  }

  const supabase = useSupabaseClient();
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return;
  }

  // Resolve user profile by auth_user_id, then fallback by email for legacy rows.
  let profile: AccessUserData | null = null;
  const { data: profileByAuth } = await supabase
    .from("users")
    .select("roles, company_id")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (profileByAuth) {
    profile = profileByAuth as AccessUserData;
  } else if (authUser.email) {
    const { data: profileByEmail } = await supabase
      .from("users")
      .select("roles, company_id")
      .eq("email", authUser.email)
      .maybeSingle();

    if (profileByEmail) {
      profile = profileByEmail as AccessUserData;
    }
  }

  const roles = Array.isArray(profile?.roles) ? profile?.roles : [];
  if (roles.includes("super_admin")) {
    return; // Super admin bypass tout
  }

  const companyId = profile?.company_id;
  if (!companyId) {
    return;
  }

  // Si on est sur une route toujours autorisée, ne pas bloquer
  if (ALWAYS_ALLOWED_ROUTES.some((r) => to.path.startsWith(r))) {
    return;
  }

  const { data: settings, error: settingsError } = await supabase
    .from("company_settings")
    .select("blocked, blocked_reason, blocked_menus")
    .eq("id", companyId)
    .maybeSingle();

  // Security-first: if we cannot verify company status, deny access.
  if (settingsError || !settings) {
    return navigateTo({
      path: "/error",
      query: {
        reason: "company_access_check_failed",
        message:
          "Impossible de verifier le statut de votre entreprise. Acces temporairement refuse.",
      },
    });
  }

  const typedSettings = settings as AccessCompanySettings;

  // Blocage global de l'entreprise.
  if (typedSettings.blocked === true) {
    // Blocage automatique pour non-paiement : on redirige vers la page
    // d'abonnement pour permettre la régularisation immédiate.
    if (typedSettings.blocked_reason === "subscription") {
      return navigateTo({
        path: "/parametres/abonnement",
        query: { reason: "subscription_blocked" },
      });
    }
    // Blocage manuel par le super_admin (raison "manual" ou héritée) :
    // page d'erreur, aucune régularisation en libre-service.
    return navigateTo({
      path: "/error",
      query: {
        reason: "company_blocked",
        message:
          "Votre entreprise est actuellement bloquee par le support. Aucun acces n'est autorise. Contactez le support ou reglez votre abonnement dans Parametres > Abonnement.",
      },
    });
  }

  // Vérification automatique de l'abonnement (issue #89) :
  // - Aucune ligne d'abonnement = entreprise legacy pré-Stripe : on laisse
  //   passer (elle entrera dans le circuit à son premier paiement ou via une
  //   action du super_admin). Les nouvelles entreprises ont toujours une
  //   ligne "inactif" créée par trigger, donc sont bien restreintes.
  // - Non payé / échéance dépassée (+1 jour de grâce) : accès limité à la
  //   page Abonnement jusqu'à régularisation.
  try {
    const { data: subscription } = await supabase
      .from("company_subscription")
      .select("status, is_paid, next_due_date")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sub = subscription as SubscriptionStatus | null;
    if (sub) {
      const access = evaluateSubscriptionAccess(sub);

      if (access === "blocked") {
        return navigateTo({
          path: "/parametres/abonnement",
          query: { reason: "subscription_blocked" },
        });
      }
      if (access === "payment_required") {
        return navigateTo({
          path: "/parametres/abonnement",
          query: { reason: "subscription_required" },
        });
      }
      if (access === "overdue") {
        return navigateTo({
          path: "/parametres/abonnement",
          query: { reason: "subscription_overdue" },
        });
      }
      // "granted" : on continue vers le contrôle des menus.
    }
  } catch {
    // Si erreur lecture abonnement, on ne bloque pas - sécurité mais pas bloquant
  }

  const blockedMenus = Array.isArray(typedSettings.blocked_menus)
    ? typedSettings.blocked_menus
    : [];

  for (const menuName of blockedMenus) {
    const rootPath = MENU_TO_PATH[menuName];
    if (!rootPath) continue;

    if (
      (rootPath === "/" && to.path === "/") ||
      (rootPath !== "/" &&
        (to.path === rootPath || to.path.startsWith(`${rootPath}/`)))
    ) {
      return navigateTo({
        path: "/error",
        query: {
          reason: "menu_blocked",
          menu: menuName,
          message: `L'acces a la section "${menuName}" n'est pas inclus dans votre offre d'abonnement ou a ete desactive pour votre entreprise.`,
        },
      });
    }
  }
});
