<script setup>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";

const supabase = useSupabaseClient();
const route = useRoute();
const router = useRouter();

const clientId = ref(null);
const client = ref({
  name: "",
  email: "",
  phone: "",
  address: "",
});
const loading = ref(false);
const error = ref(null);
const isUpdating = ref(false);

// utilise la composable useCurrentUser pour récupérer les rôles de l'utilisateur
const { userRoles } = useCurrentUser();

const fetchClient = async () => {
  loading.value = true;
  error.value = null;

  try {
    const { data, error: fetchError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId.value)
      .single();

    if (fetchError) throw fetchError;
    if (!data) throw new Error("Client non trouvé");

    client.value = data;
  } catch (err) {
    error.value = err.message || "Erreur lors de la récupération du client.";
  } finally {
    loading.value = false;
  }
};

const updateClient = async () => {
  isUpdating.value = true;
  error.value = null;

  try {
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        name: client.value.name,
        email: client.value.email,
        phone: client.value.phone,
        address: client.value.address,
      })
      .eq("id", clientId.value);

    if (updateError) throw updateError;

    router.push("/client");
  } catch (err) {
    error.value = err.message || "Erreur lors de la mise à jour du client.";
  } finally {
    isUpdating.value = false;
  }
};

onMounted(() => {
  const id = route.params.id;
  if (!id || typeof id !== "string") {
    error.value = "ID client manquant ou invalide dans l'URL";
    return;
  }

  clientId.value = id;
  fetchClient();
});
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Met un bouton de retour -->
    <UButton label="Retour" to="/client" />
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
      <h1 class="text-lg font-bold mb-6 text-gray-800">
        Modifier les informations du client
      </h1>

      <!-- Chargement -->
      <div v-if="loading" class="flex justify-center items-center py-8">
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"
        />
      </div>

      <!-- Erreur -->
      <div
        v-if="error"
        class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded"
      >
        <p>{{ error }}</p>
      </div>

      <!-- Formulaire -->
      <form v-if="!loading && client" @submit.prevent="updateClient">
        <div class="mb-4">
          <label for="name" class="block text-sm font-medium text-gray-700"
            >Nom</label
          >
          <input
            id="name"
            v-model="client.name"
            type="text"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
        </div>

        <div class="mb-4">
          <label for="email" class="block text-sm font-medium text-gray-700"
            >Email</label
          >
          <input
            id="email"
            v-model="client.email"
            type="email"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
        </div>

        <div class="mb-4">
          <label for="phone" class="block text-sm font-medium text-gray-700"
            >Téléphone</label
          >
          <input
            id="phone"
            v-model="client.phone"
            type="text"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
        </div>

        <div class="mb-4">
          <label for="address" class="block text-sm font-medium text-gray-700"
            >Adresse</label
          >
          <input
            id="address"
            v-model="client.address"
            type="text"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
        </div>

        <div class="flex justify-end">
          <button
            type="submit"
            class="px-6 py-2 bg-blue-500 text-white rounded-md shadow hover:bg-blue-600"
            :disabled="isUpdating"
          >
            <span
              v-if="isUpdating"
              class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
            />
            Mettre à jour
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
