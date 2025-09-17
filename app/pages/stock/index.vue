<!-- eslint-disable vue/html-self-closing -->
<!-- eslint-disable vue/html-self-closing -->
<!-- eslint-disable vue/html-self-closing -->
<script setup>
// Helper pour valider l'id société
// Imports

// utilise la composable useCurrentUser pour récupérer les rôles de l'utilisateur
import { useCurrentUser } from "../../composables/useCurrentUser";
import { useCompanySettings } from "../../composables/useCompanySettings";
function isValidCompanyId(id) {
  return typeof id === "string" && id.trim() !== "";
}

const { settings: companySettings, fetchCompanySettings } =
  useCompanySettings();

onMounted(async () => {
  if (isLoadingUser.value) {
    await loadCurrentUser();
  }
  if (companyId.value) await fetchCompanySettings(companyId.value);
});

const products = ref([]);
const loading = ref(true);
const error = ref(null);

// Variables pour les filtres
const availableTypes = ref([]);
const availableUnites = ref([]);
const productTypes = ref([]);
const {
  userRoles: _userRoles,
  companyId,
  isLoadingUser,
  loadCurrentUser,
} = useCurrentUser();
const userRoles = computed(() =>
  Array.isArray(_userRoles.value) ? _userRoles.value : []
);

onMounted(async () => {
  if (isLoadingUser.value) {
    await loadCurrentUser();
  }
  if (!isValidCompanyId(companyId.value)) {
    const stop = watch(
      () => companyId.value,
      async (val) => {
        if (isValidCompanyId(val)) {
          await fetchProducts();
          stop();
        }
      }
    );
  } else {
    await fetchProducts();
  }
});
// États des filtres
const filters = ref({
  search: "",
  type: "all",
  unite: "all",
  stockStatus: "all",
  priceMin: "",
  priceMax: "",
  showCarreaux: true,
  showOthers: true,
  showHidden: false, // Nouveau filtre pour afficher les produits masqués
});

// État pour afficher/masquer la section des filtres
const showFilters = ref(false);

const supabase = useSupabaseClient();
const toast = useToast();

// Format monétaire
const formatCurrency = (value) => {
  const currency = companySettings?.value?.currency;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
};

// Récupérer les types de produits depuis la table product_types
const fetchProductTypes = async () => {
  try {
    if (!supabase) throw new Error("Supabase client non initialisé");
    if (!isValidCompanyId(companyId.value)) {
      if (isLoadingUser.value) {
        error.value = "Chargement du profil utilisateur...";
      } else {
        error.value =
          "Aucune société liée à votre profil utilisateur ou identifiant société invalide. Contactez un administrateur.";
      }
      loading.value = false;
      return;
    }

    const { data, error: typesError } = await supabase
      .from("product_types")
      .select("id, name")
      .eq("company_id", companyId.value)
      .order("name", { ascending: true });

    if (typesError) throw typesError;

    productTypes.value = data || [];
    availableTypes.value =
      data?.map((type) => ({
        id: type.id,
        name: type.name,
      })) || [];
  } catch (err) {
    console.error("Erreur lors du chargement des types:", err);
    availableTypes.value = [];
  }
};

// Chargement
const fetchProducts = async () => {
  loading.value = true;
  error.value = null;

  try {
    if (!supabase) throw new Error("Supabase client non initialisé");
    if (!isValidCompanyId(companyId.value)) {
      error.value =
        "Aucune société sélectionnée ou identifiant société invalide. Veuillez choisir une société avant d'afficher le stock.";
      loading.value = false;
      return;
    }

    // Récupérer les produits avec jointure sur la table product_types
    const { data, error: supabaseError } = await supabase
      .from("products_carreaux")
      .select(
        `
        *,
        product_types!inner(id, name)
      `
      )
      .eq("company_id", companyId.value)
      .order("name", { ascending: true });

    if (supabaseError) throw supabaseError;

    // Récupérer tous les types disponibles depuis product_types
    await fetchProductTypes();

    // Extraire les unités uniques pour les filtres
    const unites = [
      ...new Set((data || []).map((p) => p.unite).filter(Boolean)),
    ];
    availableUnites.value = unites.sort();

    // Pour chaque produit, récupérer l'URL signée si image_url existe
    const productsWithImages = await Promise.all(
      (data || []).map(async (p) => {
        let signedUrl = "";
        if (p.image_url) {
          signedUrl = await getSignedImageUrl(p.image_url);
        }
        // Si le stock est à 0 et le produit n'est pas déjà masqué, on le masque automatiquement
        let isHidden = p.is_hidden === true;
        if (parseFloat(p.stock) === 0 && !isHidden) {
          // Mise à jour en base pour masquer le produit
          await supabase
            .from("products_carreaux")
            .update({ is_hidden: true })
            .eq("id", p.id);
          isHidden = true;
        }
        return {
          ...p,
          stock: parseFloat(p.stock) || 0,
          unite: p.unite || "pièce",
          longueur: parseFloat(p.longueur) || 0,
          largeur: parseFloat(p.largeur) || 0,
          type: p.product_types?.name || p.type_produit || "carreau",
          type_produit: p.product_types?.name || p.type_produit || "carreau",
          type_id: p.product_types?.id || null,
          price: parseFloat(p.price) || 0,
          conditionnement: parseFloat(p.conditionnement) || 1,
          nbr_pieces: parseFloat(p.nbr_pieces) || 0,
          signed_image_url: signedUrl,
          is_hidden: isHidden,
        };
      })
    );
    products.value = productsWithImages;
  } catch (err) {
    error.value = err.message || "Erreur de chargement";
    toast.add({
      title: "Erreur",
      description: error.value,
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
      timeout: 5000,
    });
  } finally {
    loading.value = false;
  }
};

