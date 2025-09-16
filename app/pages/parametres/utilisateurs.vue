<template>
  <div v-if="!currentUser && !isLoadingUser" class="max-w-6xl mx-auto p-6">
    <div class="text-center p-8">
      <Icon
        name="i-heroicons-exclamation-triangle"
        size="48"
        class="mx-auto text-yellow-500 mb-4"
      />
      <p class="text-lg text-gray-600 dark:text-gray-300">
        Utilisateur non trouvé
      </p>
    </div>
  </div>

  <div v-else class="max-w-6xl mx-auto p-6 space-y-8">
    <!-- Header du profil avec design moderne -->
    <div
      class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 p-8 bg-gradient-to-r from-white via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 backdrop-blur-sm"
    >
      <div class="flex flex-col sm:flex-row items-center gap-8">
        <div class="relative">
          <div
            class="w-36 h-36 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-500 dark:text-gray-400 border-4 border-white dark:border-gray-700 shadow-2xl ring-4 ring-blue-500/20"
          >
            <Icon name="i-heroicons-user" size="40" />
          </div>
        </div>
        <div class="text-center sm:text-left">
          <h1
            class="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2"
          >
            {{ userName || "Utilisateur" }}
          </h1>
          <p class="text-gray-600 dark:text-gray-300 text-lg mb-2">
            {{ userEmail }}
          </p>
          <div
            class="inline-flex px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full text-sm font-medium shadow-lg"
          >
            {{ getRoleLabel(primaryRole || "employe") }}
          </div>
        </div>
      </div>
      <div class="flex justify-center lg:justify-end">
        <UButton
          :variant="isEditing ? 'outline' : 'solid'"
          :color="isEditing ? 'neutral' : 'primary'"
          icon="i-heroicons-pencil-square"
          size="lg"
          class="transition-all duration-200 transform hover:scale-105"
          @click="toggleEdit"
        >
          {{ isEditing ? "Annuler" : "Modifier" }}
        </UButton>
      </div>
    </div>

    <!-- Contenu principal avec onglets modernes -->
    <div
      class="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700"
    >
      <UTabs v-model="activeTab" :items="tabs" class="w-full">
        <!-- Onglet Informations personnelles -->
        <template #personal>
          <div class="p-8">
            <UCard class="border-0 shadow-none">
              <template #header>
                <div class="flex items-center gap-3 mb-6">
                  <Icon
                    name="i-heroicons-user-circle"
                    size="24"
                    class="text-primary-600"
                  />
                  <h3 class="text-2xl font-bold text-gray-900 dark:text-white">
                    Informations personnelles
                  </h3>
                </div>
              </template>

              <UForm
                ref="profileForm"
                :schema="profileSchema"
                :state="profileData"
                class="space-y-6"
                @submit="updateProfile"
              >
                <div class="flex flex-row gap-6 mb-8">
                  <UFormGroup
                    label="Nom complet"
                    name="name"
                    class="space-y-2 md:col-span-2"
                  >
                    <UInput
                      v-model="profileData.name"
                      :disabled="!isEditing"
                      placeholder="Votre nom complet"
                      size="lg"
                      class="border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20 rounded-xl transition-all duration-200"
                      leading-icon="i-heroicons-user"
                    />
                  </UFormGroup>

                  <UFormGroup label="Email" name="email" class="space-y-2">
                    <UInput
                      v-model="profileData.email"
                      :disabled="!isEditing"
                      type="email"
                      placeholder="votre.email@exemple.com"
                      size="lg"
                      class="border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20 rounded-xl transition-all duration-200"
                      leading-icon="i-heroicons-envelope"
                    />
                  </UFormGroup>

                  <UFormGroup label="Téléphone" name="phone" class="space-y-2">
                    <UInput
                      v-model="profileData.phone"
                      :disabled="!isEditing"
                      type="tel"
                      placeholder="+33 1 23 45 67 89"
                      size="lg"
                      class="border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20 rounded-xl transition-all duration-200"
                      leading-icon="i-heroicons-phone"
                    />
                  </UFormGroup>
                </div>

                <div
                  v-if="isEditing"
                  class="flex flex-col sm:flex-row gap-4 justify-end pt-8 border-t border-gray-200 dark:border-gray-700"
                >
                  <UButton
                    type="submit"
                    color="success"
                    variant="solid"
                    icon="i-heroicons-check"
                    size="lg"
                    :loading="loading"
                    class="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    Sauvegarder
                  </UButton>
                  <UButton
                    variant="outline"
                    color="neutral"
                    icon="i-heroicons-x-mark"
                    size="lg"
                    class="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                    @click="cancelEdit"
                  >
                    Annuler
                  </UButton>
                </div>
              </UForm>
            </UCard>
          </div>
        </template>

        <!-- Onglet Sécurité -->
        <template #security>
          <div class="p-8">
            <UCard class="border-0 shadow-none">
              <template #header>
                <div class="flex items-center gap-3 mb-6">
                  <Icon
                    name="i-heroicons-shield-check"
                    size="24"
                    class="text-primary-600"
                  />
                  <h3 class="text-2xl font-bold text-gray-900 dark:text-white">
                    Sécurité du compte
                  </h3>
                </div>
              </template>

              <div class="space-y-4">
                <UCard
                  v-for="item in securityItems"
                  :key="item.id"
                  class="border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 rounded-xl"
                >
                  <div
                    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 p-6"
                  >
                    <div class="flex items-center gap-4 flex-1">
                      <div
                        class="p-3 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-600 dark:text-blue-400 rounded-xl"
                      >
                        <Icon :name="getSecurityIcon(item.id)" size="20" />
                      </div>
                      <div>
                        <h4
                          class="text-lg font-semibold text-gray-900 dark:text-white mb-1"
                        >
                          {{ item.title }}
                        </h4>
                        <p class="text-sm text-gray-600 dark:text-gray-300">
                          {{ item.description }}
                        </p>
                      </div>
                    </div>
                    <UButton
                      :variant="item.variant"
                      :color="item.color as any"
                      size="md"
                      class="transition-all duration-200 transform hover:scale-105"
                      @click="item.action"
                    >
                      {{ item.buttonText }}
                    </UButton>
                  </div>
                </UCard>
              </div>
            </UCard>
          </div>
        </template>

        <!-- Onglet Préférences -->
        <template #preferences>
          <div class="p-8">
            <UCard class="border-0 shadow-none">
              <template #header>
                <div class="flex items-center gap-3 mb-6">
                  <Icon
                    name="i-heroicons-cog-6-tooth"
                    size="24"
                    class="text-primary-600"
                  />
                  <h3 class="text-2xl font-bold text-gray-900 dark:text-white">
                    Préférences
                  </h3>
                </div>
              </template>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div
                  class="p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 space-y-4 bg-gray-50/30 dark:bg-gray-800/30"
                >
                  <div
                    class="flex items-center gap-3 font-medium text-gray-900 dark:text-white"
                  >
                    <Icon name="i-heroicons-bell" size="20" />
                    <span>Notifications push</span>
                  </div>
                  <UToggle v-model="preferences.pushNotifications" size="lg" />
                </div>
              </div>
            </UCard>
          </div>
        </template>

        <!-- Onglet Activité -->
        <template #activity>
          <div class="p-8">
            <UCard class="border-0 shadow-none">
              <template #header>
                <div class="flex items-center gap-3 mb-6">
                  <Icon
                    name="i-heroicons-clock"
                    size="24"
                    class="text-primary-600"
                  />
                  <h3 class="text-2xl font-bold text-gray-900 dark:text-white">
                    Activité récente
                  </h3>
                </div>
              </template>

              <div class="space-y-4">
                <div
                  v-for="activity in recentActivity"
                  :key="activity.id"
                  class="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 bg-gray-50/30 dark:bg-gray-800/30"
                >
                  <div
                    class="p-3 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-600 dark:text-blue-400 rounded-xl"
                  >
                    <Icon :name="activity.icon" size="20" />
                  </div>
                  <div class="flex-1">
                    <p class="font-medium text-gray-900 dark:text-white mb-2">
                      {{ activity.description }}
                    </p>
                    <span class="text-sm text-gray-600 dark:text-gray-300">
                      {{ formatDate(activity.createdAt) }}
                    </span>
                  </div>
                </div>
              </div>
            </UCard>
          </div>
        </template>
      </UTabs>
    </div>

    <!-- Modals modernes -->
    <UModal
      v-model:open="showPasswordModal"
      title="Changer le mot de passe"
      :dismissible="false"
    >
      <template #body>
        <UForm
          :schema="passwordSchema"
          :state="passwordData"
          @submit="changePassword"
        >
          <div class="flex flex-col items-center ali space-y-6">
            <UFormGroup label="Mot de passe actuel" name="current">
              <UInput
                v-model="passwordData.current"
                type="password"
                placeholder="Mot de passe actuel"
                size="lg"
                leading-icon="i-heroicons-lock-closed"
              />
            </UFormGroup>

            <UFormGroup label="Nouveau mot de passe" name="new">
              <UInput
                v-model="passwordData.new"
                type="password"
                placeholder="Nouveau mot de passe"
                size="lg"
                leading-icon="i-heroicons-key"
              />
            </UFormGroup>

            <UFormGroup label="Confirmer le mot de passe" name="confirm">
              <UInput
                v-model="passwordData.confirm"
                type="password"
                placeholder="Confirmer le mot de passe"
                size="lg"
                leading-icon="i-heroicons-lock-closed"
              />
            </UFormGroup>
          </div>
        </UForm>
      </template>

      <template #footer>
        <div class="flex flex-col sm:flex-row gap-4 justify-end">
          <UButton
            type="submit"
            color="success"
            size="lg"
            :loading="loading"
            class="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg transform hover:scale-105 transition-all duration-200"
            @click="changePassword"
          >
            Changer
          </UButton>
          <UButton
            variant="outline"
            color="neutral"
            size="lg"
            class="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
            @click="showPasswordModal = false"
          >
            Annuler
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">

