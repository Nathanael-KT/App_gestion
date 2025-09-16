<script setup>
// Imports
const supabase = useSupabaseClient();
const toast = useToast();

// États
const loading = ref(true);
const error = ref(null);
const products = ref([]);
const stockMovements = ref([]);
const statistics = ref({});
const selectedType = ref("all");
const selectedStatus = ref("all");
const showFilters = ref(false);
const sortBy = ref("name");
const sortOrder = ref("asc");

// Données pour les filtres
const productTypes = ref([]);

// Options de tri
const sortOptions = [
  { label: "Nom A-Z", value: "name-asc" },
  { label: "Nom Z-A", value: "name-desc" },
  { label: "Stock croissant", value: "stock-asc" },
  { label: "Stock décroissant", value: "stock-desc" },
  { label: "Prix croissant", value: "price-asc" },
  { label: "Prix décroissant", value: "price-desc" },
];

// Statuts de stock
const stockStatuses = [
  { label: "Tous les statuts", value: "all" },
  { label: "En stock", value: "in_stock" },
  { label: "Stock faible", value: "low_stock" },
  { label: "Rupture", value: "out_of_stock" },
];

// Seuils pour les alertes stock
const LOW_STOCK_THRESHOLD = 10;
const CRITICAL_STOCK_THRESHOLD = 5;

// Format monétaire
const formatCurrency = (value) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
};

