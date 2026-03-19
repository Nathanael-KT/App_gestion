// middleware/block-company.global.ts
export default defineNuxtRouteMiddleware((to: { path: string }) => {
  if (to.path.startsWith("/auth/") || to.path === "/login") return;

  // Ne bloque pas l'accès pour le superadmin
  const userRoles = useNuxtApp().$currentUser?.userRoles || [];
  if (userRoles.includes("super_admin")) return;

  // Récupère les settings de la compagnie
  const companySettings = useNuxtApp().$companySettings?.settings;
  if (companySettings?.blocked) {
    return navigateTo({
      path: "/error",
      query: {
        message:
          "Votre entreprise est actuellement bloquée par l'administrateur. Aucun accès n'est autorisé tant que le blocage global est actif. Veuillez contacter votre administrateur.",
      },
    });
  }
});