import { z } from "zod";

// Meta configuration
definePageMeta({
  middleware: "auth",
});

// SEO
useSeoMeta({
  title: "Mon Profil",
  description: "Gérez vos informations personnelles et préférences",
});

// Composables
const supabase = useSupabaseClient();
const toast = useToast();
const { currentUser, userName, userEmail, primaryRole, isLoadingUser } =
  useCurrentUser();

// Types
interface ProfileData {
  name: string;
  email: string;
  phone: string;
}

// Rôles disponibles avec leurs labels
const roleLabels: Record<string, string> = {
  admin: "Administrateur",
  magasinier: "Magasinier",
  employe: "Employé",
  ROLE_ADMIN: "Administrateur",
  ROLE_MANAGER: "Magasinier",
  ROLE_USER: "Employé",
};

const getRoleLabel = (role: string | null): string => {
  if (!role) return "Employé";
  return roleLabels[role] || role;
};

// Schemas de validation
const profileSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
});

const passwordSchema = z
  .object({
    current: z.string().min(1, "Mot de passe actuel requis"),
    new: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirm: z.string().min(1, "Confirmation requise"),
  })
  .refine((data) => data.new === data.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

// États réactifs
const isEditing = ref(false);
const loading = ref(false);
const activeTab = ref("personal");
const showPasswordModal = ref(false);

// Données du formulaire - initialisées à partir des données utilisateur
const profileData = reactive<ProfileData>({
  name: "",
  email: "",
  phone: "",
});

// Initialiser les données du formulaire quand l'utilisateur est chargé
watch(
  currentUser,
  (user) => {
    if (user) {
      profileData.name = user.name || "";
      profileData.email = user.email || "";
      profileData.phone = user.phone || "";
    }
  },
  { immediate: true }
);

const passwordData = reactive({
  current: "",
  new: "",
  confirm: "",
});

const preferences = reactive({
  pushNotifications: false,
});

// Configuration des onglets
const tabs = [
  {
    slot: "personal",
    label: "Informations",
    icon: "i-heroicons-user",
  },
  {
    slot: "security",
    label: "Sécurité",
    icon: "i-heroicons-shield-check",
  },
  {
    slot: "preferences",
    label: "Préférences",
    icon: "i-heroicons-cog-6-tooth",
  },
  {
    slot: "activity",
    label: "Activité",
    icon: "i-heroicons-clock",
  },
];

// Configuration des éléments de sécurité
const securityItems = computed(() => [
  {
    id: 1,
    title: "Mot de passe",
    description: "Gérez votre mot de passe de connexion",
    buttonText: "Modifier",
    variant: "outline" as const,
    color: "primary" as const,
    action: () => {
      showPasswordModal.value = true;
    },
  },
  {
    id: 2,
    title: "Sessions actives",
    description: "Consultez vos sessions de connexion",
    buttonText: "Voir",
    variant: "outline" as const,
    color: "neutral" as const,
    action: () => {
      toast.add({
        title: "Fonctionnalité à venir",
        description: "La gestion des sessions sera bientôt disponible",
        icon: "i-heroicons-information-circle",
        color: "info",
      });
    },
  },
]);

// Activité récente simulée (remplacée par des données réelles plus tard)
const recentActivity = ref([
  {
    id: 1,
    description: "Connexion à l'application",
    icon: "i-heroicons-arrow-right-on-rectangle",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    description: "Consultation du profil",
    icon: "i-heroicons-user",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
]);

// Méthodes
const getSecurityIcon = (id: number) => {
  switch (id) {
    case 1:
      return "i-heroicons-key";
    case 2:
      return "i-heroicons-computer-desktop";
    default:
      return "i-heroicons-shield-exclamation";
  }
};

const toggleEdit = () => {
  isEditing.value = !isEditing.value;
  if (!isEditing.value) {
    cancelEdit();
  }
};

const updateProfile = async () => {
  if (!currentUser.value) {
    toast.add({
      title: "Erreur",
      description: "Utilisateur non trouvé",
      icon: "i-heroicons-x-circle",
      color: "error",
    });
    return;
  }

  try {
    loading.value = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("users")
      .update({
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone || null,
      })
      .eq("id", currentUser.value.id);

    if (error) throw error;

    isEditing.value = false;

    toast.add({
      title: "Profil mis à jour",
      description: "Vos informations ont été sauvegardées avec succès.",
      icon: "i-heroicons-check-circle",
      color: "success",
    });

    // Rafraîchir les données utilisateur
    const { refreshUser } = useCurrentUser();
    refreshUser();
  } catch (error: unknown) {
    console.error("Erreur lors de la mise à jour:", error);
    toast.add({
      title: "Erreur",
      description:
        error instanceof Error
          ? error.message
          : "Impossible de mettre à jour le profil.",
      icon: "i-heroicons-x-circle",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
};

const cancelEdit = () => {
  if (currentUser.value) {
    profileData.name = currentUser.value.name || "";
    profileData.email = currentUser.value.email || "";
    profileData.phone = currentUser.value.phone || "";
  }
};

const changePassword = async () => {
  try {
    loading.value = true;

    // Utiliser Supabase Auth pour changer le mot de passe
    const { error } = await supabase.auth.updateUser({
      password: passwordData.new,
    });

    if (error) throw error;

    showPasswordModal.value = false;
    Object.assign(passwordData, { current: "", new: "", confirm: "" });

    toast.add({
      title: "Mot de passe modifié",
      description: "Votre mot de passe a été changé avec succès.",
      icon: "i-heroicons-check-circle",
      color: "success",
    });
  } catch (error: unknown) {
    console.error("Erreur lors du changement de mot de passe:", error);
    toast.add({
      title: "Erreur",
      description:
        error instanceof Error
          ? error.message
          : "Impossible de changer le mot de passe.",
      icon: "i-heroicons-x-circle",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
</script>

<style scoped>
/* Animations personnalisées */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Animation d'entrée pour les éléments */
.max-w-6xl > *:first-child {
  animation: fadeInUp 0.8s ease-out;
}

.max-w-6xl > *:nth-child(2) {
  animation: fadeInUp 0.8s ease-out 0.2s backwards;
}

/* Effet de survol personnalisé pour les cartes */
.hover\:border-blue-300:hover {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

/* Gradient animé pour les boutons principaux */
.bg-gradient-to-r.from-green-500:hover {
  background-size: 200% auto;
  animation: gradient-shift 2s ease infinite;
}

.bg-gradient-to-r.from-blue-500:hover {
  background-size: 200% auto;
  animation: gradient-shift 2s ease infinite;
}

@keyframes gradient-shift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* Effet glassmorphism pour les cartes */
.bg-gray-50\/30 {
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

/* Amélioration des transitions */
* {
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Focus states améliorés */
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
</style>
