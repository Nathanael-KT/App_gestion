<template>
  <div class="space-y-6">
    <!-- En-tête -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">
          Gestion des utilisateurs
        </h1>
        <p class="mt-2 text-sm sm:text-base text-gray-600">
          Gérez les comptes utilisateurs et leurs permissions
        </p>
      </div>
      <div class="mt-4 sm:mt-0">
        <UButton
          icon="heroicons:user-plus-20-solid"
          to="/superadmin/utilisateurs/add"
          size="lg"
          label="Nouvel utilisateur"
        />
      </div>
    </div>
    <!-- Liste des utilisateurs -->
    <div class="bg-white rounded-xl shadow-sm border">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">
          Utilisateurs ({{ filteredUsers.length }})
        </h2>
      </div>

      <!-- Loading state -->
      <div v-if="isLoading" class="p-8 text-center">
        <UIcon
          name="heroicons:arrow-path-20-solid"
          class="h-8 w-8 mx-auto animate-spin text-gray-400"
        />
        <p class="mt-2 text-gray-500">Chargement des utilisateurs...</p>
      </div>

      <!-- Empty state -->
      <div v-else-if="filteredUsers.length === 0" class="p-8 text-center">
        <UIcon
          name="heroicons:users-20-solid"
          class="h-12 w-12 mx-auto text-gray-300"
        />
        <h3 class="mt-2 text-sm font-semibold text-gray-900">
          Aucun utilisateur
        </h3>
        <p class="mt-1 text-sm text-gray-500">
          {{
            searchQuery
              ? "Aucun utilisateur ne correspond à votre recherche."
              : "Commencez par créer un nouvel utilisateur."
          }}
        </p>
        <div class="mt-6">
          <UButton
            v-if="!searchQuery"
            icon="heroicons:user-plus-20-solid"
            to="/utilisateurs/add"
          >
            Nouvel utilisateur
          </UButton>
        </div>
      </div>

      <!-- Liste -->
      <div v-else class="divide-y divide-gray-200">
        <div
          v-for="user in filteredUsers"
          :key="user.id"
          class="p-6 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <!-- Avatar -->
              <div class="relative">
                <div
                  class="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                >
                  {{ getInitials(user.name || user.email) }}
                </div>
                <div
                  class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"
                />
              </div>

              <!-- Informations utilisateur -->
              <div>
                <h3 class="text-lg font-semibold text-gray-900">
                  {{ user.name || "Nom non défini" }}
                </h3>
                <p class="text-sm text-gray-600">{{ user.email }}</p>
                <div class="flex items-center space-x-2 mt-1">
                  <UIcon
                    name="heroicons:phone-20-solid"
                    class="h-4 w-4 text-gray-400"
                  />
                  <span class="text-sm text-gray-500">
                    {{ user.phone || "Non renseigné" }}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex items-center space-x-4">
              <!-- Rôles -->
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="role in user.roles"
                  :key="role"
                  class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                  :class="getRoleColor(role)"
                >
                  <UIcon :name="getRoleIcon(role)" class="h-3 w-3 mr-1" />
                  {{ getRoleLabel(role) }}
                </span>
              </div>

              <!-- Actions -->
              <div class="flex items-center space-x-2">
                <UButton
                  icon="heroicons:pencil-square-20-solid"
                  variant="ghost"
                  size="sm"
                  @click="editUser(user.id)"
                />
                <UButton
                  icon="heroicons:key-20-solid"
                  variant="ghost"
                  size="sm"
                  @click="resetPassword(user.id)"
                />
                <UButton
                  icon="heroicons:trash-20-solid"
                  variant="ghost"
                  size="sm"
                  color="error"
                  @click="confirmDeleteUser(user)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal de confirmation de suppression -->
    <UModal
      v-model:open="showDeleteModal"
      title="Supprimer l'utilisateur"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <div class="space-y-4">
          <div class="flex items-center space-x-3">
            <div class="p-2 bg-red-100 rounded-full">
              <UIcon
                name="heroicons:exclamation-triangle-20-solid"
                class="h-6 w-6 text-red-600"
              />
            </div>
            <p>
              Êtes-vous sûr de vouloir supprimer l'utilisateur
              <strong>{{ userToDelete?.name || userToDelete?.email }}</strong> ?
            </p>
          </div>
          <div class="bg-red-50 p-4 rounded-lg border border-red-200">
            <div class="flex">
              <UIcon
                name="heroicons:exclamation-triangle-20-solid"
                class="h-5 w-5 text-red-400 mr-2"
              />
              <div class="text-sm text-red-800">
                <p class="font-medium">Cette action est irréversible.</p>
                <p>
                  Tous les données associées à cet utilisateur seront
                  définitivement supprimées.
                </p>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer="{ close }: { close: () => void }">
        <div class="flex gap-3">
          <UButton variant="outline" @click="close"> Annuler </UButton>
          <UButton
            color="error"
            icon="heroicons:trash-20-solid"
            :loading="isDeletingUser"
            @click="deleteUser"
          >
            Supprimer définitivement
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const magasinStore = useMagasinStore();
interface User {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  roles: string[];
  auth_user_id: string | null;
  created_at: string;
}

