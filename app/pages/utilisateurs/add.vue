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
            Nouvel utilisateur
          </h1>
          <p class="text-gray-600 mt-1">
            Créer un nouveau compte utilisateur avec des rôles spécifiques
          </p>
        </div>
      </div>
    </div>

    <!-- Formulaire -->
    <div class="bg-white rounded-xl shadow-sm border p-6 lg:p-8">
      <form class="space-y-8" @submit.prevent="handleSubmit">
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
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">
                Nom complet *
              </label>
              <UInput
                v-model="form.name"
                :error="!!errors.name"
                placeholder="Ex: Jean Dupont"
                size="lg"
                icon="heroicons:user-20-solid"
                :disabled="isLoading"
              />
              <p v-if="errors.name" class="text-red-500 text-sm">
                {{ errors.name }}
              </p>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">
                Adresse email *
              </label>
              <UInput
                v-model="form.email"
                type="email"
                :error="!!errors.email"
                placeholder="Ex: jean.dupont@entreprise.com"
                size="lg"
                icon="heroicons:envelope-20-solid"
                :disabled="isLoading"
              />
              <p v-if="errors.email" class="text-red-500 text-sm">
                {{ errors.email }}
              </p>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">
                Téléphone
              </label>
              <UInput
                v-model="form.phone"
                type="tel"
                :error="!!errors.phone"
                placeholder="Ex: +33 1 23 45 67 89"
                size="lg"
                icon="heroicons:phone-20-solid"
                :disabled="isLoading"
              />
              <p v-if="errors.phone" class="text-red-500 text-sm">
                {{ errors.phone }}
              </p>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">
                Mot de passe temporaire *
              </label>
              <UInput
                v-model="form.password"
                type="password"
                :error="!!errors.password"
                placeholder="Minimum 8 caractères"
                size="lg"
                icon="heroicons:key-20-solid"
                :disabled="isLoading"
              />
              <p v-if="errors.password" class="text-red-500 text-sm">
                {{ errors.password }}
              </p>
              <p class="text-xs text-gray-500">
                L'utilisateur pourra changer ce mot de passe lors de sa première
                connexion
              </p>
            </div>
          </div>
        </div>

        <!-- Sécurité -->
        <div>
          <h2
            class="text-lg font-semibold text-gray-900 mb-4 flex items-center"
          >
            <UIcon
              name="heroicons:lock-closed-20-solid"
              class="h-5 w-5 mr-2 text-green-600"
            />
            Informations complémentaires
          </h2>
          <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div class="flex items-start space-x-3">
              <UIcon
                name="heroicons:information-circle-20-solid"
                class="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0"
              />
              <div class="text-sm text-blue-800">
                <p class="font-medium mb-1">
                  Processus de création d'utilisateur
                </p>
                <p class="mb-2">Le système va automatiquement :</p>
                <ol class="list-decimal list-inside mt-1 space-y-1">
                  <li>Créer un compte d'authentification Supabase</li>
                  <li>
                    Enregistrer le profil utilisateur avec les rôles
                    sélectionnés
                  </li>
                  <li>Lier automatiquement les deux comptes</li>
                  <li>
                    Envoyer un email d'invitation avec un lien de connexion
                  </li>
                </ol>
                <p class="mt-2 font-medium text-blue-900">
                  L'utilisateur pourra se connecter directement avec ses
                  identifiants !
                </p>
              </div>
            </div>
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

          <!-- Sélection des rôles -->
          <div class="space-y-4">
            <p class="text-sm text-gray-600 mb-4">
              Sélectionnez un ou plusieurs rôles pour cet utilisateur. Chaque
              rôle donne accès à des fonctionnalités spécifiques.
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
                />
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
              <h4 class="font-medium text-blue-900 mb-2">
                Rôles sélectionnés :
              </h4>
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
            icon="heroicons:user-plus-20-solid"
            class="flex-1 sm:flex-none"
          >
            {{ isLoading ? "Création en cours..." : "Créer l'utilisateur" }}
          </UButton>

          <UButton
            variant="ghost"
            size="lg"
            class="flex-1 sm:flex-none"
            icon="heroicons:arrow-path-20-solid"
            :disabled="isLoading"
            @click="resetForm"
          >
            Réinitialiser
          </UButton>

          <UButton
            variant="outline"
            size="lg"
            class="flex-1 sm:flex-none"
            icon="heroicons:x-mark-20-solid"
            :disabled="isLoading"
            @click="$router.back()"
          >
            Annuler
          </UButton>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
// Import du store magasin
import { useMagasinStore } from "@/composables/useMagasinStore";
import { useCurrentUser } from "../../composables/useCurrentUser";
const { companyId } = useCurrentUser();

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

// État du composant
const isLoading = ref(false);
const isLoadingMagasins = ref(true);

// Formulaire
const form = reactive<{
  name: string;
  email: string;
  phone: string;
  password: string;
  roles: string[];
  magasin_id: string | null;
}>({
  name: "",
  email: "",
  phone: "",
  password: "",
  roles: [],
  magasin_id: null,
});

