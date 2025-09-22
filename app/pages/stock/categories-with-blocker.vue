<!-- 
  Exemple d'intégration de usePageBlocker dans une page existante
  Cette page montre comment ajouter la protection à la page de catégories du stock
-->
<script setup>
// Imports existants
import { ref, computed, watch } from "vue";
import { useCurrentUser } from "../../composables/useCurrentUser";

// NOUVEL IMPORT: Ajout de la composable usePageBlocker
import { usePageBlocker } from "../../composables/usePageBlocker";

// NOUVELLE PROTECTION: Utilisation de la composable pour protéger cette page
const { 
  isBlocked: isStockBlocked, 
  isLoading: isCheckingPermissions,
  error: permissionError 
} = usePageBlocker('Stock');

// State variables existantes
const productTypes = ref([]);
const newType = ref("");
const loading = ref(false);
const error = ref(null);
const searchQuery = ref("");
const _companyError = ref(null);

const _isDeleteModalOpen = ref(false);
const _isDeleting = ref(false);
const _typeToDelete = ref(null);
const _productsUsingType = ref([]);

const supabase = useSupabaseClient();
const toast = useToast();

// utilise la composable useCurrentUser pour récupérer les rôles de l'utilisateur
const { userRoles: _userRoles, companyId, isLoadingUser } = useCurrentUser();

// Computed properties existantes
const filteredProductTypes = computed(() => {
  if (!searchQuery.value.trim()) {
    return productTypes.value;
  }
  return productTypes.value.filter((type) =>
    type.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// NOUVEAU COMPUTED: État combiné pour l'affichage
const shouldShowContent = computed(() => {
  return !isCheckingPermissions.value && !isStockBlocked.value && !isLoadingUser.value;
});

// Fonctions existantes (inchangées)
const fetchProductTypes = async () => {
  if (!companyId.value) {
    console.warn("Aucun companyId disponible");
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const { data, error: fetchError } = await supabase
      .from("product_types")
      .select("*")
      .eq("company_id", companyId.value)
      .order("name");

    if (fetchError) throw fetchError;
    productTypes.value = data || [];
  } catch (err) {
    console.error("Erreur lors de la récupération des types:", err);
    error.value = "Impossible de charger les types de produits";
    toast.add({
      title: "Erreur",
      description: "Impossible de charger les types de produits",
      color: "red"
    });
  } finally {
    loading.value = false;
  }
};

// Watch pour charger les données quand companyId est disponible
watch(
  companyId,
  (newCompanyId) => {
    if (newCompanyId) {
      fetchProductTypes();
    }
  },
  { immediate: true }
);

// Autres fonctions existantes...
const addProductType = async () => {
  if (!newType.value.trim() || !companyId.value) return;
  
  loading.value = true;
  try {
    const { data, error: insertError } = await supabase
      .from("product_types")
      .insert([
        {
          name: newType.value.trim(),
          company_id: companyId.value,
        },
      ])
      .select();

    if (insertError) throw insertError;

    productTypes.value.push(data[0]);
    newType.value = "";
    
    toast.add({
      title: "Succès",
      description: "Type de produit ajouté avec succès",
      color: "green"
    });
  } catch (err) {
    console.error("Erreur lors de l'ajout:", err);
    toast.add({
      title: "Erreur",
      description: "Impossible d'ajouter le type de produit",
      color: "red"
    });
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      
      <!-- NOUVEAU: Indicateur de vérification des permissions -->
      <div v-if="isCheckingPermissions" class="mb-6">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-center">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3" />
            <span class="text-blue-800">Vérification des permissions d'accès au module Stock...</span>
          </div>
        </div>
      </div>

      <!-- NOUVEAU: Message d'erreur de permissions -->
      <div v-if="permissionError && !isCheckingPermissions" class="mb-6">
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Erreur de permissions</h3>
              <p class="mt-2 text-sm text-red-700">{{ permissionError }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- MODIFIÉ: Contenu principal affiché seulement si autorisé -->
      <div v-if="shouldShowContent">
        
        <!-- Header avec badge de protection -->
        <div class="mb-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Catégories de Produits</h1>
              <p class="mt-2 text-gray-600">Gérez les types de produits pour votre inventaire</p>
            </div>
            <!-- NOUVEAU: Badge indiquant la protection active -->
            <div class="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
              <svg class="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm font-medium text-green-800">Module protégé par usePageBlocker</span>
            </div>
          </div>
        </div>

        <!-- Formulaire d'ajout -->
        <div class="bg-white shadow rounded-lg mb-6">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-lg font-medium text-gray-900">Ajouter un nouveau type</h2>
          </div>
          <div class="p-6">
            <div class="flex space-x-4">
              <div class="flex-1">
                <input
                  v-model="newType"
                  type="text"
                  placeholder="Nom du type de produit"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  @keyup.enter="addProductType"
                />
              </div>
              <button
                :disabled="!newType.trim() || loading"
                class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                @click="addProductType"
              >
                <span v-if="loading">Ajout...</span>
                <span v-else>Ajouter</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Barre de recherche -->
        <div class="bg-white shadow rounded-lg mb-6">
          <div class="p-6">
            <div class="relative">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Rechercher un type de produit..."
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Liste des types -->
        <div class="bg-white shadow rounded-lg">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-lg font-medium text-gray-900">
              Types de produits ({{ filteredProductTypes.length }})
            </h2>
          </div>
          
          <div v-if="loading && productTypes.length === 0" class="p-6">
            <div class="flex items-center justify-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span class="ml-3 text-gray-600">Chargement des types...</span>
            </div>
          </div>

          <div v-else-if="error" class="p-6">
            <div class="text-center text-red-600">
              <p>{{ error }}</p>
              <button 
                class="mt-2 text-blue-600 hover:text-blue-700 underline"
                @click="fetchProductTypes"
              >
                Réessayer
              </button>
            </div>
          </div>

          <div v-else-if="filteredProductTypes.length === 0" class="p-6">
            <div class="text-center text-gray-500">
              <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A10.003 10.003 0 0124 26c4.21 0 7.813 2.602 9.288 6.286M30 14a6 6 0 11-12 0 6 6 0 0112 0zm12 6a4 4 0 11-8 0 4 4 0 018 0zm-28 0a4 4 0 11-8 0 4 4 0 018 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <h3 class="mt-2 text-sm font-medium text-gray-900">Aucun type trouvé</h3>
              <p class="mt-1 text-sm text-gray-500">
                {{ searchQuery ? 'Aucun résultat pour cette recherche' : 'Commencez par ajouter un type de produit' }}
              </p>
            </div>
          </div>

          <div v-else class="divide-y divide-gray-200">
            <div
              v-for="type in filteredProductTypes"
              :key="type.id"
              class="p-6 hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-medium text-gray-900">{{ type.name }}</h3>
                  <p class="text-sm text-gray-500">ID: {{ type.id }}</p>
                </div>
                <div class="flex space-x-2">
                  <button class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Modifier
                  </button>
                  <button class="text-red-600 hover:text-red-700 text-sm font-medium">
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- NOUVEAU: Footer informatif -->
        <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-blue-800">Protection active</h3>
              <p class="mt-1 text-sm text-blue-700">
                Cette page utilise la composable <code class="bg-blue-100 px-1 rounded">usePageBlocker('Stock')</code> 
                pour vérifier automatiquement les permissions d'accès au module Stock.
              </p>
            </div>
          </div>
        </div>

      </div>

      <!-- Message affiché si module chargé mais utilisateur pas encore chargé -->
      <div v-else-if="isLoadingUser" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        <p class="mt-4 text-gray-600">Chargement de votre profil...</p>
      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
</style>