import { useCurrentUser } from "~/composables/useCurrentUser";

export default defineNuxtRouteMiddleware((to) => {
  const { user } = useCurrentUser();

  // Exclure certaines routes de cette vérification
  const excludedRoutes = ["/login", "/error", "/profile"];
  if (excludedRoutes.includes(to.path)) {
    return;
  }

  // Vérifier si l'utilisateur est connecté et a un company_id
  if (user.value && !user.value.company_id) {
    console.warn("⚠️ Utilisateur sans company_id détecté:", user.value.email);

    // Rediriger vers une page de configuration d'entreprise ou bloquer l'accès
    return navigateTo("/profile?error=no_company");
  }
});
