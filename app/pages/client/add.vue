<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useMagasinStore } from "../../composables/useMagasinStore";
const router = useRouter();
const supabase = useSupabaseClient();

const client = ref({
  name: "",
  email: "",
  phone: "",
  address: "",
});

const magasinStore = useMagasinStore();

const error = ref(null);
const success = ref(false);
const isSubmitting = ref(false);

const toast = useToast();

const handleSubmit = async () => {
  isSubmitting.value = true;
  error.value = null;

  // Vérifie que magasinId est bien défini
  if (!magasinStore.magasinId) {
    error.value = "Veuillez sélectionner un magasin avant d'ajouter un client.";
    isSubmitting.value = false;
    return;
  }

  try {
    const clientToInsert = {
      ...client.value,
      magasin_id: magasinStore.magasinId,
    };
    const { error: insertError } = await supabase
      .from("clients")
      .insert([clientToInsert]);

    if (insertError) throw insertError;

    success.value = true;
    toast.add({
      title: "Succès",
      description: "Client ajouté avec succès !",
      color: "success",
      icon: "i-lucide-check-circle",
    });

    // Redirection avec un délai pour montrer le message de succès
    setTimeout(() => {
      router.push("/client");
    }, 1500);
  } catch (err) {
    toast.add({
      title: "Erreur",
      description: err.message || "Erreur lors de l'ajout du client.",
      color: "red",
      icon: "i-lucide-alert-circle",
    });
  } finally {
    isSubmitting.value = false;
  }
};

// utilise la composable useCurrentUser pour récupérer les rôles de l'utilisateur
const { userRoles } = useCurrentUser();

const resetForm = () => {
  client.value = {
    name: "",
    email: "",
    phone: "",
    address: "",
  };
  error.value = null;
  success.value = false;
};
</script>

<template>
  <div class="container mx-auto px-6 py-8">
    <!-- Header Section -->
    <!-- Blocage simple pour les magasiniers -->
    <div v-if="userRoles?.includes('magasinier')" class="text-center py-12">
      <UIcon
        name="i-heroicons-exclamation-triangle"
        class="w-16 h-16 text-red-500 mx-auto mb-4"
      />
      <h2 class="text-xl font-bold text-red-600 mb-2">Accès refusé</h2>
      <p class="text-gray-600 mb-4">
        Cette action est réservée aux administrateurs et magasiniers.
      </p>
      <UButton label="Retour" to="/" />
    </div>

    <!-- Contenu normal -->
    <div v-else>
      <div class="mb-8">
        <div class="flex items-center gap-4 mb-4">
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="gray"
            to="/client"
            class="shrink-0"
          >
            Retour
          </UButton>
          <div class="border-l border-gray-300 pl-4">
            <h1 class="text-3xl font-bold text-gray-900">Nouveau Client</h1>
            <p class="text-gray-600 mt-1">
              Ajoutez un nouveau client à votre base de données
            </p>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div v-if="success" class="mb-6">
        <div
          class="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3"
        >
          <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-green-500" />
          <div>
            <p class="font-medium">Client ajouté avec succès !</p>
            <p class="text-sm text-green-700">Redirection en cours...</p>
          </div>
        </div>
      </div>

      <div v-if="error" class="mb-6">
        <div
          class="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3"
        >
          <UIcon name="i-lucide-alert-circle" class="w-5 h-5 text-red-500" />
          <p>{{ error }}</p>
        </div>
      </div>

      <!-- Formulaire -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <!-- Section Informations de base -->
          <div>
            <h3
              class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"
            >
              <UIcon name="i-lucide-user" class="w-5 h-5 text-blue-600" />
              Informations personnelles
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  for="client_name"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Nom du client *
                </label>
                <UInput
                  id="client_name"
                  v-model="client.name"
                  type="text"
                  placeholder="Ex: Jean Dupont"
                  size="lg"
                  required
                  :disabled="isSubmitting"
                  icon="i-lucide-user"
                />
              </div>

              <div>
                <label
                  for="client_email"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Adresse email *
                </label>
                <UInput
                  id="client_email"
                  v-model="client.email"
                  type="email"
                  placeholder="Ex: jean.dupont@email.com"
                  size="lg"
                  required
                  :disabled="isSubmitting"
                  icon="i-lucide-mail"
                />
              </div>
            </div>
          </div>

          <!-- Section Contact -->
          <div class="pt-6 border-t border-gray-200">
            <h3
              class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"
            >
              <UIcon name="i-lucide-phone" class="w-5 h-5 text-green-600" />
              Informations de contact
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  for="client_phone"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Téléphone
                </label>
                <UInput
                  id="client_phone"
                  v-model="client.phone"
                  type="tel"
                  placeholder="Ex: +33 1 23 45 67 89"
                  size="lg"
                  :disabled="isSubmitting"
                  icon="i-lucide-phone"
                />
                <p class="text-xs text-gray-500 mt-1">Facultatif</p>
              </div>

              <div>
                <label
                  for="client_address"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Adresse
                </label>
                <UInput
                  id="client_address"
                  v-model="client.address"
                  type="text"
                  placeholder="Ex: 123 Rue de la Paix, Paris"
                  size="lg"
                  :disabled="isSubmitting"
                  icon="i-lucide-map-pin"
                />
                <p class="text-xs text-gray-500 mt-1">Facultatif</p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div
            class="pt-8 border-t border-gray-200 flex flex-col sm:flex-row justify-between gap-4"
          >
            <div class="flex items-center text-sm text-gray-500">
              <UIcon name="i-lucide-info" class="w-4 h-4 mr-1" />
              Les champs marqués d'un * sont obligatoires
            </div>

            <div class="flex gap-3">
              <UButton
                variant="outline"
                color="gray"
                :disabled="isSubmitting"
                @click="resetForm"
              >
                Réinitialiser
              </UButton>
              <UButton
                v-if="
                  userRoles?.includes('admin') || userRoles?.includes('employe')
                "
                type="submit"
                color="primary"
                size="lg"
                :loading="isSubmitting"
                :disabled="success"
                icon="i-lucide-user-plus"
                class="px-8"
              >
                {{ isSubmitting ? "Ajout en cours..." : "Ajouter le client" }}
              </UButton>
            </div>
          </div>
        </form>
      </div>

      <!-- Aide -->
      <div class="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div class="flex items-start gap-3">
          <UIcon
            name="i-lucide-lightbulb"
            class="w-5 h-5 text-blue-600 mt-0.5"
          />
          <div>
            <h4 class="font-medium text-blue-900 mb-1">Conseils</h4>
            <ul class="text-sm text-blue-800 space-y-1">
              <li>
                • Vérifiez que l'email est valide pour éviter les erreurs de
                communication
              </li>
              <li>
                • Le téléphone et l'adresse peuvent être ajoutés plus tard si
                nécessaire
              </li>
              <li>• Utilisez un nom complet pour faciliter la recherche</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