// Erreurs
const errors = reactive({
  name: "",
  email: "",
  phone: "",
  password: "",
  roles: "",
  magasin_id: "",
});

// Supabase
const supabase = useSupabaseClient();

// Toast notifications
const toast = useToast();

// Affecter automatiquement le magasin courant à chaque nouvel utilisateur
const magasinStore = useMagasinStore();

onMounted(() => {
  // Affecte le magasin courant au formulaire
  form.magasin_id = magasinStore.magasinId || null;

  loadMagasins();
});

// Validation du formulaire : retire la validation du champ magasin_id (il est auto-rempli)
const isFormValid = computed(() => {
  return (
    form.name.trim() !== "" &&
    form.email.trim() !== "" &&
    form.password.trim() !== "" &&
    form.password.length >= 8 &&
    form.roles.length > 0
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

// Magasins (à remplacer par la vraie source de magasins)
const magasins = ref<Array<{ id: string; name: string }>>([]);

// Charger la liste des magasins depuis Supabase
const loadMagasins = async () => {
  isLoadingMagasins.value = true;
  try {
    const { data, error } = await supabase.from("magasins").select("id, nom");
    if (error) {
      console.error("Erreur chargement magasins:", error);
      magasins.value = [];
    } else {
      magasins.value = Array.isArray(data)
        ? data.map((m: { id: string; nom: string }) => ({
            id: m.id,
            name: m.nom,
          }))
        : [];
    }
  } catch (err) {
    console.error("Erreur chargement magasins:", err);
    magasins.value = [];
  } finally {
    isLoadingMagasins.value = false;
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

  // Validation mot de passe
  if (!form.password.trim()) {
    errors.password = "Le mot de passe est requis";
    isValid = false;
  } else if (form.password.length < 8) {
    errors.password = "Le mot de passe doit contenir au moins 8 caractères";
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
  if (!validateForm()) {
    return;
  }
  isLoading.value = true;
  try {
    // Créer le compte d'authentification Supabase avec les métadonnées nécessaires
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          roles: form.roles,
          phone: form.phone || null,
          magasin_id: form.magasin_id,
          company_id: companyId.value,
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (authError) {
      throw new Error(
        `Erreur lors de la création du compte d'authentification: ${authError.message}`,
      );
    }

    if (!authData.user) {
      throw new Error("Aucun utilisateur créé lors de l'authentification");
    }

    // Le trigger sync_auth_user_to_public() va automatiquement créer l'enregistrement dans public.users
    // Attendons un peu pour que le trigger s'exécute
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Vérifier que l'utilisateur a bien été créé dans public.users
    const { data: publicUser, error: checkError } = await supabase
      .from("users")
      .select("*")
      .eq("auth_user_id", authData.user.id)
      .single();

    if (checkError || !publicUser) {
      console.warn(
        "L'utilisateur n'a pas été trouvé dans public.users, création manuelle...",
      );

      // Créer manuellement l'enregistrement dans public.users si le trigger n'a pas fonctionné
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbError } = await (supabase as any).from("users").insert([
        {
          auth_user_id: authData.user.id,
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          roles: form.roles,
          magasin_id: form.magasin_id,
          company_id: companyId.value,
        },
      ]);

      if (dbError) {
        throw new Error(
          `Erreur lors de la création du profil utilisateur: ${dbError.message}`,
        );
      }
    }

    // Afficher un message de succès
    toast.add({
      title: "Succès",
      description: `L'utilisateur ${form.name} a été créé avec succès. Un email de confirmation a été envoyé à ${form.email}.`,
      icon: "heroicons:check-circle-20-solid",
      color: "success",
    });

    // Rediriger vers la liste des utilisateurs après un court délai
    setTimeout(() => {
      navigateTo("/utilisateurs");
    }, 2000);
  } catch (error: unknown) {
    console.error("Erreur lors de la création de l'utilisateur:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Une erreur est survenue lors de la création de l'utilisateur";

    // Afficher une notification d'erreur détaillée
    toast.add({
      title: "Erreur",
      description: errorMessage,
      icon: "heroicons:x-circle-20-solid",
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
};

// Réinitialiser le formulaire
const resetForm = () => {
  Object.assign(form, {
    name: "",
    email: "",
    phone: "",
    password: "",
    roles: [],
    magasin_id: null,
  });

  Object.keys(errors).forEach((key) => {
    errors[key as keyof typeof errors] = "";
  });
};

// Meta
useHead({
  title: "Nouvel utilisateur - App Gestion",
  meta: [
    {
      name: "description",
      content: "Créer un nouveau compte utilisateur avec des rôles spécifiques",
    },
  ],
});
</script>

<style scoped>
/* Styles pour les cases à cocher personnalisées */
input[type="checkbox"]:checked + label .opacity-0 {
  opacity: 1;
}

input[type="checkbox"]:checked + label .border-gray-300 {
  border-color: #3b82f6;
  background-color: #3b82f6;
}
</style>
