<script setup>
// Imports
import { useMagasinStore } from "../../composables/useMagasinStore";
import { useCurrentUser } from "../../composables/useCurrentUser";
import { useCompanySettings } from "../../composables/useCompanySettings";
const supabase = useSupabaseClient();
const toast = useToast();
const magasinStore = useMagasinStore();
const { settings: companySettings, fetchCompanySettings } =
  useCompanySettings();

const {
  companyId,
  isLoadingUser,
  loadCurrentUser,
} = useCurrentUser();
// États
const loading = ref(true);
const error = ref(null);
const sales = ref([]);
const statistics = ref({});
const selectedPeriod = ref("month");
const showFilters = ref(false);
const selectedClient = ref("all");
const selectedProduct = ref("all");
const chartType = ref("bar"); // Nouveau: type de graphique

// Données pour les filtres
const clients = ref([]);
const products = ref([]);

// Périodes disponibles
const periods = [
  { label: "Aujourd'hui", value: "today" },
  { label: "Cette semaine", value: "week" },
  { label: "Ce mois", value: "month" },
  { label: "Ce trimestre", value: "quarter" },
  { label: "Cette année", value: "year" },
  { label: "Tout", value: "all" },
];

// Types de graphiques disponibles
const chartTypes = [
  { label: "Barres", value: "bar", icon: "i-heroicons-chart-bar" },
  { label: "Ligne", value: "line", icon: "i-heroicons-chart-line" },
  { label: "Secteurs", value: "doughnut", icon: "i-heroicons-chart-pie" },
];

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

// Format de date
const formatDate = (date) => {
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
};

// Calculer les dates selon la période
const getDateRange = (period) => {
  const now = new Date();
  let startDate;
  const endDate = new Date();

  switch (period) {
    case "today": {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    }
    case "week": {
      const startOfWeek = now.getDate() - now.getDay();
      startDate = new Date(now.getFullYear(), now.getMonth(), startOfWeek);
      break;
    }
    case "month": {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case "quarter": {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterMonth, 1);
      break;
    }
    case "year": {
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    }
    default:
      return { startDate: null, endDate: null };
  }

  return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
};

