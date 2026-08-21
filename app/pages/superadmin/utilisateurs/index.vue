<template>
  <div class="w-full max-w-7xl mx-auto px-3 md:px-4 py-6 md:py-8">
    <div class="flex flex-col lg:flex-row justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <UIcon name="heroicons:shield-check-20-solid" class="w-8 h-8 text-amber-500" />
          Utilisateurs Super Admin
        </h1>
        <p class="text-gray-500 mt-1 text-sm md:text-base">
          Gérez les comptes plateforme et, si besoin, l'ensemble des utilisateurs des compagnies.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          icon="i-heroicons-arrow-path"
          variant="outline"
          :loading="isLoading"
          @click="loadUsers"
        >
          Actualiser
        </UButton>
        <UButton
          icon="heroicons:user-plus-20-solid"
          color="primary"
          size="lg"
          class="shadow"
          to="/superadmin/utilisateurs/add"
        >
          Nouveau super admin
        </UButton>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div class="bg-white rounded-xl border p-5 shadow-sm">
        <p class="text-xs uppercase tracking-wide text-gray-500 font-semibold">Super admins</p>
        <p class="text-2xl font-bold text-gray-900 mt-1">{{ superAdminCount }}</p>
        <p class="text-xs text-gray-400 mt-1">Comptes plateforme</p>
      </div>
      <div class="bg-white rounded-xl border p-5 shadow-sm">
        <p class="text-xs uppercase tracking-wide text-gray-500 font-semibold">Affichés</p>
        <p class="text-2xl font-bold text-gray-900 mt-1">{{ filteredUsers.length }}</p>
        <p class="text-xs text-gray-400 mt-1">Après filtres</p>
      </div>
      <div class="bg-white rounded-xl border p-5 shadow-sm">
        <p class="text-xs uppercase tracking-wide text-gray-500 font-semibold">Portée</p>
        <p class="text-lg font-bold text-gray-900 mt-1">{{ scopeLabel }}</p>
        <p class="text-xs text-gray-400 mt-1">Liste courante</p>
      </div>
    </div>

    <div class="bg-white rounded-xl border shadow-sm p-4 md:p-5 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <UInput
          v-model="searchQuery"
          placeholder="Rechercher nom, email, téléphone..."
          icon="i-heroicons-magnifying-glass"
        />
        <select
          v-model="scope"
          class="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          @change="loadUsers"
        >
          <option value="platform">Super admins plateforme</option>
          <option value="all">Tous les utilisateurs</option>
        </select>
        <select
          v-model="selectedRole"
          class="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Tous les rôles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Administrateur</option>
          <option value="magasinier">Magasinier</option>
          <option value="employe">Employé</option>
        </select>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border">
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">
          Utilisateurs ({{ filteredUsers.length }})
        </h2>
      </div>

      <div v-if="isLoading" class="p-8 text-center">
        <UIcon
          name="heroicons:arrow-path-20-solid"
          class="h-8 w-8 mx-auto animate-spin text-gray-400"
        />
        <p class="mt-2 text-gray-500">Chargement des utilisateurs...</p>
      </div>

      <div v-else-if="filteredUsers.length === 0" class="p-8 text-center">
        <UIcon name="heroicons:users-20-solid" class="h-12 w-12 mx-auto text-gray-300" />
        <h3 class="mt-2 text-sm font-semibold text-gray-900">Aucun utilisateur</h3>
        <p class="mt-1 text-sm text-gray-500">
          {{
            searchQuery || selectedRole
              ? "Aucun utilisateur ne correspond à votre recherche."
              : "Commencez par créer un super administrateur."
          }}
        </p>
        <div class="mt-6">
          <UButton
            v-if="!searchQuery && !selectedRole"
            icon="heroicons:user-plus-20-solid"
            to="/superadmin/utilisateurs/add"
          >
            Nouveau super admin
          </UButton>
        </div>
      </div>

      <div v-else class="divide-y divide-gray-200">
        <div
          v-for="user in filteredUsers"
          :key="user.id"
          class="p-6 hover:bg-gray-50 transition-colors"
        >
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div class="flex items-center space-x-4">
              <div class="relative">
                <div
                  class="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                >
                  {{ getInitials(user.name || user.email) }}
                </div>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">
                  {{ user.name || "Nom non défini" }}
                </h3>
                <p class="text-sm text-gray-600">{{ user.email }}</p>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                  <span class="inline-flex items-center gap-1">
                    <UIcon name="heroicons:phone-20-solid" class="h-4 w-4 text-gray-400" />
                    {{ user.phone || "Non renseigné" }}
                  </span>
                  <span v-if="user.company_name">{{ user.company_name }}</span>
                  <span v-else-if="!user.company_id">Plateforme</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-4">
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
                  @click="openResetModal(user)"
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

    <UModal v-model:open="showDeleteModal" title="Supprimer l'utilisateur">
      <template #body>
        <div class="space-y-4">
          <p>
            Êtes-vous sûr de vouloir supprimer
            <strong>{{ userToDelete?.name || userToDelete?.email }}</strong> ?
          </p>
          <div class="bg-red-50 p-4 rounded-lg border border-red-200 text-sm text-red-800">
            Cette action est irréversible. Le compte d'authentification sera aussi supprimé.
          </div>
        </div>
      </template>
      <template #footer="{ close }: { close: () => void }">
        <div class="flex gap-3">
          <UButton variant="outline" @click="close">Annuler</UButton>
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

    <UModal v-model:open="showResetModal" title="Réinitialiser le mot de passe">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-600">
            Définissez un mot de passe temporaire pour
            <strong>{{ userToReset?.name || userToReset?.email }}</strong>.
          </p>
          <UInput
            v-model="newPassword"
            type="password"
            placeholder="Minimum 8 caractères"
            icon="heroicons:key-20-solid"
          />
        </div>
      </template>
      <template #footer="{ close }: { close: () => void }">
        <div class="flex gap-3">
          <UButton variant="outline" @click="close">Annuler</UButton>
          <UButton
            color="primary"
            icon="heroicons:check-20-solid"
            :loading="isResetting"
            :disabled="newPassword.length < 8"
            @click="resetPassword"
          >
            Enregistrer
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { ManagedUser, UsersScope } from "../../../composables/useAdminUsers";

