export default defineNuxtRouteMiddleware((to) => {
  console.log("[middleware test] running on path:", to.path);

  if (to.path === "/aide/documentation") {
    return navigateTo("/"); // Redirige vers la page d'accueil
  }
});
