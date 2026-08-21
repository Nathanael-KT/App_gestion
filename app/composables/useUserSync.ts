/**
 * Composable unifié pour la synchronisation des utilisateurs
 * Fusion des deux implémentations précédemment dupliquées
 * (app/composables vs composables racine)
 */

export const useUserSync = () => {
  const supabase = useSupabaseClient();

  /**
   * Synchronise un utilisateur après inscription/connexion
   * via RPC sync_user_profile
   */
  const syncUserProfile = async (userId: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("sync_user_profile", {
        user_id: userId,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Synchronise tous les utilisateurs auth existants (fonction admin)
   */
  const syncAllAuthUsers = async () => {
    try {
      const { data, error } = await (supabase as any).rpc(
        "sync_all_auth_users"
      );
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Crée automatiquement le profil utilisateur après inscription
   */
  const handleUserSignUp = async (event: { user?: { id?: string } }) => {
    const { user } = event;
    if (user?.id) {
      await syncUserProfile(user.id);
    }
  };

  /**
   * Gère la synchronisation lors de la connexion si le profil n'existe pas
   */
  const ensureUserProfile = async (userId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("users")
        .select("id")
        .eq("auth_user_id", userId)
        .single();

      if (error && error.code === "PGRST116") {
        await syncUserProfile(userId);
      }
    } catch {
      // silent - will be handled by caller if needed
    }
  };

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
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  };

  return {
    syncUserProfile,
    syncAllAuthUsers,
    handleUserSignUp,
    ensureUserProfile,
    linkUserByEmail,
    getOrphanUsers,
  };
};