definePageMeta({
  middleware: ["auth", "superadmin"],
});

const toast = useToast();
const { listUsers, deleteUser: deleteUserApi, resetPassword: resetPasswordApi } =
  useAdminUsers();
const { getRoleLabel, getRoleIcon, getRoleColor } = useRoles();

const isLoading = ref(false);
const users = ref<ManagedUser[]>([]);
const searchQuery = ref("");
const selectedRole = ref("");
const scope = ref<UsersScope>("platform");
const showDeleteModal = ref(false);
const showResetModal = ref(false);
const userToDelete = ref<ManagedUser | null>(null);
const userToReset = ref<ManagedUser | null>(null);
const isDeletingUser = ref(false);
const isResetting = ref(false);
const newPassword = ref("");

const scopeLabel = computed(() =>
  scope.value === "all" ? "Tous les comptes" : "Plateforme",
);

const superAdminCount = computed(
  () => users.value.filter((user) => user.roles.includes("super_admin")).length,
);

const filteredUsers = computed(() => {
  let filtered = users.value;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query) ||
        user.company_name?.toLowerCase().includes(query),
    );
  }

  if (selectedRole.value) {
    filtered = filtered.filter((user) => user.roles.includes(selectedRole.value));
  }

  return filtered;
});

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const loadUsers = async () => {
  try {
    isLoading.value = true;
    users.value = await listUsers(scope.value);
  } catch (error) {
    toast.add({
      title: "Erreur",
      description:
        error instanceof Error
          ? error.message
          : "Impossible de charger les utilisateurs",
      icon: "heroicons:x-circle-20-solid",
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
};

const editUser = (userId: string) => {
  navigateTo(`/superadmin/utilisateurs/edit/${userId}`);
};

const confirmDeleteUser = (user: ManagedUser) => {
  userToDelete.value = user;
  showDeleteModal.value = true;
};

const deleteUser = async () => {
  if (!userToDelete.value) return;

  try {
    isDeletingUser.value = true;
    await deleteUserApi(userToDelete.value.id);
    users.value = users.value.filter((user) => user.id !== userToDelete.value?.id);
    toast.add({
      title: "Succès",
      description: "L'utilisateur a été supprimé",
      icon: "heroicons:check-circle-20-solid",
      color: "success",
    });
    showDeleteModal.value = false;
    userToDelete.value = null;
  } catch (error) {
    toast.add({
      title: "Erreur",
      description:
        error instanceof Error ? error.message : "Impossible de supprimer l'utilisateur",
      icon: "heroicons:x-circle-20-solid",
      color: "error",
    });
  } finally {
    isDeletingUser.value = false;
  }
};

const openResetModal = (user: ManagedUser) => {
  userToReset.value = user;
  newPassword.value = "";
  showResetModal.value = true;
};

const resetPassword = async () => {
  if (!userToReset.value || newPassword.value.length < 8) return;

  try {
    isResetting.value = true;
    await resetPasswordApi(userToReset.value.id, newPassword.value);
    toast.add({
      title: "Succès",
      description: "Le mot de passe a été réinitialisé",
      icon: "heroicons:check-circle-20-solid",
      color: "success",
    });
    showResetModal.value = false;
    userToReset.value = null;
    newPassword.value = "";
  } catch (error) {
    toast.add({
      title: "Erreur",
      description:
        error instanceof Error
          ? error.message
          : "Impossible de réinitialiser le mot de passe",
      icon: "heroicons:x-circle-20-solid",
      color: "error",
    });
  } finally {
    isResetting.value = false;
  }
};

onMounted(() => {
  loadUsers();
});

useHead({
  title: "Utilisateurs Super Admin - App Gestion",
  meta: [
    {
      name: "description",
      content: "Gestion des super administrateurs et des comptes utilisateurs",
    },
  ],
});
</script>
