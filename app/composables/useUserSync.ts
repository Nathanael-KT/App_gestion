/**
 * Utilitaire pour la synchronisation manuelle des utilisateurs
 * entre auth.users et public.users
 */

export const useUserSync = () => {
  const supabase = useSupabaseClient();

  /**
   * Lier un utilisateur existant dans public.users à un compte authentifié
   * par email (utilisé dans useCurrentUser)
   */
  const linkUserByEmail = async (email: string, authUserId: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("users")
        .update({ auth_user_id: authUserId })
        .eq("email", email);

      if (updateError) throw updateError;

      return { success: true };
    } catch (error) {
      console.error("Erreur lors de la liaison utilisateur:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  };

  /**
   * Vérifier les utilisateurs sans auth_user_id
   */
  const getOrphanUsers = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: orphanUsers, error: orphanError } = await (supabase as any)
        .from("users")
        .select("id, name, email, auth_user_id, roles")
        .is("auth_user_id", null);

      if (orphanError) throw orphanError;

      return {
        success: true,
        orphanUsers: orphanUsers || [],
      };
    } catch (error) {
      console.error("Erreur lors de la validation:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  };

  return {
    linkUserByEmail,
    getOrphanUsers,
  };
};
