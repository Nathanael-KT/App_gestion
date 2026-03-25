import { useCurrentUser } from "~/composables/useCurrentUser";

export default defineNuxtRouteMiddleware(async (to: { path: string }) => {
  // éviter boucle infinie
  if (
    to.path.startsWith("/error") ||
    to.path.startsWith("/login") ||
    to.path.startsWith("/auth/")
  )
    return;

  // récupérer companyId depuis ton composable
  const current = useCurrentUser?.();
  const companyId = current?.companyId?.value ?? null;
  if (!companyId) return;

  // cache pour éviter des requêtes répétées
  const blockedState = useState<string[]>("blocked_menus_cache", () => []);

  if (!blockedState.value.length) {
    const supabase = useSupabaseClient();
    const { data, error } = await supabase
      .from("company_settings")
      .select("blocked_menus")
      .eq("id", companyId)
      .single<{ blocked_menus: string[] | null }>();
    if (!error && data?.blocked_menus) {
      blockedState.value = data.blocked_menus;
    }
  }

  if (!blockedState.value.length) return;

  // Mapping menu -> path racine
  const menuToRootPath: Record<string, string> = {
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

  // Pour chaque menu bloqué, bloque le path racine et tout ce qui commence par ce path
  let isBlocked = false;
  for (const menuName of blockedState.value) {
    const rootPath = menuToRootPath[menuName];
    if (!rootPath) continue;
    if (rootPath === "/") {
      if (to.path === "/") {
        isBlocked = true;
        break;
      }
    } else {
      const regex = new RegExp(`^${rootPath}($|/)`);
      if (regex.test(to.path)) {
        isBlocked = true;
        break;
      }
    }
  }

  if (isBlocked) {
    return navigateTo({
      path: "/error",
      query: {
        message:
          "Vous n'avez pas le droit d'accéder à cette page. Contactez votre administrateur.",
      },
    });
  }
});
