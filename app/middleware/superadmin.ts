/**
 * Protège les routes /superadmin/* : super_admin uniquement.
 */
export default defineNuxtRouteMiddleware(async () => {
  const { loadCurrentUser, userRoles, isLoadingUser, isAuthenticated } =
    useCurrentUser();

  if (!isAuthenticated.value) {
    return navigateTo("/login");
  }

  if (isLoadingUser.value) {
    await loadCurrentUser();
  }

  if (!userRoles.value.includes("super_admin")) {
    throw createError({
      statusCode: 403,
      statusMessage:
        "Accès réservé aux super administrateurs. Vos rôles: " +
        (userRoles.value.join(", ") || "Aucun"),
    });
  }
});
