<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { usePdfGenerator } from "../../composables/usePdfGenerator";
import { useMagasinStore } from "../../composables/useMagasinStore";
import { useCurrentUser } from "../../composables/useCurrentUser";
import { useCompanySettings } from "../../composables/useCompanySettings";

const {
  companyId,
  isLoadingUser,
  loadCurrentUser,
} = useCurrentUser();
const { settings: companySettings, fetchCompanySettings } =
  useCompanySettings();


onMounted(async () => {
  if (isLoadingUser.value) {
    await loadCurrentUser();
  }
    if (companyId.value) await fetchCompanySettings(companyId.value);

  await fetchInvoices();
});


// Meta configuration
definePageMeta({
  middleware: ["auth", "roles"],
});

const magasinStore = useMagasinStore();
const supabase = useSupabaseClient();
const router = useRouter();

const invoices = ref([]);
const loading = ref(false);
const error = ref(null);
const successMessage = ref(null);
const downloadingPdf = ref(null);


// Search and filters
const searchQuery = ref("");
const statusFilter = ref("all");
const typeFilter = ref("all"); // Nouveau filtre pour les types de produits

// Charger les filtres depuis le localStorage au démarrage
const loadFiltersFromStorage = () => {
  if (import.meta.client) {
    const savedFilters = localStorage.getItem("factures-filters");
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        searchQuery.value = filters.searchQuery || "";
        statusFilter.value = filters.statusFilter || "all";
        typeFilter.value = filters.typeFilter || "all";
      } catch (e) {
        console.log("Erreur lors du chargement des filtres:", e);
      }
    }
  }
};

// Sauvegarder les filtres dans le localStorage
const saveFiltersToStorage = () => {
  if (import.meta.client) {
    const filters = {
      searchQuery: searchQuery.value,
      statusFilter: statusFilter.value,
      typeFilter: typeFilter.value,
    };
    localStorage.setItem("factures-filters", JSON.stringify(filters));
  }
};

// Pagination
const currentPage = ref(0);
const itemsPerPage = ref(10);

const filteredInvoices = computed(() => {
  let filtered = invoices.value;

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (invoice) =>
        invoice.reference.toLowerCase().includes(query) ||
        invoice.client_name.toLowerCase().includes(query)
    );
  }

  // Apply status filter
  if (statusFilter.value !== "all") {
    if (statusFilter.value === "paid") {
      // Filtre pour les factures payées
      filtered = filtered.filter((invoice) => invoice.status === "paid");
    } else if (statusFilter.value === "unpaid") {
      // Filtre pour les factures non payées
      filtered = filtered.filter((invoice) => invoice.status !== "paid");
    }
  }

  // Apply type filter (internal vs external products)
  if (typeFilter.value !== "all") {
    if (typeFilter.value === "external") {
      // Filtre pour les factures avec produits externes
      filtered = filtered.filter((invoice) => invoice.is_external === true);
    } else if (typeFilter.value === "internal") {
      // Filtre pour les factures avec produits internes uniquement
      filtered = filtered.filter((invoice) => invoice.is_external !== true);
    }
  }

  return filtered;
});

const totalPages = computed(() =>
  Math.ceil(filteredInvoices.value.length / itemsPerPage.value)
);

const paginatedInvoices = computed(() => {
  const start = currentPage.value * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredInvoices.value.slice(start, end);
});

// Reset page when filters change
watch([searchQuery, statusFilter, typeFilter], () => {
  currentPage.value = 0;
  saveFiltersToStorage(); // Sauvegarder les filtres à chaque changement
});

// Watcher séparé pour sauvegarder automatiquement les filtres
watch(
  [searchQuery, statusFilter, typeFilter],
  () => {
    saveFiltersToStorage();
  },
  { deep: true }
);

const fetchInvoices = async () => {
  // Vérifie que magasinId est bien défini et non vide
  if (!magasinStore.magasinId) {
    invoices.value = [];
    error.value = "Veuillez sélectionner un magasin.";
    loading.value = false;
    return;
  } else {
    error.value = null;
  }
  if (!companyId.value) {
    invoices.value = [];
    error.value = "Aucune company active.";
    loading.value = false;
    return;
  }
  try {
    loading.value = true;
    error.value = null;
    const { data, error: fetchError } = await supabase
      .from("invoices")
      .select(
        `
        *,
        magasin_id,
        clients(name)
      `
      )
      .eq("magasin_id", magasinStore.magasinId)
      .order("date", { ascending: false });

    if (fetchError) throw fetchError;

    invoices.value =
      data.map((invoice) => ({
        ...invoice,
        reference: invoice.reference || "N/A",
        client_name: invoice.clients?.name || "Inconnu",
        total: invoice.total || 0,
        status: invoice.status || "pending",
        delivery: invoice.delivery || false,
        // Formatage de la date pour l'affichage
        date: new Date(invoice.date).toLocaleDateString("fr-FR"),
      })) || [];
  } catch (err) {
    console.error("Erreur lors de la récupération des factures:", err);
    error.value = err.message || "Erreur lors de la récupération des factures.";
  } finally {
    loading.value = false;
  }
};

