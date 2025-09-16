<script setup>
// Imports
import { ref, onMounted, computed } from "vue";

// State variables
const productTypes = ref([]);
const newType = ref("");
const loading = ref(false);
const error = ref(null);
const searchQuery = ref("");

const isDeleteModalOpen = ref(false);
const isDeleting = ref(false);
const typeToDelete = ref(null);
const productsUsingType = ref([]);

const supabase = useSupabaseClient();
const toast = useToast();

// utilise la composable useCurrentUser pour récupérer les rôles de l'utilisateur
const { userRoles } = useCurrentUser();

// Computed properties
const filteredProductTypes = computed(() => {
  if (!searchQuery.value.trim()) {
    return productTypes.value;
  }
  return productTypes.value.filter((type) =>
    type.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// Fetch product types
const fetchProductTypes = async () => {
  loading.value = true;
  error.value = null;

  try {
    const { data, error: supabaseError } = await supabase
      .from("product_types")
      .select("*")
      .order("name", { ascending: true });

    if (supabaseError) throw supabaseError;

    productTypes.value = data;
  } catch (err) {
    error.value = err.message || "Erreur de chargement";
    toast.add({
      title: "Erreur",
      description: error.value,
      color: "red",
    });
  } finally {
    loading.value = false;
  }
};

// Add a new product type
const addProductType = async () => {
  if (!newType.value.trim()) {
    toast.add({
      title: "Erreur",
      description: "Le nom du type de produit est requis.",
      color: "red",
    });
    return;
  }

  const existingType = productTypes.value.find(
    (type) => type.name.toLowerCase() === newType.value.trim().toLowerCase()
  );
  if (existingType) {
    toast.add({
      title: "Erreur",
      description: "Ce type de produit existe déjà.",
      color: "red",
    });
    return;
  }

  try {
    const { error: insertError } = await supabase
      .from("product_types")
      .insert([{ name: newType.value.trim() }]);

    if (insertError) throw insertError;

    toast.add({
      title: "Succès",
      description: "Type de produit ajouté avec succès.",
      color: "green",
    });
    newType.value = "";
    await fetchProductTypes();
  } catch (err) {
    toast.add({
      title: "Erreur",
      description: err.message || "Erreur lors de l'ajout du type de produit.",
      color: "red",
    });
  }
};

// Open delete modal
const openDeleteModal = async (type) => {
  typeToDelete.value = type;

  // Vérifier s'il y a des produits qui utilisent ce type
  try {
    const { data: products, error: checkError } = await supabase
      .from("products_carreaux")
      .select("id, name, reference")
      .eq("type_produit", type.id);

    if (checkError) throw checkError;

    productsUsingType.value = products || [];
    isDeleteModalOpen.value = true;
  } catch (err) {
    toast.add({
      title: "Erreur",
      description:
        "Erreur lors de la vérification des produits associés: " + err.message,
      color: "red",
    });
  }
};

// Delete a product type
const deleteProductType = async () => {
  isDeleting.value = true;
  error.value = null;

  try {
    // Si des produits utilisent ce type, on ne peut pas supprimer
    if (productsUsingType.value.length > 0) {
      toast.add({
        title: "Impossible de supprimer",
        description: `${productsUsingType.value.length} produit(s) utilise(nt) encore ce type.`,
        color: "orange",
      });
      return;
    }

    const { error: deleteError } = await supabase
      .from("product_types")
      .delete()
      .eq("id", typeToDelete.value.id);

    if (deleteError) throw deleteError;

    toast.add({
      title: "Succès",
      description: "Type de produit supprimé avec succès.",
      color: "green",
    });
    await fetchProductTypes();
  } catch (err) {
    error.value = err.message || "Erreur de suppression.";
    toast.add({
      title: "Erreur",
      description: error.value,
      color: "red",
    });
  } finally {
    isDeleteModalOpen.value = false;
    isDeleting.value = false;
  }
};

// Initial fetch
onMounted(fetchProductTypes);
</script>

<template>
  <div class="container mx-auto px-4 py-2">
    <!-- Blocage simple pour les employés -->
    <div v-if="userRoles?.includes('employe')" class="text-center py-12">
      <UIcon
        name="i-heroicons-exclamation-triangle"
        class="w-16 h-16 text-red-500 mx-auto mb-4"
      />
      <h2 class="text-xl font-bold text-red-600 mb-2">Accès refusé</h2>
      <p class="text-gray-600 mb-4">
        Cette action est réservée aux administrateurs et magasiniers.
      </p>
      <UButton label="Retour" to="/stock" />
    </div>

    <!-- Contenu normal -->
    <div v-else>
      <h1 class="text-2xl font-bold mb-6 text-gray-800">
        Gestion des types de produits
      </h1>

      <!-- Barre de recherche et ajout -->
      <div class="mb-6 space-y-4">
        <UInput
          v-model="searchQuery"
          placeholder="Rechercher un type de produit..."
          icon="i-heroicons-magnifying-glass"
          class="w-full"
        />

        <div class="flex items-center gap-4">
          <UInput
            v-if="userRoles.includes('admin')"
            v-model="newType"
            placeholder="Ajouter un nouveau type de produit"
            class="flex-grow"
            @keyup.enter="addProductType"
          />
          <UButton
            v-if="userRoles.includes('admin')"
            class="flex-shrink-0"
            variant="solid"
            icon="i-heroicons-plus-circle-20-solid"
            label="Ajouter"
            color="primary"
            :disabled="loading || !newType.trim()"
            @click="addProductType"
          />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center items-center py-8">
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"
        />
      </div>

      <!-- Error -->
      <div
        v-if="error"
        class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded"
      >
        <p>{{ error }}</p>
      </div>

      <!-- Product Types List -->
      <div v-if="!loading && filteredProductTypes.length" class="space-y-4">
        <div class="text-sm text-gray-600 mb-2">
          {{ filteredProductTypes.length }} type{{
            filteredProductTypes.length > 1 ? "s" : ""
          }}
          trouvé{{ filteredProductTypes.length > 1 ? "s" : "" }}
          {{ searchQuery ? ` pour "${searchQuery}"` : "" }}
        </div>

        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="type in filteredProductTypes"
            :key="type.id"
            class="flex justify-between items-center bg-white shadow-sm border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div class="flex-1">
              <span class="text-gray-800 font-medium">{{ type.name }}</span>
            </div>
            <button
              v-if="userRoles.includes('admin')"
              class="ml-4 text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
              :title="`Supprimer ${type.name}`"
              @click="openDeleteModal(type)"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- No Product Types -->
      <div
        v-if="!loading && productTypes.length === 0"
        class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center"
      >
        <svg
          class="w-16 h-16 text-gray-400 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
        <p class="text-gray-500 text-lg mb-2">
          Aucun type de produit disponible.
        </p>
        <p class="text-gray-400 text-sm">
          Commencez par ajouter votre premier type de produit ci-dessus.
        </p>
      </div>

      <!-- No Search Results -->
      <div
        v-if="
          !loading &&
          productTypes.length > 0 &&
          filteredProductTypes.length === 0
        "
        class="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center"
      >
        <svg
          class="w-16 h-16 text-yellow-400 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <p class="text-yellow-700 text-lg mb-2">
          Aucun résultat pour "{{ searchQuery }}"
        </p>
        <p class="text-yellow-600 text-sm">
          Essayez avec un autre terme de recherche.
        </p>
        <UButton
          label="Effacer la recherche"
          variant="ghost"
          color="yellow"
          size="sm"
          class="mt-3"
          @click="searchQuery = ''"
        />
      </div>

      <!-- Modal de confirmation de suppression -->
      <UModal
        v-model:open="isDeleteModalOpen"
        :title="
          productsUsingType.length > 0
            ? 'Impossible de supprimer'
            : 'Confirmer la suppression'
        "
        :description="
          productsUsingType.length > 0
            ? 'Ce type de produit est encore utilisé'
            : 'Êtes-vous sûr de vouloir supprimer ce type de produit ?'
        "
      >
        <template #body>
          <div class="space-y-3">
            <div class="bg-red-50 border border-red-200 rounded-lg p-3">
              <p class="font-medium text-red-900">{{ typeToDelete?.name }}</p>
            </div>

            <!-- Si des produits utilisent ce type -->
            <div v-if="productsUsingType.length > 0" class="space-y-3">
              <div class="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p class="text-sm font-medium text-orange-900 mb-2">
                  ⚠️ Ce type de produit est utilisé par
                  {{ productsUsingType.length }} produit(s) :
                </p>
                <ul
                  class="text-xs text-orange-700 max-h-32 overflow-y-auto space-y-1"
                >
                  <li
                    v-for="product in productsUsingType"
                    :key="product.id"
                    class="flex justify-between"
                  >
                    <span>{{ product.name }}</span>
                    <span class="font-mono text-gray-500">{{
                      product.reference || "Sans réf."
                    }}</span>
                  </li>
                </ul>
              </div>
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p class="text-sm text-blue-700">
                  💡 <strong>Solution :</strong> Modifiez ou supprimez d'abord
                  ces produits, puis revenez supprimer ce type.
                </p>
              </div>
            </div>

            <!-- Si pas de produits utilisant ce type -->
            <div v-else>
              <p class="text-sm text-red-600 font-medium">
                ⚠️ Cette action est irréversible.
              </p>
            </div>
          </div>
        </template>

        <template #footer="{ close }">
          <div class="flex justify-end space-x-3">
            <UButton
              label="Fermer"
              variant="ghost"
              color="gray"
              @click="close"
            />
            <UButton
              v-if="productsUsingType.length === 0"
              label="Supprimer"
              color="red"
              :loading="isDeleting"
              @click="deleteProductType"
            />
            <UButton
              v-else
              label="Aller à la gestion des produits"
              color="primary"
              @click="navigateTo('/stock')"
            />
          </div>
        </template>
      </UModal>
    </div>
  </div>
</template>