// État du composant
const isLoading = ref(false);
const users = ref<User[]>([]);
const searchQuery = ref("");
const selectedRole = ref("");
const showDeleteModal = ref(false);
const userToDelete = ref<User | null>(null);
const isDeletingUser = ref(false);

// Configuration des rôles
const roleConfig = {
    super_admin: {
        label: "Super Admin",
        icon: "heroicons:shield-check-20-solid",
        color: "bg-purple-100 text-purple-800",
    },
};



// Supabase
const supabase = useSupabaseClient();



// Utilisateurs filtrés
const filteredUsers = computed(() => {
  let filtered = users.value;

  // Filtre par recherche
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query)
    );
  }

  // Filtre par rôle
  if (selectedRole.value) {
    filtered = filtered.filter((user) =>
      user.roles.includes(selectedRole.value)
    );
  }

  return filtered;
});

// Helpers pour les rôles
const getRoleLabel = (role: string) => {
  return roleConfig[role as keyof typeof roleConfig]?.label || role;
};

const getRoleIcon = (role: string) => {
  return (
    roleConfig[role as keyof typeof roleConfig]?.icon ||
    "heroicons:user-20-solid"
  );
};

const getRoleColor = (role: string) => {
  return (
    roleConfig[role as keyof typeof roleConfig]?.color ||
    "bg-gray-100 text-gray-800"
  );
};

// Helper pour les initiales
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

// Charger les utilisateurs
const loadUsers = async () => {
  try {
    isLoading.value = true;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .contains("roles", ["super_admin"])
      .is("company_id", null)
      .is("magasin_id", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    users.value = data || [];
  } catch (error) {
    console.error("Erreur lors du chargement des utilisateurs:", error);
    useToast().add({
      title: "Erreur",
      description: "Impossible de charger les utilisateurs",
      icon: "heroicons:x-circle-20-solid",
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
};


// Actions utilisateur
const editUser = (userId: string) => {
  navigateTo(`/superadmin/utilisateurs/edit/${userId}`);
};

const resetPassword = async (_userId: string) => {
  try {
    // TODO: Implémenter la réinitialisation de mot de passe
    useToast().add({
      title: "Information",
      description: "Fonction de réinitialisation de mot de passe à implémenter",
      icon: "heroicons:information-circle-20-solid",
      color: "info",
    });
  } catch (error) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error);
  }
};

const confirmDeleteUser = (user: User) => {
  userToDelete.value = user;
  showDeleteModal.value = true;
};

const deleteUser = async () => {
  if (!userToDelete.value) return;

  try {
    isDeletingUser.value = true;

    // Supprimer de la table users
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("users")
      .delete()
      .eq("id", userToDelete.value.id);

    if (error) {
      throw error;
    }

    // Retirer l'utilisateur de la liste locale
    users.value = users.value.filter((u) => u.id !== userToDelete.value?.id);

    useToast().add({
      title: "Succès",
      description: "L'utilisateur a été supprimé avec succès",
      icon: "heroicons:check-circle-20-solid",
      color: "success",
    });

    showDeleteModal.value = false;
    userToDelete.value = null;
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    useToast().add({
      title: "Erreur",
      description: "Impossible de supprimer l'utilisateur",
      icon: "heroicons:x-circle-20-solid",
      color: "error",
    });
  } finally {
    isDeletingUser.value = false;
  }
};

// Charger les données au montage
onMounted(() => {
  loadUsers();
});

// Recharger les utilisateurs à chaque changement de magasin
watch(
  () => magasinStore.magasinId,
  () => {
    loadUsers();
  }
);

// Meta
useHead({
  title: "Utilisateurs - App Gestion",
  meta: [
    {
      name: "description",
      content: "Gestion des utilisateurs et de leurs permissions",
    },
  ],
});
</script>