const handleDownloadPDF = async (invoiceId) => {
  try {
    downloadingPdf.value = invoiceId;
    const { downloadPDF } = usePdfGenerator();
    await downloadPDF(invoiceId);
    successMessage.value = "PDF généré avec succès !";
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err) {
    console.error("Erreur lors de la génération du PDF:", err);
    error.value = err.message || "Erreur lors de la génération du PDF.";
  } finally {
    downloadingPdf.value = null;
  }
};

const handlePrintPDF = async (invoiceId) => {
  try {
    downloadingPdf.value = `${invoiceId}_print`;
    const { printPDF } = usePdfGenerator();
    await printPDF(invoiceId);
    successMessage.value = "Impression lancée avec succès !";
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err) {
    console.error("Erreur lors de l'impression du PDF:", err);
    error.value = err.message || "Erreur lors de l'impression du PDF.";
  } finally {
    downloadingPdf.value = null;
  }
};

const handleDownloadPartialPDF = async (invoiceId) => {
  try {
    downloadingPdf.value = `${invoiceId}_partial`;
    const { downloadPartialPDF } = usePdfGenerator();
    await downloadPartialPDF(invoiceId);
    successMessage.value = "PDF avec détail des paiements généré avec succès !";
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err) {
    console.error("Erreur lors de la génération du PDF partiel:", err);
    error.value = err.message || "Erreur lors de la génération du PDF.";
  } finally {
    downloadingPdf.value = null;
  }
};

const handlePrintPartialPDF = async (invoiceId) => {
  try {
    downloadingPdf.value = `${invoiceId}_print_partial`;
    const { printPartialPDF } = usePdfGenerator();
    await printPartialPDF(invoiceId);
    successMessage.value = "Impression du détail des paiements lancée !";
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err) {
    console.error("Erreur lors de l'impression du PDF partiel:", err);
    error.value = err.message || "Erreur lors de l'impression du PDF.";
  } finally {
    downloadingPdf.value = null;
  }
};

const getStatusColor = (status) => {
  const colors = {
    paid: "green",
    draft: "orange",
  };
  return colors[status] || "gray";
};

const getStatusLabel = (status) => {
  const labels = {
    paid: "Payée",
    draft: "Non payée",
  };
  return labels[status] || status;
};


const getVisiblePages = () => {
  const pages = [];
  const total = totalPages.value;
  const current = currentPage.value;

  if (total <= 7) {
    for (let i = 0; i < total; i++) {
      pages.push(i);
    }
  } else {
    pages.push(0);
    if (current > 3) pages.push("...");
    const start = Math.max(1, current - 1);
    const end = Math.min(total - 2, current + 1);
    for (let i = start; i <= end; i++) {
      if (i !== 0 && i !== total - 1) pages.push(i);
    }
    if (current < total - 4) pages.push("...");
    if (total > 1) pages.push(total - 1);
  }

  return pages.filter(
    (page) => page !== "..." || pages.indexOf(page) === pages.lastIndexOf(page)
  );
};

// Fonction pour réinitialiser tous les filtres
const resetAllFilters = () => {
  searchQuery.value = "";
  statusFilter.value = "all";
  typeFilter.value = "all";
  currentPage.value = 0;

  // Supprimer les filtres du localStorage
  if (import.meta.client) {
    localStorage.removeItem("factures-filters");
  }
};

