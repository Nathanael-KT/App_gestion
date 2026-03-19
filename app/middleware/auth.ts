/**
 * Middleware d'authentification global
 * Protège toutes les routes sauf login
 */
export default defineNuxtRouteMiddleware((to: { path: string }) => {
  const user = useSupabaseUser();

  // Pages publiques qui n'ont pas besoin d'authentification
  const publicPages = ["/login", "/vente"];
  const isPublicAuthRoute = to.path.startsWith("/auth/");

  // Si l'utilisateur n'est pas connecté et tente d'accéder à une page protégée
  if (!user.value && !publicPages.includes(to.path) && !isPublicAuthRoute) {
    return navigateTo("/login");
  }

  // Si l'utilisateur est connecté et tente d'accéder à la page de login
  if (user.value && to.path === "/login") {
    return navigateTo("/");
  }
});
