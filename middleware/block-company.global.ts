// middleware/block-company.global.ts
/**
 * Middleware de blocage par compagnie et menus
 * Vérifie l'accès utilisateur en fonction des paramètres de compagnie
 */

interface UserData {
  roles?: string[];
  company_id?: string;
}

interface CompanySettingsData {
  blocked?: boolean;
  blocked_menus?: string[];
}

const BLOCKED_MENU_PATHS: Record<string, string> = {
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

const PUBLIC_ROUTES = ["/auth/", "/login", "/error"];

export default defineNuxtRouteMiddleware(async (to) => {
  // Ne pas bloquer les routes publiques
  if (PUBLIC_ROUTES.some((route) => to.path.startsWith(route))) {
    return;
  }

  try {
    const supabase = useSupabaseClient();

    // 1. Récupérer l'utilisateur authentifié
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.debug("[block-company middleware] No authenticated user");
      return;
    }

    // 2. Récupérer les données utilisateur (rôles et company_id)
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("roles, company_id")
      .eq("auth_user_id", user.id)
      .single();

    if (userError) {
      console.warn("[block-company middleware] User data fetch error:", userError.message);
      return;
    }

    const typedUserData = userData as UserData | null;

    // Super admin peut accéder à tout
    if (typedUserData?.roles?.includes("super_admin")) {
      return;
    }

    // Utilisateur sans company_id - aucune restriction
    if (!typedUserData?.company_id) {
      return;
    }

    // 3. Récupérer les paramètres de la compagnie
    const { data: companySettings, error: settingsError } = await supabase
      .from("company_settings")
      .select("blocked, blocked_menus")
      .eq("id", typedUserData.company_id)
      .single();

    if (settingsError) {
      console.warn("[block-company middleware] Company settings fetch error:", settingsError.message);
      return;
    }

    const typedCompanySettings = companySettings as CompanySettingsData | null;

    // 4. Vérifier le blocage global de la compagnie
    if (typedCompanySettings?.blocked === true) {
      return navigateTo({
        path: "/error",
        query: {
          message:
            "Votre entreprise est actuellement bloquée par l'administrateur. Aucun accès n'est autorisé tant que le blocage global est actif. Veuillez contacter votre administrateur.",
        },
      });
    }

    // 5. Vérifier les menus bloqués spécifiques
    const blockedMenus = typedCompanySettings?.blocked_menus;
    if (Array.isArray(blockedMenus) && blockedMenus.length > 0) {
      for (const menu of blockedMenus) {
        const blockedPath = BLOCKED_MENU_PATHS[menu];
        if (
          blockedPath &&
          (to.path === blockedPath || to.path.startsWith(`${blockedPath}/`))
        ) {
          return navigateTo({
            path: "/error",
            query: {
              message: `L'accès à la section "${menu}" est actuellement désactivé pour votre entreprise. Veuillez contacter votre administrateur.`,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error("[block-company middleware] Unexpected error:", error);
    // En cas d'erreur inattendue, laisser passer (fail-open)
    return;
  }
});
