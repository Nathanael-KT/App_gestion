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
            Modifiez les informations et rôles de l'utilisateur
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
              <label class="block text-sm font-medium text-gray-700"
                >Nom complet *</label
              >
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
              <label class="block text-sm font-medium text-gray-700"
                >Adresse email *</label
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
              <p v-if="errors.email" class="text-red-500 text-sm">
                {{ errors.email }}
              </p>
            </div>
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700"
                >Téléphone</label
              >
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
              Sélectionnez un ou plusieurs rôles pour cet utilisateur.
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
                        >{{ permission }}</span
                      >
                    </div>
                  </div>
                </label>
              </div>
            </div>
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
            icon="heroicons:check-20-solid"
            class="flex-1 sm:flex-none"
          >
            {{
              isLoading ? "Modification..." : "Enregistrer les modifications"
            }}
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
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSupabaseClient } from "#imports";

const route = useRoute();
const router = useRouter();
const supabase = useSupabaseClient() as any;
const toast = useToast();

const userId = route.params.id as string;
const isLoading = ref(false);

const availableRoles = [
  {
    value: "super_admin",
    label: "Super Administrateur",
    icon: "heroicons:shield-check-20-solid",
    iconColor: "text-green-600",
    description: "Accès complet à toutes les fonctionnalités et paramètres",
    permissions: [
      "Gestions des compagnies",
      "Gestions des utilisateurs",
      "Logs système",
    ],
  },
];

const form = reactive<{
  name: string;
  email: string;
  phone: string;
  roles: string[];
}>({
  name: "",
  email: "",
  phone: "",
  roles: [],
});

const errors = reactive({
  name: "",
  email: "",
  phone: "",
  roles: "",
});

const isFormValid = computed(() => {
  return (
    form.name.trim() !== "" && form.email.trim() !== "" && form.roles.length > 0
  );
});

const getRoleLabel = (value: string) => {
  return availableRoles.find((role) => role.value === value)?.label || value;
};

const getRoleIcon = (value: string) => {
  return (
    availableRoles.find((role) => role.value === value)?.icon ||
    "heroicons:user-20-solid"
  );
};

const validateForm = () => {
  Object.keys(errors).forEach((key) => {
    errors[key as keyof typeof errors] = "";
  });
  let isValid = true;
  if (!form.name.trim()) {
    errors.name = "Le nom est requis";
    isValid = false;
  }
  if (!form.email.trim()) {
    errors.email = "L'email est requis";
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "L'email n'est pas valide";
    isValid = false;
  }
  if (form.phone && !/^[+]?[0-9\s\-()]{10,}$/.test(form.phone)) {
    errors.phone = "Le numéro de téléphone n'est pas valide";
    isValid = false;
  }
  if (form.roles.length === 0) {
    errors.roles = "Au moins un rôle doit être sélectionné";
    isValid = false;
  }
  return isValid;
};

type UserData = {
  id: string;
  name: string;
  email: string;
  phone: string;
  roles: string[];
};

const fetchUser = async () => {
  isLoading.value = true;
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, phone, roles")
      .eq("id", userId)
      .single();
    if (error || !data) {
      throw new Error("Utilisateur introuvable");
    }
    form.name = data.name || "";
    form.email = data.email || "";
    form.phone = data.phone || "";
    form.roles = data.roles || [];
  } catch (error) {
    toast.add({
      title: "Erreur",
      description:
        error instanceof Error
          ? error.message
          : "Impossible de charger l'utilisateur",
      icon: "heroicons:x-circle-20-solid",
      color: "error",
    });
    router.back();
  } finally {
    isLoading.value = false;
  }
};

const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }
  isLoading.value = true;
  try {
    const { error } = await supabase
      .from("users")
      .update({
        name: form.name,
        email: form.email,
        phone: form.phone,
        roles: form.roles,
      })
      .eq("id", userId);
    if (error) {
      throw new Error(error.message);
    }
    toast.add({
      title: "Succès",
      description: "Utilisateur modifié avec succès",
      icon: "heroicons:check-circle-20-solid",
      color: "success",
    });
    setTimeout(() => {
      router.back();
    }, 1500);
  } catch (error) {
    toast.add({
      title: "Erreur",
      description:
        error instanceof Error
          ? error.message
          : "Impossible de modifier l'utilisateur",
      icon: "heroicons:x-circle-20-solid",
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
};

const resetForm = () => {
  fetchUser();
  Object.keys(errors).forEach((key) => {
    errors[key as keyof typeof errors] = "";
  });
};

onMounted(fetchUser);

useHead({
  title: "Modifier utilisateur - App Gestion",
  meta: [
    {
      name: "description",
      content: "Modifier les informations et rôles d'un utilisateur",
    },
  ],
});
</script>