// Fonction pour réinitialiser les filtres
const resetFilters = () => {
  filters.value = {
    search: "",
    type: "all",
    unite: "all",
    stockStatus: "all",
    priceMin: "",
    priceMax: "",
    showCarreaux: true,
    showOthers: true,
    showHidden: false,
  };
};

// Fonction pour déterminer le statut du stock
const getStockStatus = (product) => {
  if (product.stock === 0) return "rupture";
  if (product.stock <= 5) return "bas"; // Stock bas si <= 5 unités
  return "normal";
};

// Computed pour les produits filtrés (hors produits masqués)
const filteredProducts = computed(() => {
  let filtered = [...products.value];

  // Exclure les produits masqués
  filtered = filtered.filter((product) => !product.is_hidden);

  // Filtre par recherche
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase();
    filtered = filtered.filter(
      (product) =>
        product.name.toLowerCase().includes(search) ||
        (product.type_produit &&
          product.type_produit.toLowerCase().includes(search))
    );
  }

  // Filtre par type de produit
  if (filters.value.type && filters.value.type !== "all") {
    filtered = filtered.filter(
      (product) => product.type_produit === filters.value.type
    );
  }

  // Filtre par unité
  if (filters.value.unite && filters.value.unite !== "all") {
    filtered = filtered.filter(
      (product) => product.unite === filters.value.unite
    );
  }

  // Filtre par statut du stock
  if (filters.value.stockStatus && filters.value.stockStatus !== "all") {
    filtered = filtered.filter(
      (product) => getStockStatus(product) === filters.value.stockStatus
    );
  }

  // Filtre par prix
  if (filters.value.priceMin) {
    filtered = filtered.filter(
      (product) => product.price >= parseFloat(filters.value.priceMin)
    );
  }
  if (filters.value.priceMax) {
    filtered = filtered.filter(
      (product) => product.price <= parseFloat(filters.value.priceMax)
    );
  }

  return filtered;
});

// Computed pour les produits masqués
const hiddenProducts = computed(() => {
  if (!filters.value.showHidden) return [];
  let filtered = products.value.filter((product) => product.is_hidden);
  // On applique aussi la recherche et les filtres principaux
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase();
    filtered = filtered.filter(
      (product) =>
        product.name.toLowerCase().includes(search) ||
        (product.type_produit &&
          product.type_produit.toLowerCase().includes(search))
    );
  }
  if (filters.value.type && filters.value.type !== "all") {
    filtered = filtered.filter(
      (product) => product.type_produit === filters.value.type
    );
  }
  if (filters.value.unite && filters.value.unite !== "all") {
    filtered = filtered.filter(
      (product) => product.unite === filters.value.unite
    );
  }
  if (filters.value.stockStatus && filters.value.stockStatus !== "all") {
    filtered = filtered.filter(
      (product) => getStockStatus(product) === filters.value.stockStatus
    );
  }
  if (filters.value.priceMin) {
    filtered = filtered.filter(
      (product) => product.price >= parseFloat(filters.value.priceMin)
    );
  }
  if (filters.value.priceMax) {
    filtered = filtered.filter(
      (product) => product.price <= parseFloat(filters.value.priceMax)
    );
  }
  return filtered;
});
// Modale récupération produit masqué
const isUnhideModalOpen = ref(false);
const productToUnhide = ref(null);
const newStockValue = ref(0);
const isUnhiding = ref(false);

function openUnhideModal(product) {
  productToUnhide.value = product;
  newStockValue.value = product.stock || 0;
  isUnhideModalOpen.value = true;
}

