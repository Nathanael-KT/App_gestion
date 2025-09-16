<template>
  <div class="max-w-4xl mx-auto">
    <!-- En-tête -->
    <div class="mb-8">
      <div class="flex items-center space-x-4 mb-4">
        <UButton
          aria-label="Retour"
          icon="heroicons:arrow-left-20-solid"
          variant="ghost"
          @click="$router.back()"
        />
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">
            Modifier l'utilisateur
          </h1>
          <p class="text-gray-600 mt-1">
            Modifier les informations et permissions de l'utilisateur
          </p>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div
      v-if="isLoadingUser"
      class="bg-white rounded-xl shadow-sm border p-8 text-center"
    >
      <UIcon
        name="heroicons:arrow-path-20-solid"
        class="h-8 w-8 mx-auto animate-spin text-gray-400"
      />
      <p class="mt-2 text-gray-500">
        Chargement des informations utilisateur...
      </p>
    </div>

    <!-- Not found state -->
    <div
      v-else-if="!currentUser"
      class="bg-white rounded-xl shadow-sm border p-8 text-center"
    >
      <UIcon
        name="heroicons:user-x-mark-20-solid"
        class="h-12 w-12 mx-auto text-gray-300"
      />
      <h3 class="mt-2 text-lg font-semibold text-gray-900">
        Utilisateur non trouvé
      </h3>
      <p class="mt-1 text-gray-500">
        L'utilisateur demandé n'existe pas ou a été supprimé.
      </p>
      <div class="mt-6">
        <UButton icon="heroicons:users-20-solid" to="/utilisateurs">
          Retour à la liste
        </UButton>
      </div>
    </div>

    <!-- Formulaire d'édition -->
    <div v-else class="bg-white rounded-xl shadow-sm border p-6 lg:p-8">
      <form class="space-y-8" @submit.prevent="handleSubmit">
        <!-- Informations utilisateur actuelles -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-blue-900 mb-4">
            Informations actuelles
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-blue-600 font-medium">Nom:</p>
              <p class="text-blue-900">
                {{ currentUser.name || "Non défini" }}
              </p>
            </div>
            <div>
              <p class="text-blue-600 font-medium">Email:</p>
              <p class="text-blue-900">{{ currentUser.email }}</p>
            </div>
            <div>
              <p class="text-blue-600 font-medium">Téléphone:</p>
              <p class="text-blue-900">
                {{ currentUser.phone || "Non renseigné" }}
              </p>
            </div>
            <div>
              <p class="text-blue-600 font-medium">Rôles actuels:</p>
              <div class="flex flex-wrap gap-1 mt-1">
                <span
                  v-for="role in currentUser.roles"
                  :key="role"
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-200 text-blue-800"
                >
                  {{ getRoleLabel(role) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Informations personnelles -->
        <div>
          <h2
            class="text-lg font-semibold text-gray-900 mb-4 flex items-center"
          >
            <UIcon
              name="heroicons:user-20-solid"
              class="h-5 w-5 mr-2 text-blue-600"
            />
            Informations personnelles
          </h2>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UFormGroup label="Nom complet *" name="name" :error="errors.name">
              <UInput
                v-model="form.name"
                :error="!!errors.name"
                placeholder="Ex: Jean Dupont"
                size="lg"
                icon="heroicons:user-20-solid"
                :disabled="isLoading"
              />
            </UFormGroup>

            <UFormGroup
              label="Adresse email *"
              name="email"
              :error="errors.email"
            >
              <UInput
                v-model="form.email"
                type="email"
                :error="!!errors.email"
                placeholder="Ex: jean.dupont@entreprise.com"
                size="lg"
                icon="heroicons:envelope-20-solid"
                :disabled="isLoading"
              />
            </UFormGroup>

            <UFormGroup label="Téléphone" name="phone" :error="errors.phone">
              <UInput
                v-model="form.phone"
                type="tel"
                :error="!!errors.phone"
                placeholder="Ex: +33 1 23 45 67 89"
                size="lg"
                icon="heroicons:phone-20-solid"
                :disabled="isLoading"
              />
            </UFormGroup>
          </div>
        </div>

        <!-- Gestion des rôles -->
        <div>
          <h2
            class="text-lg font-semibold text-gray-900 mb-4 flex items-center"
          >
            <UIcon
              name="heroicons:shield-exclamation-20-solid"
              class="h-5 w-5 mr-2 text-purple-600"
            />
            Rôles et permissions
          </h2>

          <div class="space-y-4">
            <p class="text-sm text-gray-600 mb-4">
              Modifiez les rôles pour cet utilisateur. Les changements prendront
              effet immédiatement.
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                v-for="role in availableRoles"
                :key="role.value"
                class="relative"
              >
                <input
                  :id="role.value"
                  v-model="form.roles"
                  :value="role.value"
                  type="checkbox"
                  class="sr-only peer"
                  :disabled="isLoading"
                >
                <label
                  :for="role.value"
                  class="flex flex-col p-4 border-2 border-gray-200 rounded-xl cursor-pointer transition-all hover:border-gray-300 peer-checked:border-blue-500 peer-checked:bg-blue-50"
                >
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center">
                      <UIcon
                        :name="role.icon"
                        class="h-6 w-6 mr-2"
                        :class="role.iconColor"
                      />
                      <span class="font-semibold text-gray-900">{{
                        role.label
                      }}</span>
                    </div>
                    <div
                      class="w-4 h-4 border-2 border-gray-300 rounded peer-checked:border-blue-500 peer-checked:bg-blue-500 relative"
                    >
                      <UIcon
                        name="heroicons:check-20-solid"
                        class="h-3 w-3 text-white absolute top-0.5 left-0.5 opacity-0 peer-checked:opacity-100"
                      />
                    </div>
                  </div>
                  <p class="text-sm text-gray-600 text-left">
                    {{ role.description }}
                  </p>
                  <div class="mt-3">
                    <div class="flex flex-wrap gap-1">
                      <span
                        v-for="permission in role.permissions"
                        :key="permission"
                        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {{ permission }}
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <!-- Rôles sélectionnés -->
            <div
              v-if="form.roles.length > 0"
              class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200"
            >
              <h4 class="font-medium text-blue-900 mb-2">Nouveaux rôles :</h4>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="selectedRole in form.roles"
                  :key="selectedRole"
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                >
                  <UIcon
                    :name="getRoleIcon(selectedRole)"
                    class="h-4 w-4 mr-1"
                  />
                  {{ getRoleLabel(selectedRole) }}
                </span>
              </div>
            </div>

            <div v-if="errors.roles" class="text-red-500 text-sm">
              {{ errors.roles }}
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div
          class="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200"
        >
          <UButton
            type="submit"
            size="lg"
            :loading="isLoading"
            :disabled="!isFormValid || isLoading"
            icon="heroicons:check-20-solid"
            class="flex-1 sm:flex-none"
          >
            {{ isLoading ? "Modification en cours..." : "Mettre à jour" }}
          </UButton>

          <UButton
            variant="ghost"
            size="lg"
            class="flex-1 sm:flex-none"
            icon="heroicons:arrow-path-20-solid"
            :disabled="isLoading"
            @click="resetForm"
          >
            Annuler les modifications
          </UButton>

          <UButton
            variant="outline"
            size="lg"
            class="flex-1 sm:flex-none"
            icon="heroicons:x-mark-20-solid"
            :disabled="isLoading"
            @click="$router.back()"
          >
            Retour
          </UButton>
        </div>
      </form>
    </div>

    <!-- Modal de confirmation -->
    <UModal
      v-model:open="showSuccessModal"
      title="Utilisateur modifié avec succès"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <div class="space-y-4">
          <div class="flex items-center space-x-3">
            <div class="p-2 bg-green-100 rounded-full">
              <UIcon
                name="heroicons:check-circle-20-solid"
                class="h-6 w-6 text-green-600"
              />
            </div>
            <p>
              Les informations de <strong>{{ form.name }}</strong> ont été mises
              à jour avec succès.
            </p>
          </div>
        </div>
      </template>

      <template #footer="{ close }: { close: () => void }">
        <div class="flex gap-3">
          <UButton variant="outline" @click="close">
            Continuer l'édition
          </UButton>
          <UButton icon="heroicons:users-20-solid" @click="goToUsersList">
            Retour à la liste
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
interface User {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  roles: string[];
  auth_user_id: string | null;
  created_at: string;
}

// Configuration des rôles
const availableRoles = [
  {
    value: "admin",
    label: "Administrateur",
    icon: "heroicons:shield-check-20-solid",
    iconColor: "text-red-600",
    description: "Accès complet à toutes les fonctionnalités du système",
    permissions: [
      "Gestion complète",
      "Paramètres système",
      "Utilisateurs",
      "Rapports avancés",
    ],
  },
  {
    value: "magasinier",
    label: "Magasinier",
    icon: "heroicons:cube-20-solid",
    iconColor: "text-blue-600",
    description: "Gestion du stock, réception et expédition des marchandises",
    permissions: ["Stock", "Inventaire", "Commandes", "Livraisons"],
  },
  {
    value: "employe",
    label: "Employé",
    icon: "heroicons:user-20-solid",
    iconColor: "text-green-600",
    description: "Accès de base aux fonctionnalités de consultation et vente",
    permissions: ["Consultation", "Clients", "Factures", "Rapports basiques"],
  },
];

// Paramètres de route
const route = useRoute();
const userId = route.params.id as string;

// État du composant
const isLoading = ref(false);
const isLoadingUser = ref(true);
const showSuccessModal = ref(false);
const currentUser = ref<User | null>(null);

// Formulaire
const form = reactive({
  name: "",
  email: "",
  phone: "",
  roles: [] as string[],
});

// Erreurs
const errors = reactive({
  name: "",
  email: "",
  phone: "",
  roles: "",
});

// Supabase
const supabase = useSupabaseClient();

// Validation du formulaire
const isFormValid = computed(() => {
  return (
    form.name.trim() !== "" && form.email.trim() !== "" && form.roles.length > 0
  );
});

// Helpers pour les rôles
const getRoleLabel = (value: string) => {
  return availableRoles.find((role) => role.value === value)?.label || value;
};

const getRoleIcon = (value: string) => {
  return (
    availableRoles.find((role) => role.value === value)?.icon ||
    "heroicons:user-20-solid"
  );
};

// Charger l'utilisateur
const loadUser = async () => {
  try {
    isLoadingUser.value = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      throw error;
    }

    currentUser.value = data;

    // Pré-remplir le formulaire
    form.name = data.name || "";
    form.email = data.email;
    form.phone = data.phone || "";
    form.roles = [...data.roles];
  } catch (error) {
    console.error("Erreur lors du chargement de l'utilisateur:", error);
    useToast().add({
      title: "Erreur",
      description: "Impossible de charger les informations de l'utilisateur",
      icon: "heroicons:x-circle-20-solid",
      color: "error",
    });
  } finally {
    isLoadingUser.value = false;
  }
};

// Validation
const validateForm = () => {
  // Reset errors
  Object.keys(errors).forEach((key) => {
    errors[key as keyof typeof errors] = "";
  });

  let isValid = true;

  // Validation nom
  if (!form.name.trim()) {
    errors.name = "Le nom est requis";
    isValid = false;
  }

  // Validation email
  if (!form.email.trim()) {
    errors.email = "L'email est requis";
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "L'email n'est pas valide";
    isValid = false;
  }

  // Validation téléphone
  if (form.phone && !/^[+]?[0-9\s\-()]{10,}$/.test(form.phone)) {
    errors.phone = "Le numéro de téléphone n'est pas valide";
    isValid = false;
  }

  // Validation rôles
  if (form.roles.length === 0) {
    errors.roles = "Au moins un rôle doit être sélectionné";
    isValid = false;
  }

  return isValid;
};

// Soumission du formulaire
const handleSubmit = async () => {
  if (!validateForm() || !currentUser.value) {
    return;
  }

  isLoading.value = true;

  try {
    const updateData = {
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      roles: form.roles,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("users")
      .update(updateData)
      .eq("id", userId);

    if (error) {
      throw error;
    }

    // Mettre à jour les données locales
    currentUser.value = { ...currentUser.value, ...updateData };

    // Afficher le modal de succès
    showSuccessModal.value = true;

    useToast().add({
      title: "Succès",
      description: "Les informations utilisateur ont été mises à jour",
      icon: "heroicons:check-circle-20-solid",
      color: "success",
    });
  } catch (error) {
    console.error("Erreur lors de la modification:", error);

    useToast().add({
      title: "Erreur",
      description: "Une erreur est survenue lors de la modification",
      icon: "heroicons:x-circle-20-solid",
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
};

// Réinitialiser le formulaire
const resetForm = () => {
  if (currentUser.value) {
    form.name = currentUser.value.name || "";
    form.email = currentUser.value.email;
    form.phone = currentUser.value.phone || "";
    form.roles = [...currentUser.value.roles];
  }

  Object.keys(errors).forEach((key) => {
    errors[key as keyof typeof errors] = "";
  });
};

// Navigation
const goToUsersList = () => {
  navigateTo("/utilisateurs");
};

// Charger les données au montage
onMounted(() => {
  loadUser();
});

// Meta
useHead({
  title: "Modifier utilisateur - App Gestion",
  meta: [
    {
      name: "description",
      content: "Modifier les informations et permissions d'un utilisateur",
    },
  ],
});
</script>
