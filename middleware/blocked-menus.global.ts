import { useSupabaseClient } from "#imports";
import { useCurrentUser } from "~/composables/useCurrentUser";

export default defineNuxtRouteMiddleware(async (to) => {
  // éviter boucle infinie
  if (to.path.startsWith("/error") || to.path.startsWith("/login") || to.path.startsWith("/superadmin")) return;

  // récupérer companyId depuis ton composable
  const current = useCurrentUser();
  const companyId = current?.companyId?.value ?? null;
  
  // Si pas d'utilisateur connecté ou pas de companyId, permettre l'accès (d'autres middlewares s'occuperont de l'auth)
  if (!companyId) return;

  // cache pour éviter des requêtes répétées, avec le companyId pour isoler les caches
  const blockedState = useState<string[]>(`blocked_menus_cache_${companyId}`, () => []);

  // Toujours recharger les menus bloqués pour s'assurer qu'on a les données les plus récentes
  const supabase = useSupabaseClient();
  const { data, error } = await supabase
    .from("company_settings")
    .select("blocked_menus")
    .eq("id", companyId)
    .single() as { data: { blocked_menus: string[] | null } | null; error: unknown };
  
  if (!error && data?.blocked_menus && Array.isArray(data.blocked_menus)) {
    blockedState.value = data.blocked_menus;
  } else {
    blockedState.value = [];
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
    Forum: "/forum", // Ajout du chemin Forum
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
          "Accès bloqué par votre administrateur. Ce module a été désactivé pour votre entreprise.",
        blocked: "1"
      },
    });
  }
});