// Récupérer les données de ventes
const fetchSalesData = async () => {
  loading.value = true;
  error.value = null;

  try {
    if (!supabase) throw new Error("Supabase client non initialisé");
    if (!magasinStore.magasinId) throw new Error("Aucun magasin sélectionné");

    // Construire la requête avec les filtres (produits internes et externes)
    let query = supabase
      .from("invoices")
      .select(
        `
        *,
        clients!inner(id, name, email),
        invoice_items!inner(
          id,
          quantity,
          price,
          external_reference,
          external_description,
          is_external,
          products_carreaux(id, name, type_produit)
        )
      `
      )
      .eq("status", "paid")
      .eq("magasin_id", magasinStore.magasinId)
      .order("date", { ascending: false });

    // Filtre par période
    if (selectedPeriod.value !== "all") {
      const { startDate, endDate } = getDateRange(selectedPeriod.value);
      if (startDate && endDate) {
        query = query.gte("date", startDate).lte("date", endDate);
      }
    }

    // Filtre par client
    if (selectedClient.value !== "all") {
      query = query.eq("client_id", selectedClient.value);
    }

    const { data, error: salesError } = await query;

    if (salesError) throw salesError;

    sales.value = data || [];

    // Calculer les statistiques
    calculateStatistics();

    // Récupérer les listes pour les filtres
    await fetchFilterData();
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

// Récupérer les données pour les filtres
const fetchFilterData = async () => {
  try {
    // Clients
    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, name")
      .order("name", { ascending: true });

    clients.value = clientsData || [];

    // Produits (depuis les factures pour avoir seulement les produits vendus)
    const { data: productsData } = await supabase
      .from("products_carreaux")
      .select("id, name, type_produit")
      .order("name", { ascending: true });

    products.value = productsData || [];
  } catch (err) {
    console.error("Erreur lors du chargement des filtres:", err);
  }
};

// Calculer les statistiques
const calculateStatistics = () => {
  const stats = {
    totalSales: 0,
    totalInvoices: sales.value.length,
    averageInvoice: 0,
    totalQuantity: 0,
    totalExternalProducts: 0,
    totalInternalProducts: 0,
    externalProductsRevenue: 0,
    internalProductsRevenue: 0,
    topProducts: [],
    topClients: [],
    salesByPeriod: [],
    paymentMethods: {},
  };

  // Calculs de base (tous types de produits)
  sales.value.forEach((sale) => {
    stats.totalSales += parseFloat(sale.total) || 0;

    if (sale.invoice_items) {
      sale.invoice_items.forEach((item) => {
        const quantity = parseInt(item.quantity) || 0;
        const itemTotal = (parseFloat(item.price) || 0) * quantity;

        stats.totalQuantity += quantity;

        if (item.is_external) {
          stats.totalExternalProducts += quantity;
          stats.externalProductsRevenue += itemTotal;
        } else {
          stats.totalInternalProducts += quantity;
          stats.internalProductsRevenue += itemTotal;
        }
      });
    }
  });

  stats.averageInvoice =
    stats.totalInvoices > 0 ? stats.totalSales / stats.totalInvoices : 0;

  // Top produits (internes et externes)
  const productSales = {};
  sales.value.forEach((sale) => {
    if (sale.invoice_items) {
      sale.invoice_items.forEach((item) => {
        let productName;

        // Gérer les produits externes et internes
        if (item.is_external) {
          productName = item.external_description || "Produit externe";
        } else if (item.products_carreaux) {
          productName = item.products_carreaux.name;
        } else {
          productName = "Produit supprimé";
        }

        if (!productSales[productName]) {
          productSales[productName] = {
            quantity: 0,
            total: 0,
            isExternal: item.is_external || false,
          };
        }
        productSales[productName].quantity += parseInt(item.quantity) || 0;
        productSales[productName].total +=
          (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0);
      });
    }
  });

  stats.topProducts = Object.entries(productSales)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Top clients
  const clientSales = {};
  sales.value.forEach((sale) => {
    if (sale.clients) {
      const clientKey = sale.clients.name; // ✅ Utiliser directement "name"
      if (!clientSales[clientKey]) {
        clientSales[clientKey] = { total: 0, invoices: 0 };
      }
      clientSales[clientKey].total += parseFloat(sale.total) || 0;
      clientSales[clientKey].invoices += 1;
    }
  });

  stats.topClients = Object.entries(clientSales)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  statistics.value = stats;
};

// Computed pour vérifier si des filtres sont actifs
const hasActiveFilters = computed(() => {
  return (
    selectedPeriod.value !== "month" ||
    selectedClient.value !== "all" ||
    selectedProduct.value !== "all"
  );
});

// Auto-expand filters if active
watch(hasActiveFilters, (newValue) => {
  if (newValue && !showFilters.value) {
    showFilters.value = true;
  }
});

// Réinitialiser les filtres
const resetFilters = () => {
  selectedPeriod.value = "month";
  selectedClient.value = "all";
  selectedProduct.value = "all";
  fetchSalesData();
};

// Watcher pour refetch les données quand les filtres changent
watch([selectedPeriod, selectedClient, selectedProduct], () => {
  fetchSalesData();
});

// Initialisation
onMounted(async () => {
  if (isLoadingUser.value) {
    await loadCurrentUser();
  }
  if (companyId.value) {
    await fetchCompanySettings(companyId.value);
  }
  await fetchFilterData();
  if (magasinStore.magasinId) {
    await fetchSalesData();
  }
});
</script>

<template>
  <div class="container mx-auto px-4 py-2">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800">Rapport de Ventes</h1>
      <UButton
        :disabled="loading"
        icon="i-lucide-refresh-cw"
        label="Actualiser"
        :class="{ 'animate-spin': loading }"
        color="primary"
        @click="fetchSalesData"
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
            <h2 class="text-lg font-semibold text-gray-700">
              Filtres & Période
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
              {{ statistics.totalInvoices || 0 }} facture{{
                (statistics.totalInvoices || 0) > 1 ? "s" : ""
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
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <USelect
            v-model="selectedPeriod"
            :items="periods"
            placeholder="Période"
            size="sm"
          />

          <USelect
            v-model="selectedClient"
            :items="[
              { label: 'Tous les clients', value: 'all' },
              ...clients.map((client) => ({
                label: client.name,
                value: client.id,
              })),
            ]"
            placeholder="Client"
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

    <!-- Diagramme des ventes -->
    <div v-if="!loading && !error" class="bg-white rounded-lg shadow-md mb-8">
      <div class="p-6 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3
            class="text-lg font-semibold text-gray-800 flex items-center gap-2"
          >
            <UIcon
              name="i-heroicons-chart-bar"
              class="w-5 h-5 text-indigo-500"
            />
            Évolution des Ventes
          </h3>

          <!-- Sélecteur de type de graphique -->
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600">Type :</span>
            <div class="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                v-for="type in chartTypes"
                :key="type.value"
                :class="[
                  'px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1',
                  chartType === type.value
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50',
                ]"
                @click="chartType = type.value"
              >
                <UIcon :name="type.icon" class="w-3 h-3" />
                {{ type.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="p-6">
        <SalesChart
          :sales-data="sales"
          :chart-type="chartType"
          :period="selectedPeriod"
        />
      </div>
    </div>

    <!-- Statistiques principales -->
    <div
      v-if="!loading && !error"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8"
    >
      <!-- Chiffre d'affaires total -->
      <div
        class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-blue-100 text-sm font-medium">
              Chiffre d'Affaires
            </h3>
            <p class="text-2xl font-bold">
              {{ formatCurrency(statistics.totalSales || 0) }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-currency-euro"
            class="w-8 h-8 text-blue-200"
          />
        </div>
      </div>

      <!-- Nombre de factures -->
      <div
        class="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-green-100 text-sm font-medium">Factures Payées</h3>
            <p class="text-2xl font-bold">
              {{ statistics.totalInvoices || 0 }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-document-check"
            class="w-8 h-8 text-green-200"
          />
        </div>
      </div>

      <!-- Panier moyen -->
      <div
        class="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-purple-100 text-sm font-medium">Panier Moyen</h3>
            <p class="text-2xl font-bold">
              {{ formatCurrency(statistics.averageInvoice || 0) }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-shopping-cart"
            class="w-8 h-8 text-purple-200"
          />
        </div>
      </div>

      <!-- Quantités vendues -->
      <div
        class="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-orange-100 text-sm font-medium">
              Quantités Vendues
            </h3>
            <p class="text-2xl font-bold">
              {{ statistics.totalQuantity || 0 }}
            </p>
          </div>
          <UIcon name="i-heroicons-cube" class="w-8 h-8 text-orange-200" />
        </div>
      </div>

      <!-- Produits externes -->
      <div
        class="bg-gradient-to-r from-pink-500 to-pink-600 text-white p-6 rounded-lg shadow-lg"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-pink-100 text-sm font-medium">Produits Externes</h3>
            <p class="text-2xl font-bold">
              {{ statistics.totalExternalProducts || 0 }}
            </p>
            <p class="text-pink-200 text-xs">
              {{ formatCurrency(statistics.externalProductsRevenue || 0) }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-cube-transparent"
            class="w-8 h-8 text-pink-200"
          />
        </div>
      </div>
    </div>

    <!-- Tableaux de données -->
    <div
      v-if="!loading && !error"
      class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
    >
      <!-- Top Produits -->
      <div class="bg-white rounded-lg shadow-md">
        <div class="p-6 border-b border-gray-200">
          <h3
            class="text-lg font-semibold text-gray-800 flex items-center gap-2"
          >
            <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-yellow-500" />
            Top Produits
          </h3>
        </div>
        <div class="p-6">
          <div
            v-if="statistics.topProducts && statistics.topProducts.length"
            class="space-y-4"
          >
            <div
              v-for="(product, index) in statistics.topProducts"
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
                  <p class="font-medium text-gray-900 flex items-center gap-2">
                    {{ product.name }}
                    <UBadge
                      v-if="product.isExternal"
                      color="purple"
                      variant="soft"
                      size="xs"
                    >
                      Externe
                    </UBadge>
                  </p>
                  <p class="text-sm text-gray-500">
                    {{ product.quantity }} unités
                  </p>
                </div>
              </div>
              <div class="text-right">
                <p class="font-semibold text-gray-900">
                  {{ formatCurrency(product.total) }}
                </p>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-gray-500">
            Aucune donnée disponible
          </div>
        </div>
      </div>

      <!-- Top Clients -->
      <div class="bg-white rounded-lg shadow-md">
        <div class="p-6 border-b border-gray-200">
          <h3
            class="text-lg font-semibold text-gray-800 flex items-center gap-2"
          >
            <UIcon name="i-heroicons-users" class="w-5 h-5 text-green-500" />
            Top Clients
          </h3>
        </div>
        <div class="p-6">
          <div
            v-if="statistics.topClients && statistics.topClients.length"
            class="space-y-4"
          >
            <div
              v-for="(client, index) in statistics.topClients"
              :key="index"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm"
                >
                  {{ index + 1 }}
                </div>
                <div>
                  <p class="font-medium text-gray-900">{{ client.name }}</p>
                  <p class="text-sm text-gray-500">
                    {{ client.invoices }} facture{{
                      client.invoices > 1 ? "s" : ""
                    }}
                  </p>
                </div>
              </div>
              <div class="text-right">
                <p class="font-semibold text-gray-900">
                  {{ formatCurrency(client.total) }}
                </p>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-gray-500">
            Aucune donnée disponible
          </div>
        </div>
      </div>
    </div>

    <!-- Liste détaillée des ventes -->
    <div v-if="!loading && !error" class="bg-white rounded-lg shadow-md">
      <div class="p-6 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <UIcon name="i-heroicons-list-bullet" class="w-5 h-5 text-blue-500" />
          Détail des Ventes
        </h3>
      </div>

      <div v-if="sales.length" class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                N° Facture
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                Date
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                Client
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"
              >
                Articles
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"
              >
                Total
              </th>
              <th
                class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="sale in sales" :key="sale.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 text-sm font-medium text-gray-900">
                #{{ sale.invoice_number || sale.id }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">
                {{ formatDate(sale.date) }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">
                <div class="flex items-center gap-2">
                  <span>{{
                    sale.clients ? sale.clients.name : "Client supprimé"
                  }}</span>
                  <UBadge
                    v-if="
                      sale.is_external ||
                      sale.invoice_items?.some((item) => item.is_external)
                    "
                    color="purple"
                    variant="soft"
                    size="xs"
                  >
                    Prod. externes
                  </UBadge>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-right text-gray-500">
                <div class="flex flex-col items-end">
                  <span>{{
                    sale.invoice_items ? sale.invoice_items.length : 0
                  }}</span>
                  <span
                    v-if="sale.invoice_items?.some((item) => item.is_external)"
                    class="text-xs text-purple-600"
                  >
                    ({{
                      sale.invoice_items?.filter((item) => item.is_external)
                        .length
                    }}
                    ext.)
                  </span>
                </div>
              </td>
              <td
                class="px-6 py-4 text-sm text-right font-semibold text-gray-900"
              >
                {{ formatCurrency(sale.total) }}
              </td>
              <td class="px-6 py-4 text-sm text-center">
                <NuxtLink
                  :to="`/facture/${sale.id}`"
                  class="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                >
                  <Icon name="material-symbols:visibility" class="text-lg" />
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="p-8 text-center text-gray-500">
        <UIcon
          name="i-heroicons-document-text"
          class="w-12 h-12 mx-auto mb-4 text-gray-300"
        />
        <p class="text-lg">Aucune vente trouvée</p>
        <p class="text-sm">Essayez de modifier les filtres ou la période</p>
      </div>
    </div>
  </div>
</template>
