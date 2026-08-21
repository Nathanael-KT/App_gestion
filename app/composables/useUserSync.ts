// Composable pour gérer la synchronisation des utilisateurs avec Supabase
// /app/composables/useUserSync.ts

export const useUserSync = () => {
  const supabase = useSupabaseClient();

  /**
   * Synchronise un utilisateur après inscription/connexion
   * @param userId - ID de l'utilisateur auth
   */
  const syncUserProfile = async (userId: string) => {
    try {
      // Appeler la fonction PostgreSQL pour synchroniser l'utilisateur
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.rpc("sync_user_profile", { user_id: userId } as any);

      if (error) {
        console.error("Erreur lors de la synchronisation utilisateur:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Erreur lors de la synchronisation:", error);
      throw error;
    }
  };

  /**
   * Synchronise tous les utilisateurs auth existants (fonction admin)
   */
  const syncAllAuthUsers = async () => {
    try {
      const { data, error } = await supabase.rpc("sync_all_auth_users");

      if (error) {
        console.error(
          "Erreur lors de la synchronisation de tous les utilisateurs:",
          error
        );
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Erreur lors de la synchronisation globale:", error);
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
      // Vérifier si l'utilisateur existe dans public.users
      const { error } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", userId)
        .single();

      if (error && error.code === "PGRST116") {
        // L'utilisateur n'existe pas dans public.users, le synchroniser
        await syncUserProfile(userId);
      } else if (error) {
        console.error(
          "Erreur lors de la vérification du profil utilisateur:",
          error
        );
      }
    } catch (error) {
      console.error(
        "Erreur lors de la vérification/création du profil:",
        error
      );
    }
  };

  /**
   * Lie un utilisateur existant dans public.users à un compte authentifié
   * par email (utile pour les comptes créés avant l'ajout de auth_user_id).
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
   * Récupère les utilisateurs de public.users sans auth_user_id (orphelins).
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
      console.error("Erreur lors de la récupération des orphelins:", error);
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