const handleUnhideProduct = async () => {
  if (!productToUnhide.value) return;
  isUnhiding.value = true;
  try {
    if (!supabase) throw new Error("Supabase client non initialisé");
    const stock = parseFloat(newStockValue.value);
    if (isNaN(stock) || stock < 0) throw new Error("Stock invalide");
    // Si stock > 0, on désmasque et met à jour le stock
    const updateData = { stock };
    if (stock > 0) updateData.is_hidden = false;
    const { error: unhideError } = await supabase
      .from("products_carreaux")
      .update(updateData)
      .eq("id", productToUnhide.value.id);
    if (unhideError) throw unhideError;
    await fetchProducts();
    toast.add({
      title: "Produit modifié",
      description:
        stock > 0
          ? `Le produit '${productToUnhide.value.name}' est maintenant visible avec un stock de ${stock}.`
          : `Le stock du produit '${productToUnhide.value.name}' a été mis à jour à 0 (toujours masqué).`,
      icon: stock > 0 ? "i-heroicons-eye" : "i-heroicons-eye-slash",
      color: stock > 0 ? "green" : "gray",
      timeout: 4000,
    });
    isUnhideModalOpen.value = false;
    productToUnhide.value = null;
  } catch (err) {
    toast.add({
      title: "Erreur",
      description: err.message || "Erreur lors de la modification du produit.",
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
      timeout: 5000,
    });
  } finally {
    isUnhiding.value = false;
  }
};
// Fonction pour masquer un produit
// (Supprimé car non utilisé)

// Computed pour séparer les carreaux des autres produits (hors masqués)
const carreauxProducts = computed(() => {
  if (!filters.value.showCarreaux) return [];
  return filteredProducts.value.filter((product) =>
    ["carreau", "carrelage", "Carreau"].some(
      (type) =>
        product.type_produit &&
        product.type_produit.toLowerCase().includes(type.toLowerCase())
    )
  );
});

const otherProducts = computed(() => {
  if (!filters.value.showOthers) return [];
  return filteredProducts.value.filter(
    (product) =>
      product.type_produit !== "carreau" &&
      product.type_produit !== "carrelage" &&
      product.type_produit !== "Carreau"
  );
});

// Computed pour le nombre de produits par catégorie
const productCounts = computed(() => ({
  carreaux: carreauxProducts.value.length,
  others: otherProducts.value.length,
  hidden: hiddenProducts.value.length,
  total: filteredProducts.value.length,
}));

// Computed pour vérifier si des filtres sont actifs
const hasActiveFilters = computed(() => {
  return (
    filters.value.search !== "" ||
    filters.value.type !== "all" ||
    filters.value.unite !== "all" ||
    filters.value.stockStatus !== "all" ||
    filters.value.priceMin !== "" ||
    filters.value.priceMax !== "" ||
    !filters.value.showCarreaux ||
    !filters.value.showOthers ||
    filters.value.showHidden
  );
});

// Auto-expand filters if active
watch(hasActiveFilters, (newValue) => {
  if (newValue && !showFilters.value) {
    showFilters.value = true;
  }
});

// Fonction pour obtenir la classe CSS selon le statut du stock
const getStockStatusClass = (product) => {
  const status = getStockStatus(product);
  switch (status) {
    case "rupture":
      return "text-red-600 font-semibold";
    case "bas":
      return "text-orange-600 font-medium";
    default:
      return "text-green-600";
  }
};

// Fonction pour obtenir l'icône selon le statut du stock
const getStockStatusIcon = (product) => {
  const status = getStockStatus(product);
  switch (status) {
    case "rupture":
      return "i-heroicons-exclamation-triangle";
    case "bas":
      return "i-heroicons-exclamation-circle";
    default:
      return "i-heroicons-check-circle";
  }
};

// Fonction pour ouvrir la modale de suppression
function openDeleteModal(product) {
  isDeleteModalOpen.value = true;
  productToDelete.value = product;
}

const isDeleteModalOpen = ref(false);
const isDeleting = ref(false);
const productToDelete = ref(null);
const handleDelete = async () => {
  isDeleting.value = true;
  error.value = null;

  try {
    if (!supabase) throw new Error("Supabase client non initialisé");

    const { error: deleteError } = await supabase
      .from("products_carreaux")
      .delete()
      .eq("id", productToDelete.value.id);

    if (deleteError) throw deleteError;

    // Rafraîchir la liste des produits
    await fetchProducts();

    toast.add({
      title: "Succès",
      description: "Produit supprimé avec succès.",
      icon: "i-heroicons-check-circle",
      color: "green",
      timeout: 5000,
    });
  } catch (err) {
    error.value = err.message || "Erreur de suppression";
    toast.add({
      title: "Erreur",
      description: error.value,
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
      timeout: 5000,
    });
  } finally {
    isDeleteModalOpen.value = false;
    isDeleting.value = false;
  }
};

// Fonction pour obtenir l'URL signée d'une image Supabase Storage
const getSignedImageUrl = async (imagePath) => {
  if (!imagePath) return "";
  try {
    // On retire le préfixe éventuel 'product-images/' si déjà présent
    const cleanPath = imagePath.startsWith("product-images/")
      ? imagePath
      : `product-images/${imagePath}`;
    const { data, error } = await supabase.storage
      .from("product-images")
      .createSignedUrl(cleanPath, 60 * 60 * 24); // 24h
    if (error || !data?.signedUrl) return "";
    return data.signedUrl;
  } catch {
    return "";
  }
};

