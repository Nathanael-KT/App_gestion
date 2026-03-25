/**
 * Composable pour gérer la sécurité multi-tenant
 * Assure l'isolation des données entre entreprises
 */
export const useMultiTenantSecurity = () => {
  const supabase = useSupabaseClient();
  const { currentUser } = useCurrentUser();

  /**
   * Vérifie si l'utilisateur a accès à une ressource d'une entreprise spécifique
   */
  const hasCompanyAccess = (companyId: string): boolean => {
    if (!currentUser.value?.company_id) {
      console.warn("🚨 Utilisateur sans company_id");
      return false;
    }

    const userCompanyId = currentUser.value.company_id;
    const hasAccess = userCompanyId === companyId;

    if (!hasAccess) {
      console.warn("🚨 Tentative d'accès non autorisé:", {
        userCompanyId,
        requestedCompanyId: companyId,
        userEmail: currentUser.value.email,
      });
    }

    return hasAccess;
  };

  /**
   * Filtre automatiquement les requêtes pour la company de l'utilisateur
   */
  const getSecureQuery = (tableName: string) => {
    if (!currentUser.value?.company_id) {
      throw new Error("Utilisateur non autorisé - company_id manquant");
    }

    return supabase
      .from(tableName as any)
      .select("*")
      .eq("company_id", currentUser.value.company_id);
  };

  /**
   * Vérifie les permissions de rôle
   */
  const hasRole = (requiredRoles: string[]): boolean => {
    const roles = currentUser.value?.roles;
    if (!roles) return false;

    return requiredRoles.some((role) => roles.includes(role));
  };

  /**
   * Vérifie si l'utilisateur est admin ou superadmin
   */
  const isAdmin = (): boolean => {
    return hasRole(["admin", "superadmin"]);
  };

  /**
   * Log des tentatives d'accès pour audit
   */
  const logSecurityEvent = (
    action: string,
    details: Record<string, unknown>,
  ) => {
    console.log("🔒 Événement sécurité:", {
      timestamp: new Date().toISOString(),
      user: currentUser.value?.email,
      company_id: currentUser.value?.company_id,
      action,
      details,
    });
  };

  /**
   * Valide qu'un magasin appartient à l'entreprise de l'utilisateur
   */
  const validateMagasinAccess = async (magasinId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("magasins")
        .select("company_id")
        .eq("id", magasinId)
        .single<{ company_id: string }>();

      if (error || !data) {
        logSecurityEvent("magasin_access_denied", { magasinId, error });
        return false;
      }

      return hasCompanyAccess(data.company_id);
    } catch (error) {
      logSecurityEvent("magasin_validation_error", { magasinId, error });
      return false;
    }
  };

  return {
    hasCompanyAccess,
    getSecureQuery,
    hasRole,
    isAdmin,
    logSecurityEvent,
    validateMagasinAccess,
    userCompanyId: computed(() => currentUser.value?.company_id),
  };
};
