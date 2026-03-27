// middleware/block-company.global.ts
export default defineNuxtRouteMiddleware(async (to, from) => {
  // Ne pas bloquer les routes publiques ou d'authentification
  if (to.path.startsWith("/auth/") || to.path === "/login" || to.path === "/error") {
    return;
  }

  try {
    const nuxtApp = useNuxtApp();
    const supabase = useSupabaseClient() as any;
    const router = useRouter();

    // Récupérer l'utilisateur courant
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    // Ne pas bloquer les super_admin
    const { data: userData } = await supabase
      .from("users")
      .select("roles, company_id")
      .eq("auth_user_id", user.id)
      .single();

    if (userData?.roles?.includes("super_admin")) {
      return;
    }

    if (!userData?.company_id) {
      return;
    }

    // Vérifier si la compagnie est bloquée
    const { data: companySettings } = await supabase
      .from("company_settings")
      .select("blocked, blocked_menus")
      .eq("id", userData.company_id)
      .single();

    // Si la compagnie est globalement bloquée
    if (companySettings?.blocked) {
      return navigateTo({
        path: "/error",
        query: {
          message:
            "Votre entreprise est actuellement bloquée par l'administrateur. Aucun accès n'est autorisé tant que le blocage global est actif. Veuillez contacter votre administrateur.",
        },
      });
    }

    // Vérifier si le menu spécifique est bloqué
    const blockedMenus = companySettings?.blocked_menus || [];
    if (blockedMenus && Array.isArray(blockedMenus) && blockedMenus.length > 0) {
      const blockedMenuPaths: Record<string, string> = {
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

      for (const menu of blockedMenus) {
        const blockedPath = blockedMenuPaths[menu];
        if (
          blockedPath &&
          (to.path === blockedPath || to.path.startsWith(blockedPath + "/"))
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
    console.error("[block-company middleware] Error:", error);
    // En cas d'erreur, laisser passer l'utilisateur (ne pas bloquer)
  }
});