// Initialisation
onMounted(async () => {
  await Promise.all([
    fetchProducts(),
    new Promise((resolve) => setTimeout(resolve, 500)),
  ]);
});
</script>

<template>
  <div class="container mx-auto px-4 py-2">
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Gestion du stock</h1>

    <div
      class="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4"
    >
      <UButton
        class="text-sm text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
        :disabled="loading"
        icon="i-lucide-refresh-cw"
        label="Actualiser"
        :icon-size="20"
        :class="{ 'animate-spin': loading }"
        color="primary"
        @click="fetchProducts"
      />

      <UButton
        v-if="userRoles.includes('admin') || userRoles.includes('magasinier')"
        class="text-sm text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
        icon="i-lucide-plus"
        color="success"
        :icon-size="20"
        :icon-color="'currentColor'"
        to="/stock/add"
        label="Ajouter un produit"
      />
    </div>

    <!-- Section des filtres -->
    <div class="bg-white rounded-lg shadow-md mb-6">
      <!-- Header cliquable -->
      <div
        class="p-4 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg"
        @click="showFilters = !showFilters"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-funnel" class="w-5 h-5" />
            <h2 class="text-lg font-semibold text-gray-700">
              Filtres & Recherche
            </h2>
            <UBadge
              v-if="hasActiveFilters"
              color="orange"
              variant="soft"
              size="xs"
            >
              Actifs
            </UBadge>
          </div>
          <div class="flex items-center gap-3">
            <UBadge color="blue" variant="soft">
              {{ productCounts.total }} produit{{
                productCounts.total > 1 ? "s" : ""
              }}
            </UBadge>
            <UIcon
              :name="
                showFilters
                  ? 'i-heroicons-chevron-up'
                  : 'i-heroicons-chevron-down'
              "
              class="w-5 h-5 text-gray-500 transition-transform duration-200"
            />
          </div>
        </div>
      </div>

      <!-- Contenu des filtres - Collapsible -->
      <div v-show="showFilters" class="px-6 pb-6 border-t border-gray-100">
        <!-- Ligne 1: Recherche et boutons de catégorie -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 mt-4">
          <div class="md:col-span-2 flex gap-2">
            <UInput
              v-model="filters.search"
              placeholder="Rechercher par nom ou type..."
              icon="i-heroicons-magnifying-glass"
              size="md"
              class="w-full md:w-[400px] lg:w-[600px]"
            />
            <UInput
              v-model="filters.reference"
              placeholder="Rechercher une référence..."
              icon="i-heroicons-magnifying-glass"
              size="sm"
              class="w-full"
            />
          </div>
          <div class="flex gap-2">
            <UButton
              v-if="filters.showCarreaux"
              variant="solid"
              color="blue"
              size="sm"
              icon="i-heroicons-squares-2x2"
              @click="filters.showCarreaux = !filters.showCarreaux"
            >
              Carreaux
              <UBadge color="blue" variant="soft">{{
                productCounts.carreaux
              }}</UBadge>
            </UButton>

            <UButton
              v-if="filters.showOthers"
              variant="solid"
              color="green"
              size="sm"
              icon="i-heroicons-cube-transparent"
              @click="filters.showOthers = !filters.showOthers"
            >
              Autres produits
              <UBadge color="green" variant="soft">{{
                productCounts.others
              }}</UBadge>
            </UButton>
          </div>
        </div>

        <!-- Ligne 2: Filtres avancés -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <USelect
            v-model="filters.type"
            :items="[
              { label: 'Tous les types', value: 'all' },
              ...availableTypes.map((type) => ({
                label: type.name,
                value: type.name,
              })),
            ]"
            placeholder="Type de produit"
            size="sm"
          />

          <USelect
            v-model="filters.unite"
            :items="[
              { label: 'Toutes les unités', value: 'all' },
              ...availableUnites.map((unite) => ({
                label: unite,
                value: unite,
              })),
            ]"
            placeholder="Unité"
            size="sm"
          />

          <USelect
            v-model="filters.stockStatus"
            :items="[
              { label: 'Tous les stocks', value: 'all' },
              { label: 'En stock', value: 'normal' },
              { label: 'Stock bas', value: 'bas' },
              { label: 'Rupture', value: 'rupture' },
            ]"
            placeholder="État du stock"
            size="sm"
          />

          <UInput
            v-model="filters.priceMin"
            type="number"
            :placeholder="`Prix min (${companySettings?.currency})`"
            size="sm"
            step="0.01"
          />

          <UInput
            v-model="filters.priceMax"
            type="number"
            :placeholder="`Prix max (${companySettings?.currency})`"
            size="sm"
            step="0.01"
          />

          <UCheckbox
            v-model="filters.showHidden"
            label="Afficher les produits en rupture de stock"
            class="mt-2 lg:mt-0"
          />
        </div>
        <!-- SECTION PRODUITS MASQUÉS -->
        <div
          v-if="!loading && hiddenProducts.length && filters.showHidden"
          class="mb-8"
        >
          <div class="bg-gray-100 p-4 rounded-t-lg border border-gray-300">
            <h2 class="text-xl font-bold text-gray-700 flex items-center gap-2">
              <UIcon name="i-heroicons-eye-slash" class="w-6 h-6" />
              Produits en rupture de stock
              <UBadge color="gray" variant="soft">{{
                productCounts.hidden
              }}</UBadge>
            </h2>
          </div>
          <div class="hidden sm:block overflow-x-auto shadow-md">
            <table class="min-w-full bg-white w-full">
              <thead class="bg-gray-200">
                <tr>
                  <th
                    class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase"
                  >
                    Photo
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase"
                  >
                    Nom
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase"
                  >
                    Reference
                  </th>
                  <th
                    class="px-6 py-3 text-xs font-medium text-gray-700 uppercase"
                  >
                    Stock
                  </th>
                  <th
                    class="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase"
                  >
                    Type
                  </th>
                  <th
                    class="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase"
                  >
                    Prix
                  </th>
                  <th
                    v-if="userRoles.includes('admin')"
                    class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr
                  v-for="product in hiddenProducts"
                  :key="product.id"
                  class="hover:bg-gray-50"
                >
                  <td class="px-6 py-4 text-sm text-center">
                    <div v-if="product.signed_image_url">
                      <a :href="product.signed_image_url" target="_blank">
                        <img
                          :src="product.signed_image_url"
                          alt="Photo"
                          class="w-23 h-22 object-cover rounded shadow mx-auto"
                        >
                      </a>
                    </div>
                    <div v-else class="text-gray-400 italic">Aucune image</div>
                  </td>
                  <td class="px-6 py-4 text-sm font-medium text-gray-900">
                    {{ product.name }}
                  </td>
                  <td class="px-6 py-4 text-sm font-medium text-gray-900">
                    {{ product.reference }}
                  </td>
                  <td
                    class="px-6 py-4 text-sm text-right flex items-center gap-1"
                    :class="getStockStatusClass(product)"
                  >
                    <UIcon
                      :name="getStockStatusIcon(product)"
                      class="w-4 h-4"
                    />
                    {{ product.stock }} {{ product.unite }}
                  </td>
                  <td class="px-6 py-4 text-sm text-right text-gray-500">
                    {{ product.type_produit }}
                  </td>
                  <td class="px-6 py-4 text-sm text-right text-gray-500">
                    {{ formatCurrency(product.price) }}
                  </td>
                  <td
                    v-if="userRoles.includes('admin')"
                    class="px-6 py-4 text-sm text-center"
                  >
                    <NuxtLink
                      :to="`/stock/edit/${product.id}`"
                      class="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                    >
                      <Icon name="material-symbols:edit" class="text-lg" />
                    </NuxtLink>
                    <UButton
                      color="green"
                      variant="soft"
                      icon="i-heroicons-eye"
                      size="sm"
                      @click="openUnhideModal(product)"
                      >Récupérer</UButton
                    >
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Mobile - Produits masqués -->
          <div class="sm:hidden space-y-4 mt-4">
            <div
              v-for="product in hiddenProducts"
              :key="product.id"
              class="bg-white shadow rounded-lg p-4 border-l-4 border-gray-400"
            >
              <h3
                class="font-semibold text-gray-800 mb-2 flex items-center gap-2"
              >
                <UIcon
                  name="i-heroicons-eye-slash"
                  class="w-4 h-4 text-gray-600"
                />
                {{ product.name }}
              </h3>
              <div
                v-if="product.signed_image_url"
                class="mb-2 flex justify-center"
              >
                <a :href="product.signed_image_url" target="_blank">
                  <img
                    :src="product.signed_image_url"
                    alt="Photo"
                    class="max-h-24 rounded shadow"
                  >
                </a>
              </div>
              <div v-else class="text-gray-400 italic text-center mb-2">
                Aucune image
              </div>
              <div class="space-y-1 text-sm text-gray-600">
                <p
                  class="flex items-center gap-1"
                  :class="getStockStatusClass(product)"
                >
                  <UIcon :name="getStockStatusIcon(product)" class="w-4 h-4" />
                  Stock : {{ product.stock }} {{ product.unite }}
                </p>
                <p>Prix : {{ formatCurrency(product.price) }}</p>
                <p>Type : {{ product.type_produit }}</p>
              </div>
              <div
                v-if="userRoles.includes('admin')"
                class="flex justify-end gap-2 mt-3"
              >
                <UButton
                  color="green"
                  variant="soft"
                  icon="i-heroicons-eye"
                  size="sm"
                  @click="openUnhideModal(product)"
                  >Récupérer</UButton
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Bouton reset -->
        <div class="mt-4 flex justify-end">
          <UButton
            variant="outline"
            color="gray"
            size="sm"
            icon="i-heroicons-arrow-path"
            @click="resetFilters"
          >
            Réinitialiser
          </UButton>
        </div>
      </div>
    </div>

    <!-- Loading -->
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

    <!-- SECTION CARREAUX - Desktop -->
    <div
      v-if="!loading && carreauxProducts.length && filters.showCarreaux"
      class="mb-8"
    >
      <div class="bg-blue-50 p-4 rounded-t-lg border border-blue-200">
        <h2 class="text-xl font-bold text-blue-800 flex items-center gap-2">
          <UIcon name="i-heroicons-squares-2x2" class="w-6 h-6" />
          Carreaux & Carrelages
          <UBadge color="blue" variant="soft">{{
            carreauxProducts.length
          }}</UBadge>
        </h2>
      </div>

      <div class="hidden sm:block overflow-x-auto shadow-md">
        <table class="min-w-full bg-white w-full">
          <thead class="bg-blue-100">
            <tr>
              <th
                class="px-6 py-3 text-center text-xs font-medium text-blue-700 uppercase"
              >
                Photo
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase"
              >
                Nom
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-blue-700 uppercase"
              >
                Reference
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-blue-700 uppercase"
              >
                Stock
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-blue-700 uppercase"
              >
                Type
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-blue-700 uppercase hidden md:table-cell"
              >
                Taille (cm²)
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-blue-700 uppercase"
              >
                Prix
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-blue-700 uppercase"
              >
                Cartons
              </th>
              <th
                v-if="userRoles.includes('admin')"
                class="px-6 py-3 text-center text-xs font-medium text-blue-700 uppercase"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="product in carreauxProducts"
              :key="product.id"
              class="hover:bg-blue-50"
            >
              <td class="px-6 py-4 text-sm text-center">
                <div v-if="product.signed_image_url">
                  <a :href="product.signed_image_url" target="_blank">
                    <img
                      :src="product.signed_image_url"
                      alt="Photo"
                      class="w-23 h-22 object-cover rounded shadow mx-auto"
                    >
                  </a>
                </div>
                <div v-else class="text-gray-400 italic">Aucune image</div>
              </td>
              <td class="px-6 py-4 text-sm font-medium text-gray-900">
                {{ product.name }}
              </td>
              <td class="px-6 py-4 text-sm text-right text-gray-500">
                {{ product.reference }}
              </td>
              <td
                class="px-6 py-4 text-sm text-right flex items-center justify-end gap-1"
                :class="getStockStatusClass(product)"
              >
                <UIcon :name="getStockStatusIcon(product)" class="w-4 h-4" />
                {{ product.stock }} {{ product.unite }}
              </td>
              <td class="px-6 py-4 text-sm text-right text-gray-500">
                {{ product.type_produit }}
              </td>
              <td
                class="px-6 py-4 text-sm text-right text-gray-500 hidden md:table-cell"
              >
                {{ product.longueur }} * {{ product.largeur }} cm²
              </td>
              <td class="px-6 py-4 text-sm text-right text-gray-500">
                {{ formatCurrency(product.price) }}
              </td>
              <td class="px-6 py-4 text-sm text-right text-gray-500">
                <CartonCalculator :product="product" />
              </td>
              <td
                v-if="userRoles.includes('admin')"
                class="px-6 py-4 text-sm text-center"
              >
                <div class="flex justify-center space-x-2">
                  <NuxtLink
                    :to="`/stock/edit/${product.id}`"
                    class="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                  >
                    <Icon name="material-symbols:edit" class="text-lg" />
                  </NuxtLink>
                  <button
                    class="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                    @click="openDeleteModal(product)"
                  >
                    <Icon name="material-symbols:delete" class="text-lg" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile - Carreaux -->
      <div class="sm:hidden space-y-4 mt-4">
        <div
          v-for="product in carreauxProducts"
          :key="product.id"
          class="bg-white shadow rounded-lg p-4 border-l-4 border-blue-400"
        >
          <h3 class="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <UIcon
              name="i-heroicons-squares-2x2"
              class="w-4 h-4 text-blue-600"
            />
            {{ product.name }}
          </h3>
          <div v-if="product.signed_image_url" class="mb-2 flex justify-center">
            <a :href="product.signed_image_url" target="_blank">
              <img
                :src="product.signed_image_url"
                alt="Photo"
                class="max-h-24 rounded shadow"
              >
            </a>
          </div>
          <div v-else class="text-gray-400 italic text-center mb-2">
            Aucune image
          </div>
          <div class="space-y-1 text-sm text-gray-600">
            <p
              class="flex items-center gap-1"
              :class="getStockStatusClass(product)"
            >
              <UIcon :name="getStockStatusIcon(product)" class="w-4 h-4" />
              Stock : {{ product.stock }} {{ product.unite }}
            </p>
            <p>Prix : {{ formatCurrency(product.price) }}</p>
            <p>Type : {{ product.type_produit }}</p>
            <p><CartonCalculator :product="product" /></p>
          </div>
          <div class="flex justify-end gap-2 mt-3">
            <NuxtLink
              :to="`/stock/edit/${product.id}`"
              class="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
            >
              <Icon name="material-symbols:edit" class="text-lg" />
            </NuxtLink>
            <button
              class="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
              @click="openDeleteModal(product)"
            >
              <Icon name="material-symbols:delete" class="text-lg" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- SECTION AUTRES PRODUITS - Desktop -->
    <div
      v-if="!loading && otherProducts.length && filters.showOthers"
      class="mb-8"
    >
      <div class="bg-green-50 p-4 rounded-t-lg border border-green-200">
        <h2 class="text-xl font-bold text-green-800 flex items-center gap-2">
          <UIcon name="i-heroicons-cube" class="w-6 h-6" />
          Autres Produits
          <UBadge color="green" variant="soft">{{
            otherProducts.length
          }}</UBadge>
        </h2>
      </div>

      <div class="hidden sm:block overflow-x-auto shadow-md">
        <table class="min-w-full bg-white w-full">
          <thead class="bg-green-100">
            <tr>
              <th
                class="px-6 py-3 text-center text-xs font-medium text-green-700 uppercase"
              >
                Photo
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase"
              >
                Nom
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase"
              >
                Reference
              </th>
              <th
                class="px-6 py-3 text-xs font-medium text-green-700 uppercase"
              >
                Stock
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-green-700 uppercase"
              >
                Type
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-green-700 uppercase"
              >
                Prix
              </th>
              <th
                v-if="userRoles.includes('admin')"
                class="px-6 py-3 text-center text-xs font-medium text-green-700 uppercase"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="product in otherProducts"
              :key="product.id"
              class="hover:bg-green-50"
            >
              <td class="px-6 py-4 text-sm text-center">
                <div v-if="product.signed_image_url">
                  <a :href="product.signed_image_url" target="_blank">
                    <img
                      :src="product.signed_image_url"
                      alt="Photo"
                      class="w-23 h-22 object-cover rounded shadow mx-auto"
                    />
                  </a>
                </div>
                <div v-else class="text-gray-400 italic">Aucune image</div>
              </td>
              <td
                class="px-6 py-4 flex items-center text-sm font-medium text-gray-900"
              >
                {{ product.name }}
              </td>
              <td class="px-6 py-4 text-sm font-medium text-gray-900">
                {{ product.reference }}
              </td>
              <td
                class="px-6 py-4 text-sm text-right flex items-center gap-1"
                :class="getStockStatusClass(product)"
              >
                <UIcon :name="getStockStatusIcon(product)" class="w-4 h-4" />
                {{ product.stock }} {{ product.unite }}
              </td>
              <td class="px-6 py-4 text-sm text-right text-gray-500">
                {{ product.type_produit }}
              </td>
              <td class="px-6 py-4 text-sm text-right text-gray-500">
                {{ formatCurrency(product.price) }}
              </td>
              <td
                v-if="userRoles.includes('admin')"
                class="px-6 py-4 text-sm text-center"
              >
                <div class="flex justify-center space-x-2">
                  <NuxtLink
                    :to="`/stock/edit/${product.id}`"
                    class="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                  >
                    <Icon name="material-symbols:edit" class="text-lg" />
                  </NuxtLink>
                  <button
                    class="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                    @click="openDeleteModal(product)"
                  >
                    <Icon name="material-symbols:delete" class="text-lg" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile - Autres produits -->
      <div class="sm:hidden space-y-4 mt-4">
        <div
          v-for="product in otherProducts"
          :key="product.id"
          class="bg-white shadow rounded-lg p-4 border-l-4 border-green-400"
        >
          <h3 class="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <UIcon name="i-heroicons-cube" class="w-4 h-4 text-green-600" />
            {{ product.name }}
          </h3>
          <div v-if="product.signed_image_url" class="mb-2 flex justify-center">
            <a :href="product.signed_image_url" target="_blank">
              <img
                :src="product.signed_image_url"
                alt="Photo"
                class="max-h-24 rounded shadow"
              />
            </a>
          </div>
          <div v-else class="text-gray-400 italic text-center mb-2">
            Aucune image
          </div>
          <div class="space-y-1 text-sm text-gray-600">
            <p
              class="flex items-center gap-1"
              :class="getStockStatusClass(product)"
            >
              <UIcon :name="getStockStatusIcon(product)" class="w-4 h-4" />
              Stock : {{ product.stock }} {{ product.unite }}
            </p>
            <p>Prix : {{ formatCurrency(product.price) }}</p>
            <p>Type : {{ product.type_produit }}</p>
          </div>
          <div class="flex justify-end gap-2 mt-3">
            <NuxtLink
              :to="`/stock/edit/${product.id}`"
              class="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
            >
              <Icon name="material-symbols:edit" class="text-lg" />
            </NuxtLink>
            <button
              class="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
              @click="openDeleteModal(product)"
            >
              <Icon name="material-symbols:delete" class="text-lg" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Aucun produit trouvé avec les filtres -->
    <div
      v-if="!loading && products.length && !filteredProducts.length"
      class="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center"
    >
      <UIcon
        name="i-heroicons-funnel"
        class="text-4xl text-yellow-500 mx-auto mb-4"
      />
      <h3 class="text-lg font-medium text-yellow-800 mb-2">
        Aucun produit trouvé
      </h3>
      <p class="text-yellow-600 mb-4">
        Aucun produit ne correspond aux filtres actuels.
      </p>
      <UButton color="yellow" variant="outline" @click="resetFilters">
        Réinitialiser les filtres
      </UButton>
    </div>

    <!-- Aucune catégorie sélectionnée -->
    <div
      v-if="
        !loading &&
        products.length &&
        !filters.showCarreaux &&
        !filters.showOthers
      "
      class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center"
    >
      <UIcon
        name="i-heroicons-eye-slash"
        class="text-4xl text-gray-400 mx-auto mb-4"
      />
      <h3 class="text-lg font-medium text-gray-700 mb-2">
        Aucune catégorie sélectionnée
      </h3>
      <p class="text-gray-500 mb-4">
        Veuillez sélectionner au moins une catégorie de produits à afficher.
      </p>
      <div class="flex gap-2 justify-center">
        <UButton color="blue" @click="filters.showCarreaux = true">
          Afficher les carreaux
        </UButton>
        <UButton color="green" @click="filters.showOthers = true">
          Afficher les autres produits
        </UButton>
      </div>
    </div>

    <!-- Aucun produit dans la base -->
    <div
      v-if="!loading && !products.length"
      class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center"
    >
      <Icon
        name="material-symbols:inventory-2-outline"
        class="text-4xl text-gray-400 mx-auto mb-4"
      />
      <p class="text-gray-500 text-lg">Aucun produit en stock.</p>
      <NuxtLink
        to="/stock/add"
        class="mt-4 inline-block bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors"
      >
        Ajouter votre premier produit
      </NuxtLink>
    </div>
    <!-- Modal de récupération produit masqué -->
    <UModal
      v-model:open="isUnhideModalOpen"
      title="Récupérer & Modifier le Stock"
      :ui="{ footer: 'justify-end' }"
    >
      <template #header>
        <div class="flex items-center mb-3">
          <UIcon name="i-heroicons-eye" class="w-6 h-6 text-green-500 mr-3" />
          <div>
            <h4 class="text-sm text-gray-700">
              Modifier le stock du produit masqué :
              <span class="font-bold">{{ productToUnhide?.name }}</span>
            </h4>
            <p class="text-xs text-gray-500 mt-1">
              Si le stock est supérieur à 0, le produit sera automatiquement
              visible.
            </p>
          </div>
        </div>
      </template>
      <div class="py-2">
        <UInput
          v-model="newStockValue"
          type="number"
          min="0"
          step="1"
          label="Nouveau stock"
          placeholder="Entrer le stock"
          class="w-full"
        />
      </div>
      <template #footer>
        <div
          class="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0"
        >
          <UButton
            type="button"
            label="Annuler"
            variant="ghost"
            color="primary"
            @click="isUnhideModalOpen = false"
          />
          <UButton
            label="Valider"
            color="success"
            class="px-6"
            :loading="isUnhiding"
            @click="handleUnhideProduct"
          />
        </div>
      </template>
    </UModal>
    <!-- Modal de confirmation de suppression -->
    <UModal
      v-model:open="isDeleteModalOpen"
      title="Suppression Définitive"
      :ui="{ footer: 'justify-end' }"
    >
      <template #header>
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center mb-3 sm:mb-0">
            <UIcon
              name="i-lucide-triangle-alert"
              class="w-6 h-6 text-red-500 mr-3 flex-shrink-0 icone"
            />
          </div>
          <div class="ml-3">
            <h4 class="text-sm text-gray-500 dark:text-gray-400">
              Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est
              irréversible.
            </h4>
          </div>
        </div>
      </template>
      <template #footer>
        <div
          class="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0"
        >
          <UButton
            type="button"
            label="Annuler"
            variant="ghost"
            color="primary"
            @click="isDeleteModalOpen = false"
          />

          <UButton
            label="Supprimer"
            color="error"
            class="px-6"
            :loading="isDeleting"
            @click="handleDelete"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
