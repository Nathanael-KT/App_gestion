// Composable pour gérer la synchronisation des utilisateurs avec Supabase
// /composables/useUserSync.ts

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

      console.log("Utilisateur synchronisé avec succès:", userId);
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

      console.log(`${data} utilisateurs synchronisés`);
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
        console.log(
          "Utilisateur non trouvé dans public.users, synchronisation..."
        );
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

  return {
    syncUserProfile,
    syncAllAuthUsers,
    handleUserSignUp,
    ensureUserProfile,
  };
};
