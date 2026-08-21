export type ManagedUser = {
  id: string;
  auth_user_id: string | null;
  name: string | null;
  email: string;
  phone: string | null;
  roles: string[];
  company_id?: string | null;
  magasin_id?: string | null;
  company_name?: string | null;
  created_at?: string;
};

export type UsersScope = "platform" | "company" | "all";

function getFetchErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const err = error as {
      data?: { statusMessage?: string; message?: string };
      message?: string;
    };
    return err.data?.statusMessage || err.data?.message || err.message || fallback;
  }
  return fallback;
}

/**
 * Service client pour la gestion des utilisateurs
 * (super_admin plateforme + utilisateurs de compagnie).
 */
export const useAdminUsers = () => {
  const supabase = useSupabaseClient();

  const getAccessToken = async (): Promise<string> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Session invalide: veuillez vous reconnecter.");
    }

    return session.access_token;
  };

  const authHeaders = async () => ({
    Authorization: `Bearer ${await getAccessToken()}`,
  });

  const listUsers = async (
    scope: UsersScope = "platform",
    companyId?: string,
  ): Promise<ManagedUser[]> => {
    try {
      const response = await $fetch<{ users: ManagedUser[] }>(
        "/api/superadmin/users",
        {
          method: "GET",
          headers: await authHeaders(),
          query: { scope, companyId },
        },
      );
      return Array.isArray(response?.users) ? response.users : [];
    } catch (error) {
      throw new Error(
        getFetchErrorMessage(error, "Impossible de charger les utilisateurs"),
      );
    }
  };

  const createSuperAdmin = async (payload: {
    name: string;
    email: string;
    password: string;
    phone?: string | null;
  }) => {
    try {
      return await $fetch("/api/superadmin/create-super-admin", {
        method: "POST",
        headers: await authHeaders(),
        body: payload,
      });
    } catch (error) {
      throw new Error(
        getFetchErrorMessage(error, "Impossible de créer le super administrateur"),
      );
    }
  };

  const createCompanyUser = async (payload: {
    companyId: string;
    email: string;
    password: string;
    name: string;
    phone?: string | null;
    roles: string[];
    magasin_id: string;
  }) => {
    try {
      return await $fetch("/api/superadmin/create-user", {
        method: "POST",
        headers: await authHeaders(),
        body: payload,
      });
    } catch (error) {
      throw new Error(
        getFetchErrorMessage(error, "Impossible de créer l'utilisateur"),
      );
    }
  };

  const updateUser = async (payload: {
    userId: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    roles?: string[];
    magasin_id?: string | null;
  }) => {
    try {
      return await $fetch("/api/superadmin/manage-user", {
        method: "POST",
        headers: await authHeaders(),
        body: { action: "update", ...payload },
      });
    } catch (error) {
      throw new Error(
        getFetchErrorMessage(error, "Impossible de modifier l'utilisateur"),
      );
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      return await $fetch("/api/superadmin/manage-user", {
        method: "POST",
        headers: await authHeaders(),
        body: { action: "delete", userId },
      });
    } catch (error) {
      throw new Error(
        getFetchErrorMessage(error, "Impossible de supprimer l'utilisateur"),
      );
    }
  };

  const resetPassword = async (userId: string, newPassword: string) => {
    try {
      return await $fetch("/api/superadmin/manage-user", {
        method: "POST",
        headers: await authHeaders(),
        body: { action: "resetPassword", userId, newPassword },
      });
    } catch (error) {
      throw new Error(
        getFetchErrorMessage(error, "Impossible de réinitialiser le mot de passe"),
      );
    }
  };

  return {
    listUsers,
    createSuperAdmin,
    createCompanyUser,
    updateUser,
    deleteUser,
    resetPassword,
  };
};
