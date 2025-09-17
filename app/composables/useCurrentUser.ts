/**
 * Composable pour gérer l'utilisateur actuel et ses rôles
 */

interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  roles: string[];
  auth_user_id: string | null;
  created_at: string;
  magasin_id?: string | null;
  company_id?: string | null;
}

export const useCurrentUser = () => {
  const supabase = useSupabaseClient();
  const authUser = useSupabaseUser();

  // État réactif
  const currentUser = ref<CurrentUser | null>(null);
  const userRoles = ref<string[]>([]);
  const isLoadingUser = ref(true);
  const error = ref<string | null>(null);

  /**
   * Charger les données de l'utilisateur actuel
   */
  const loadCurrentUser = async () => {
    if (!authUser.value) {
      currentUser.value = null;
      userRoles.value = [];
      isLoadingUser.value = false;
      error.value = null;
      return;
    }

    try {
      isLoadingUser.value = true;
      error.value = null;

      // Essayer de trouver l'utilisateur d'abord par auth_user_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: userData, error: userError } = await (supabase as any)
        .from("users")
        .select("*")
        .eq("auth_user_id", authUser.value.id)
        .single();

      let finalData = userData;
      let finalError = userError;

      // Si pas trouvé par auth_user_id, essayer par email
      if (userError && userError.code === "PGRST116" && authUser.value.email) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: emailData, error: emailError } = await (supabase as any)
          .from("users")
          .select("*")
          .eq("email", authUser.value.email)
          .single();

        if (!emailError && emailData) {
          // Utilisateur trouvé par email, mettre à jour auth_user_id

          const { data: updatedData, error: updateError } = await (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabase as any
          )
            .from("users")
            .update({ auth_user_id: authUser.value.id })
            .eq("id", emailData.id)
            .select()
            .single();

          if (!updateError && updatedData) {
            finalData = updatedData;
            finalError = null;
          }
        }
      }

      if (finalError) {
        console.error(
          "Erreur lors du chargement de l'utilisateur:",
          finalError
        );
        // Si l'utilisateur n'existe pas du tout, lui donner un accès minimal
        if (finalError.code === "PGRST116") {
          console.warn(
            "Utilisateur authentifié mais pas trouvé en base de données"
          );
          error.value =
            "Profil utilisateur non trouvé. Contactez un administrateur.";
          userRoles.value = []; // Pas de rôles = pas d'accès
        } else {
          throw finalError;
        }
      } else if (finalData) {
        currentUser.value = finalData as CurrentUser;
        userRoles.value = (finalData as CurrentUser).roles || [];
      }
    } catch (err) {
      console.error("Erreur lors du chargement de l'utilisateur:", err);
      error.value = "Erreur lors du chargement du profil utilisateur";
      userRoles.value = []; // Pas de rôles en cas d'erreur
    } finally {
      isLoadingUser.value = false;
    }
  };

  /**
   * Actualiser les données utilisateur
   */
  const refreshUser = () => {
    loadCurrentUser();
  };

  /**
   * Vérifier si l'utilisateur a un rôle spécifique
   */
  const hasRole = (role: string): boolean => {
    return userRoles.value.includes(role);
  };

  /**
   * Vérifier si l'utilisateur a au moins l'un des rôles
   */
  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some((role) => userRoles.value.includes(role));
  };

  /**
   * Vérifier si l'utilisateur a tous les rôles
   */
  const hasAllRoles = (roles: string[]): boolean => {
    return roles.every((role) => userRoles.value.includes(role));
  };

  /**
   * Vérifier si l'utilisateur est admin
   */
  const isAdmin = computed(() => hasRole("admin"));

  /**
   * Vérifier si l'utilisateur est magasinier
   */
  const isMagasinier = computed(() => hasRole("magasinier"));

  /**
   * Vérifier si l'utilisateur est employé
   */
  const isEmploye = computed(() => hasRole("employe"));

  /**
   * Obtenir le rôle principal (le plus élevé dans la hiérarchie)
   */
  const primaryRole = computed(() => {
    if (hasRole("admin")) return "admin";
    if (hasRole("magasinier")) return "magasinier";
    if (hasRole("employe")) return "employe";
    return null;
  });

  // Surveiller les changements d'authentification
  watch(
    authUser,
    (newUser) => {
      if (newUser) {
        loadCurrentUser();
      } else {
        currentUser.value = null;
        userRoles.value = [];
        isLoadingUser.value = false;
        error.value = null;
      }
    },
    { immediate: true }
  );

  return {
    // État
    currentUser: readonly(currentUser),
    userRoles: readonly(userRoles),
    isLoadingUser: readonly(isLoadingUser),
    error: readonly(error),

    // Actions
    loadCurrentUser,
    refreshUser,

    // Vérifications de rôles
    hasRole,
    hasAnyRole,
    hasAllRoles,

    // Rôles spécifiques
    isAdmin,
    isMagasinier,
    isEmploye,
    primaryRole,

    // Métadonnées
    isAuthenticated: computed(() => !!authUser.value),
    userName: computed(() => currentUser.value?.name || "Utilisateur"),
    userEmail: computed(
      () => currentUser.value?.email || authUser.value?.email || ""
    ),
    userPhone: computed(() => currentUser.value?.phone || null),
    companyId: computed(() => currentUser.value?.company_id || null),
    magasinId: computed(() => currentUser.value?.magasin_id || null),
  };
};
