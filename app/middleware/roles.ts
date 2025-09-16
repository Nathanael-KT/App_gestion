/**
 * Middleware de protection par rôles
 * Utilise les vraies données de la base de données et empêche la création automatique de comptes
 */

export default defineNuxtRouteMiddleware(async (to) => {
  const { loadCurrentUser, userRoles, isLoadingUser, isAuthenticated, error } =
    useCurrentUser();

  // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
  if (!isAuthenticated.value) {
    return navigateTo("/login");
  }

  // Attendre le chargement des données utilisateur
  if (isLoadingUser.value) {
    await loadCurrentUser();
  }

  // Si erreur de chargement ou aucun rôle (utilisateur pas en base), bloquer l'accès
  if (error.value || userRoles.value.length === 0) {
    console.error("Accès refusé - utilisateur sans profil valide:", {
      error: error.value,
      roles: userRoles.value,
    });

    throw createError({
      statusCode: 403,
      statusMessage:
        error.value ||
        "Profil utilisateur non trouvé. Contactez un administrateur pour obtenir l'accès à l'application.",
    });
  }

  const { hasAnyRole } = useRoles();

  // Configuration des permissions par route avec les vraies données
  const routePermissions: Record<string, string[]> = {
    "/utilisateurs": ["admin"],
    "/utilisateurs/add": ["admin"],
    "/utilisateurs/edit": ["admin"],
    "/parametres": ["admin"],
    "/rapports/avances": ["admin"],
    "/caisse/bilan": ["admin"], // Nouvelle route pour le bilan de caisse admin
    "/stock/add": ["admin", "magasinier"],
    "/stock/edit": ["admin", "magasinier"],
    "/stock/categories": ["admin", "magasinier"],
    "/product-types": ["admin", "magasinier"],
    "/commande/add": ["admin", "magasinier"],
  };

  const routePath = to.path;

  // Vérifier si la route nécessite des permissions spéciales
  for (const [route, requiredRoles] of Object.entries(routePermissions)) {
    if (routePath.startsWith(route)) {
      const currentRoles = [...userRoles.value];

      if (!hasAnyRole(currentRoles, requiredRoles)) {
        // Rediriger vers une page d'erreur ou d'accueil selon le cas
        throw createError({
          statusCode: 403,
          statusMessage: `Accès refusé. Rôles requis: ${requiredRoles.join(
            ", "
          )}. Vos rôles: ${currentRoles.join(", ") || "Aucun"}`,
        });
      }
      break;
    }
  }
});