// Format de date
const formatDate = (date) => {
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

// Déterminer le statut du stock
const getStockStatus = (stock) => {
  if (stock === 0) return "out_of_stock";
  if (stock <= CRITICAL_STOCK_THRESHOLD) return "critical";
  if (stock <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "in_stock";
};

// Couleur du badge selon le statut
const getStockBadgeColor = (stock) => {
  const status = getStockStatus(stock);
  switch (status) {
    case "out_of_stock":
      return "red";
    case "critical":
      return "orange";
    case "low_stock":
      return "yellow";
    default:
      return "green";
  }
};

// Texte du badge selon le statut
const getStockBadgeText = (stock) => {
  const status = getStockStatus(stock);
  switch (status) {
    case "out_of_stock":
      return "Rupture";
    case "critical":
      return "Critique";
    case "low_stock":
      return "Faible";
    default:
      return "En stock";
  }
};

// Récupérer les données de stock
const fetchStockData = async () => {
  loading.value = true;
  error.value = null;

  try {
    if (!supabase) throw new Error("Supabase client non initialisé");

    // Récupérer les produits avec leurs types
    const query = supabase
      .from("products_carreaux")
      .select(
        `
        *,
        product_types!left(id, name)
      `
      )
      .order(getSortField(), { ascending: sortOrder.value === "asc" });

    const { data: productsData, error: productsError } = await query;

    if (productsError) throw productsError;

    products.value = productsData || [];

    // Récupérer les mouvements de stock récents
    const { data: stockData, error: stockError } = await supabase
      .from("stocks")
      .select(
        `
        *,
        products_carreaux!inner(name, reference)
      `
      )
      .order("updated_at", { ascending: false })
      .limit(20);

    if (stockError) throw stockError;

    stockMovements.value = stockData || [];

    // Calculer les statistiques
    calculateStatistics();

    // Récupérer les types de produits
    await fetchProductTypes();
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

// Récupérer les types de produits
const fetchProductTypes = async () => {
  try {
    const { data } = await supabase
      .from("product_types")
      .select("id, name")
      .order("name", { ascending: true });

    productTypes.value = data || [];
  } catch (err) {
    console.error("Erreur lors du chargement des types:", err);
  }
};

// Obtenir le champ de tri
const getSortField = () => {
  const [field] = sortBy.value.split("-");
  return field;
};

// Calculer les statistiques
const calculateStatistics = () => {
  const stats = {
    totalProducts: products.value.length,
    totalValue: 0,
    averageStock: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    criticalStockCount: 0,
    topValueProducts: [],
    lowStockProducts: [],
    stockDistribution: {
      inStock: 0,
      lowStock: 0,
      outOfStock: 0,
    },
  };

  let totalStock = 0;
  const productsByValue = [];

  products.value.forEach((product) => {
    const stock = parseInt(product.stock) || 0;
    const price = parseFloat(product.price) || 0;
    const value = stock * price;

    stats.totalValue += value;
    totalStock += stock;

    productsByValue.push({
      name: product.name,
      stock,
      value,
      price,
    });

    const status = getStockStatus(stock);

    switch (status) {
      case "out_of_stock":
        stats.outOfStockCount++;
        stats.stockDistribution.outOfStock++;
        break;
      case "critical":
        stats.criticalStockCount++;
        stats.stockDistribution.lowStock++;
        break;
      case "low_stock":
        stats.lowStockCount++;
        stats.stockDistribution.lowStock++;
        break;
      default:
        stats.stockDistribution.inStock++;
    }
  });

  stats.averageStock =
    stats.totalProducts > 0 ? totalStock / stats.totalProducts : 0;

  // Top 5 produits par valeur
  stats.topValueProducts = productsByValue
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Produits en stock faible (pour alertes)
  stats.lowStockProducts = products.value
    .filter((product) => {
      const status = getStockStatus(product.stock);
      return (
        status === "low_stock" ||
        status === "critical" ||
        status === "out_of_stock"
      );
    })
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 10);

  statistics.value = stats;
};

// Produits filtrés
const filteredProducts = computed(() => {
  let filtered = products.value;

  // Filtre par type
  if (selectedType.value !== "all") {
    filtered = filtered.filter(
      (product) => product.type_produit === selectedType.value
    );
  }

  // Filtre par statut de stock
  if (selectedStatus.value !== "all") {
    filtered = filtered.filter((product) => {
      const status = getStockStatus(product.stock);
      switch (selectedStatus.value) {
        case "in_stock":
          return status === "in_stock";
        case "low_stock":
          return status === "low_stock" || status === "critical";
        case "out_of_stock":
          return status === "out_of_stock";
        default:
          return true;
      }
    });
  }

  return filtered;
});

// Vérifier si des filtres sont actifs
const hasActiveFilters = computed(() => {
  return selectedType.value !== "all" || selectedStatus.value !== "all";
});

// Auto-expand filters if active
watch(hasActiveFilters, (newValue) => {
  if (newValue && !showFilters.value) {
    showFilters.value = true;
  }
});

// Réinitialiser les filtres
const resetFilters = () => {
  selectedType.value = "all";
  selectedStatus.value = "all";
  sortBy.value = "name";
  sortOrder.value = "asc";
  fetchStockData();
};

// Watcher pour le tri
watch([sortBy, sortOrder], () => {
  const [field, order] = sortBy.value.includes("-")
    ? sortBy.value.split("-")
    : [sortBy.value, sortOrder.value];
  sortBy.value = field;
  sortOrder.value = order;
  fetchStockData();
});

// Watcher pour les filtres
watch([selectedType, selectedStatus], () => {
  calculateStatistics();
});

// Initialisation
onMounted(() => {
  fetchStockData();
});
</script>

<template>
  <div class="container mx-auto px-4 py-2">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800">Rapport de Stock</h1>
      <UButton
        :disabled="loading"
        icon="i-lucide-refresh-cw"
        label="Actualiser"
        :class="{ 'animate-spin': loading }"
        color="primary"
        @click="fetchStockData"
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
            <UIcon name="i-heroicons-adjustments-horizontal" class="w-5 h-5" />
            <h2 class="text-lg font-semibold text-gray-700">Filtres & Tri</h2>
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
              {{ filteredProducts.length }} produit{{
                filteredProducts.length > 1 ? "s" : ""
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

      <!-- Contenu des filtres -->
      <div v-show="showFilters" class="px-6 pb-6 border-t border-gray-100">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <USelect
            v-model="selectedType"
            :items="[
              { label: 'Tous les types', value: 'all' },
              ...productTypes.map((type) => ({
                label: type.name,
                value: type.id,
              })),
            ]"
            placeholder="Type de produit"
            size="sm"
          />

          <USelect
            v-model="selectedStatus"
            :items="stockStatuses"
            placeholder="Statut du stock"
            size="sm"
          />

          <USelect
            v-model="sortBy"
            :items="sortOptions"
            placeholder="Trier par"
            size="sm"
          />

          <div class="flex gap-2">
            <UButton
              variant="outline"
              color="gray"
              size="sm"
              icon="i-heroicons-arrow-path"
              class="flex-1"
              @click="resetFilters"
            >
              Réinitialiser
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"
      />
    </div>

    <!-- Erreur -->
    <div
      v-if="error"
      class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded"
    >
      <p>{{ error }}</p>
    </div>

    <!-- Statistiques principales -->
    <div
      v-if="!loading && !error"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
    >
      <!-- Total des produits -->
      <div
        class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-blue-100 text-sm font-medium">Total Produits</h3>
            <p class="text-2xl font-bold">
              {{ statistics.totalProducts || 0 }}
            </p>
          </div>
          <UIcon name="i-heroicons-cube" class="w-8 h-8 text-blue-200" />
        </div>
      </div>

      <!-- Valeur totale du stock -->
      <div
        class="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-green-100 text-sm font-medium">Valeur Totale</h3>
            <p class="text-2xl font-bold">
              {{ formatCurrency(statistics.totalValue || 0) }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-currency-euro"
            class="w-8 h-8 text-green-200"
          />
        </div>
      </div>

      <!-- Stock moyen -->
      <div
        class="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-purple-100 text-sm font-medium">Stock Moyen</h3>
            <p class="text-2xl font-bold">
              {{ Math.round(statistics.averageStock || 0) }}
            </p>
          </div>
          <UIcon name="i-heroicons-chart-bar" class="w-8 h-8 text-purple-200" />
        </div>
      </div>

      <!-- Alertes stock -->
      <div
        class="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-orange-100 text-sm font-medium">Alertes Stock</h3>
            <p class="text-2xl font-bold">
              {{
                (statistics.lowStockCount || 0) +
                (statistics.outOfStockCount || 0) +
                (statistics.criticalStockCount || 0)
              }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-exclamation-triangle"
            class="w-8 h-8 text-orange-200"
          />
        </div>
      </div>
    </div>

    <!-- Analyses et tableaux -->
    <div
      v-if="!loading && !error"
      class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
    >
      <!-- Top produits par valeur -->
      <div class="bg-white rounded-lg shadow-md">
        <div class="p-6 border-b border-gray-200">
          <h3
            class="text-lg font-semibold text-gray-800 flex items-center gap-2"
          >
            <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-yellow-500" />
            Top Produits par Valeur
          </h3>
        </div>
        <div class="p-6">
          <div
            v-if="
              statistics.topValueProducts && statistics.topValueProducts.length
            "
            class="space-y-4"
          >
            <div
              v-for="(product, index) in statistics.topValueProducts"
              :key="index"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm"
                >
                  {{ index + 1 }}
                </div>
                <div>
                  <p class="font-medium text-gray-900">{{ product.name }}</p>
                  <p class="text-sm text-gray-500">
                    {{ product.stock }} unités ×
                    {{ formatCurrency(product.price) }}
                  </p>
                </div>
              </div>
              <div class="text-right">
                <p class="font-semibold text-gray-900">
                  {{ formatCurrency(product.value) }}
                </p>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-gray-500">
            Aucune donnée disponible
          </div>
        </div>
      </div>

      <!-- Alertes stock faible -->
      <div class="bg-white rounded-lg shadow-md">
        <div class="p-6 border-b border-gray-200">
          <h3
            class="text-lg font-semibold text-gray-800 flex items-center gap-2"
          >
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="w-5 h-5 text-red-500"
            />
            Alertes Stock Faible
          </h3>
        </div>
        <div class="p-6">
          <div
            v-if="
              statistics.lowStockProducts && statistics.lowStockProducts.length
            "
            class="space-y-4"
          >
            <div
              v-for="(product, index) in statistics.lowStockProducts"
              :key="index"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center gap-3">
                <UBadge
                  :color="getStockBadgeColor(product.stock)"
                  variant="solid"
                  size="xs"
                >
                  {{ getStockBadgeText(product.stock) }}
                </UBadge>
                <div>
                  <p class="font-medium text-gray-900">{{ product.name }}</p>
                  <p class="text-sm text-gray-500">
                    Ref: {{ product.reference || "N/A" }}
                  </p>
                </div>
              </div>
              <div class="text-right">
                <p class="font-semibold text-gray-900">
                  {{ product.stock }} unités
                </p>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-gray-500">
            <UIcon
              name="i-heroicons-check-circle"
              class="w-12 h-12 mx-auto mb-2 text-green-300"
            />
            <p class="text-lg text-green-600">Aucune alerte</p>
            <p class="text-sm">Tous les stocks sont normaux</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Tableau détaillé des produits -->
    <div v-if="!loading && !error" class="bg-white rounded-lg shadow-md">
      <div class="p-6 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <UIcon name="i-heroicons-list-bullet" class="w-5 h-5 text-blue-500" />
          Inventaire Détaillé
        </h3>
      </div>

      <div v-if="filteredProducts.length" class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                Produit
              </th>
              <th
                class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase"
              >
                Type
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"
              >
                Stock
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"
              >
                Prix Unitaire
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"
              >
                Valeur Totale
              </th>
              <th
                class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase"
              >
                Statut
              </th>
              <th
                class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="product in filteredProducts"
              :key="product.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 text-sm">
                <div>
                  <p class="font-medium text-gray-900">{{ product.name }}</p>
                  <p class="text-gray-500">{{ product.reference || "N/A" }}</p>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-center text-gray-500">
                {{ product.product_types?.name || "Non défini" }}
              </td>
              <td
                class="px-6 py-4 text-sm text-right font-semibold text-gray-900"
              >
                {{ product.stock }}
              </td>
              <td class="px-6 py-4 text-sm text-right text-gray-900">
                {{ formatCurrency(product.price) }}
              </td>
              <td
                class="px-6 py-4 text-sm text-right font-semibold text-gray-900"
              >
                {{
                  formatCurrency((product.stock || 0) * (product.price || 0))
                }}
              </td>
              <td class="px-6 py-4 text-sm text-center">
                <UBadge
                  :color="getStockBadgeColor(product.stock)"
                  variant="soft"
                  size="sm"
                >
                  {{ getStockBadgeText(product.stock) }}
                </UBadge>
              </td>
              <td class="px-6 py-4 text-sm text-center">
                <NuxtLink
                  :to="`/stock/edit/${product.id}`"
                  class="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                >
                  <UIcon name="i-heroicons-pencil" class="w-4 h-4" />
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="p-8 text-center text-gray-500">
        <UIcon
          name="i-heroicons-cube"
          class="w-12 h-12 mx-auto mb-4 text-gray-300"
        />
        <p class="text-lg">Aucun produit trouvé</p>
        <p class="text-sm">Essayez de modifier les filtres</p>
      </div>
    </div>

    <!-- Mouvements de stock récents -->
    <div
      v-if="!loading && !error && stockMovements.length"
      class="bg-white rounded-lg shadow-md mt-8"
    >
      <div class="p-6 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <UIcon
            name="i-heroicons-arrow-path"
            class="w-5 h-5 text-indigo-500"
          />
          Mouvements Récents
        </h3>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                Date
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                Produit
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"
              >
                Quantité
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                Emplacement
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="movement in stockMovements"
              :key="movement.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 text-sm text-gray-500">
                {{ formatDate(movement.updated_at) }}
              </td>
              <td class="px-6 py-4 text-sm">
                <div>
                  <p class="font-medium text-gray-900">
                    {{ movement.products_carreaux?.name || "Produit supprimé" }}
                  </p>
                  <p class="text-gray-500">
                    {{ movement.products_carreaux?.reference || "N/A" }}
                  </p>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-right font-semibold">
                <span
                  :class="
                    movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                  "
                >
                  {{ movement.quantity > 0 ? "+" : "" }}{{ movement.quantity }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">
                {{ movement.location || "Non spécifié" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
