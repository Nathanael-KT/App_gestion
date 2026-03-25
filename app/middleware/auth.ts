import type { LocationQueryRaw } from "vue-router";

/**
 * Middleware d'authentification global
 * Protège toutes les routes sauf login
 */
export default defineNuxtRouteMiddleware(
  (to: { path: string; query: LocationQueryRaw }) => {
    const user = useSupabaseUser();

  // Pages publiques qui n'ont pas besoin d'authentification
    const publicPages = ["/login", "/vente"];
    const isPublicAuthRoute = to.path.startsWith("/auth/");
    const hasRecoveryCode =
      typeof to.query.code === "string" || to.query.type === "recovery";

  // Les liens de reset peuvent arriver sur /?code=... ; on les reroute vers la page dédiée.
    if (hasRecoveryCode && to.path !== "/auth/reset-password") {
      return navigateTo({
        path: "/auth/reset-password",
        query: to.query,
      });
    }

  // Si l'utilisateur n'est pas connecté et tente d'accéder à une page protégée
    if (!user.value && !publicPages.includes(to.path) && !isPublicAuthRoute) {
      return navigateTo("/login");
    }

  // Si l'utilisateur est connecté et tente d'accéder à la page de login
    if (user.value && to.path === "/login") {
      return navigateTo("/");
    }
  }
);