onMounted(() => {
  loadFiltersFromStorage(); // Charger les filtres sauvegardés
  fetchInvoices();
});
watch(() => magasinStore.magasinId, fetchInvoices);
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
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 class="text-3xl font-bold text-gray-900">
              Gestion des Factures
            </h1>
            <p class="text-gray-600 mt-1">
              Gérez vos factures et suivez les paiements
            </p>
          </div>
        </div>
      </div>

      <!-- Search and Filters Section -->
      <div
        class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6"
      >
        <div
          class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div class="flex-1 max-w-md">
            <UInput
              v-model="searchQuery"
              placeholder="Rechercher par référence ou client..."
              icon="i-lucide-search"
              size="lg"
              class="w-full"
            />
          </div>

          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <label
                for="status-filter"
                class="text-sm font-medium text-gray-700"
              >
                Statut :
              </label>
              <select
                id="status-filter"
                v-model="statusFilter"
                class="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Toutes</option>
                <option value="paid">Payées</option>
                <option value="unpaid">Non payées</option>
              </select>
            </div>

            <div class="flex items-center gap-2">
              <label
                for="type-filter"
                class="text-sm font-medium text-gray-700"
              >
                Type :
              </label>
              <select
                id="type-filter"
                v-model="typeFilter"
                class="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Tous produits</option>
                <option value="internal">Produits internes</option>
                <option value="external">Produits externes</option>
              </select>
            </div>

            <!-- Bouton pour effacer tous les filtres -->
            <UButton
              v-if="
                searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
              "
              variant="soft"
              color="gray"
              size="sm"
              icon="i-lucide-x"
              @click="resetAllFilters"
            >
              Effacer filtres
            </UButton>

            <div class="flex items-center gap-6 text-sm text-gray-600">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 bg-blue-500 rounded-full" />
                <span
                  >{{ filteredInvoices.length }} facture{{
                    filteredInvoices.length > 1 ? "s" : ""
                  }}</span
                >
              </div>
              <div
                v-if="filteredInvoices.length > itemsPerPage"
                class="flex items-center gap-2"
              >
                <div class="w-3 h-3 bg-purple-500 rounded-full" />
                <span>Page {{ currentPage + 1 }}/{{ totalPages }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div v-if="successMessage" class="mb-6">
        <div
          class="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3"
        >
          <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-green-500" />
          <p>{{ successMessage }}</p>
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

      <!-- Chargement -->
      <div v-if="loading" class="flex justify-center items-center py-16">
        <div class="text-center">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"
          />
          <p class="text-gray-600">Chargement des factures...</p>
        </div>
      </div>

      <!-- Liste des factures - Compact Layout -->
      <div v-else-if="paginatedInvoices.length" class="space-y-3">
        <div
          v-for="invoice in paginatedInvoices"
          :key="invoice.id"
          class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
        >
          <div class="p-4">
            <!-- Ligne principale compacte -->
            <div class="flex items-center justify-between gap-4">
              <!-- Info facture -->
              <div class="flex items-center gap-4 min-w-0 flex-1">
                <div
                  class="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                >
                  <UIcon name="i-lucide-receipt" class="w-5 h-5" />
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-4 flex-wrap">
                    <h3 class="text-lg font-semibold text-gray-900 truncate">
                      {{ invoice.reference }}
                    </h3>
                    <div class="flex items-center gap-3 text-sm text-gray-600">
                      <div class="flex items-center gap-1">
                        <UIcon
                          name="i-lucide-user"
                          class="w-4 h-4 flex-shrink-0"
                        />
                        <span class="truncate max-w-32">{{
                          invoice.client_name
                        }}</span>
                      </div>
                      <div class="flex items-center gap-1">
                        <UIcon
                          name="i-lucide-calendar"
                          class="w-4 h-4 flex-shrink-0"
                        />
                        <span>{{ invoice.date }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Statut et total -->
              <div class="flex items-center gap-4 flex-shrink-0">
                <div class="text-right">
                  <p class="text-xl font-bold text-gray-900">
                    {{ invoice.total.toFixed(2) }} {{ companySettings?.currency }}
                  </p>
                </div>

                <div class="flex items-center gap-2">
                  <!-- Badge pour produits externes -->
                  <UBadge
                    v-if="invoice.is_external"
                    label="Externe"
                    color="purple"
                    variant="soft"
                    size="xs"
                  />
                  <!-- Badge de statut -->
                  <UBadge
                    :color="getStatusColor(invoice.status)"
                    :label="getStatusLabel(invoice.status)"
                    variant="soft"
                    size="sm"
                  />
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-2 flex-shrink-0">
                <UButton
                  icon="i-lucide-eye"
                  variant="soft"
                  color="gray"
                  size="sm"
                  title="Voir la facture"
                  @click="router.push(`/facture/${invoice.id}`)"
                />

                <!-- Bouton principal d'impression avec détail des paiements -->
                <UDropdown
                  :items="[
                    [
                      {
                        label: 'Imprimer directement',
                        icon: 'i-lucide-printer',
                        click: () => handlePrintPartialPDF(invoice.id),
                      },
                    ],
                    [
                      {
                        label: 'Télécharger PDF',
                        icon: 'i-lucide-download',
                        click: () => handleDownloadPartialPDF(invoice.id),
                      },
                    ],
                  ]"
                >
                  <UButton
                    icon="i-lucide-printer"
                    variant="soft"
                    color="green"
                    size="sm"
                    :loading="
                      downloadingPdf === `${invoice.id}_print_partial` ||
                      downloadingPdf === `${invoice.id}_partial`
                    "
                    :disabled="
                      loading ||
                      downloadingPdf === `${invoice.id}_print_partial` ||
                      downloadingPdf === `${invoice.id}_partial`
                    "
                    title="Imprimer facture avec détail paiements"
                    @click="handlePrintPartialPDF(invoice.id)"
                  />
                </UDropdown>

                <!-- Bouton pour facture finale (uniquement si payée) -->
                <UDropdown
                  v-if="invoice.status === 'paid'"
                  :items="[
                    [
                      {
                        label: 'Imprimer facture finale',
                        icon: 'i-lucide-printer',
                        click: () => handlePrintPDF(invoice.id),
                      },
                    ],
                    [
                      {
                        label: 'Télécharger PDF final',
                        icon: 'i-lucide-download',
                        click: () => handleDownloadPDF(invoice.id),
                      },
                    ],
                  ]"
                >
                  <UButton
                    icon="i-lucide-file-check"
                    variant="soft"
                    color="blue"
                    size="sm"
                    :loading="
                      downloadingPdf === `${invoice.id}_print` ||
                      downloadingPdf === invoice.id
                    "
                    :disabled="
                      loading ||
                      downloadingPdf === `${invoice.id}_print` ||
                      downloadingPdf === invoice.id
                    "
                    title="Imprimer facture finale"
                    @click="handlePrintPDF(invoice.id)"
                  />
                </UDropdown>

                <!-- Bouton de gestion des paiements pour factures non payées -->
                <UButton
                  v-if="invoice.status !== 'paid'"
                  icon="i-lucide-wallet"
                  variant="soft"
                  color="purple"
                  size="sm"
                  title="Gérer les paiements"
                  @click="router.push(`/facture/paye?invoice_id=${invoice.id}`)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="!loading && filteredInvoices.length > itemsPerPage"
        class="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-4"
      >
        <!-- Mobile Pagination -->
        <div class="flex items-center justify-between sm:hidden">
          <UButton
            icon="i-lucide-chevron-left"
            variant="soft"
            size="sm"
            :disabled="currentPage === 0"
            @click="currentPage--"
          >
            Précédent
          </UButton>
          <span class="text-sm text-gray-600">
            Page {{ currentPage + 1 }} / {{ totalPages }}
          </span>
          <UButton
            icon="i-lucide-chevron-right"
            variant="soft"
            size="sm"
            :disabled="currentPage === totalPages - 1"
            @click="currentPage++"
          >
            Suivant
          </UButton>
        </div>

        <!-- Desktop Pagination -->
        <div class="hidden sm:flex items-center justify-between">
          <div class="flex items-center gap-2 text-sm text-gray-600">
            <span>
              Affichage {{ currentPage * itemsPerPage + 1 }} -
              {{
                Math.min(
                  (currentPage + 1) * itemsPerPage,
                  filteredInvoices.length
                )
              }}
              sur {{ filteredInvoices.length }} factures
            </span>
          </div>

          <div class="flex items-center gap-1">
            <UButton
              icon="i-lucide-chevron-left"
              variant="soft"
              size="sm"
              :disabled="currentPage === 0"
              @click="currentPage--"
            />
            <div class="flex gap-1 mx-2">
              <UButton
                v-for="page in getVisiblePages()"
                :key="page"
                :variant="page === currentPage ? 'solid' : 'soft'"
                :color="page === currentPage ? 'primary' : 'gray'"
                size="sm"
                class="min-w-10"
                :disabled="page === '...'"
                @click="page !== '...' ? (currentPage = page) : null"
              >
                {{ typeof page === "number" ? page + 1 : page }}
              </UButton>
            </div>
            <UButton
              icon="i-lucide-chevron-right"
              variant="soft"
              size="sm"
              :disabled="currentPage === totalPages - 1"
              @click="currentPage++"
            />
          </div>

          <div class="flex items-center gap-2">
            <label for="items-per-page" class="text-sm text-gray-600"
              >Par page:</label
            >
            <select
              id="items-per-page"
              v-model="itemsPerPage"
              class="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              @change="currentPage = 0"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Aucune facture -->
      <div
        v-else-if="!loading && !filteredInvoices.length"
        class="text-center py-16"
      >
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <UIcon
            name="i-lucide-receipt"
            class="w-16 h-16 mx-auto mb-4 text-gray-300"
          />
          <h3 class="text-xl font-semibold text-gray-900 mb-2">
            {{
              searchQuery || statusFilter !== "all"
                ? "Aucun résultat"
                : "Aucune facture"
            }}
          </h3>
          <p class="text-gray-600 mb-6">
            {{
              searchQuery || statusFilter !== "all" || typeFilter !== "all"
                ? "Aucune facture ne correspond aux filtres appliqués"
                : "Commencez par créer votre première facture."
            }}
          </p>
          <div class="flex justify-center gap-3">
            <UButton
              v-if="
                searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
              "
              variant="soft"
              @click="resetAllFilters"
            >
              Effacer les filtres
            </UButton>
            <UButton
              v-else
              icon="i-lucide-plus"
              color="primary"
              size="lg"
              to="/facture/add"
            >
              Créer votre première facture
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
