interface AccessUserData {
    roles?: string[] | null;
    company_id?: string | null;
}

interface AccessCompanySettings {
    blocked?: boolean | null;
    blocked_menus?: string[] | null;
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
        return;
    }

    const companyId = profile?.company_id;
    if (!companyId) {
        return;
    }

    const { data: settings, error: settingsError } = await supabase
        .from("company_settings")
        .select("blocked, blocked_menus")
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

    if (typedSettings.blocked === true) {
        return navigateTo({
            path: "/error",
            query: {
                reason: "company_blocked",
                message:
                    "Votre entreprise est actuellement bloquee par le support. Aucun acces n'est autorise.",
            },
        });
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
                    message: `L'acces a la section \"${menuName}\" est desactive pour votre entreprise.`,
                },
            });
        }
    }
});