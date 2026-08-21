<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useDeliveryNoteGenerator } from "../../composables/useDeliveryNoteGenerator";
import { useMagasinStore } from "../../composables/useMagasinStore";
import { useCurrentUser } from "../../composables/useCurrentUser";
import { useCompanySettings } from "../../composables/useCompanySettings";

const { companyId, isLoadingUser, loadCurrentUser } = useCurrentUser();
const { settings: companySettings, fetchCompanySettings } =
  useCompanySettings();

onMounted(async () => {
  if (isLoadingUser.value) {
    await loadCurrentUser();
  }
  if (companyId.value) await fetchCompanySettings(companyId.value);

  await fetchInvoices();
});

const magasinStore = useMagasinStore();

const supabase = useSupabaseClient();
const router = useRouter();

const invoices = ref([]);
const loading = ref(false);
const error = ref(null);
const successMessage = ref(null);
const downloadingDeliveryNote = ref(null);
// utilise la composable useCurrentUser pour récupérer les rôles de l'utilisateur
const { userRoles } = useCurrentUser();
const magasinIdError = ref("");

// Search and filters
const searchQuery = ref("");
const statusFilter = ref("all");
const periodFilter = ref("all");
const customStartDate = ref("");
const customEndDate = ref("");

// Charger les filtres depuis le localStorage au démarrage
const loadFiltersFromStorage = () => {
  if (import.meta.client) {
    const savedFilters = localStorage.getItem("commandes-filters");
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        searchQuery.value = filters.searchQuery || "";
        statusFilter.value = filters.statusFilter || "all";
        periodFilter.value = filters.periodFilter || "all";
        customStartDate.value = filters.customStartDate || "";
        customEndDate.value = filters.customEndDate || "";
      } catch {
        // Filtres sauvegardés illisibles : on garde les valeurs par défaut
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
      periodFilter: periodFilter.value,
      customStartDate: customStartDate.value,
      customEndDate: customEndDate.value,
    };
    localStorage.setItem("commandes-filters", JSON.stringify(filters));
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
        invoice.client_name.toLowerCase().includes(query),
    );
  }

  // Apply status filter
  if (statusFilter.value !== "all") {
    if (statusFilter.value === "delivered") {
      // Pour "delivered", on vérifie le champ delivery (boolean)
      filtered = filtered.filter((invoice) => invoice.delivery === true);
    } else if (statusFilter.value === "pending") {
      // Pour "pending", on vérifie que la livraison n'est pas faite
      filtered = filtered.filter((invoice) => invoice.delivery !== true);
    }
  }

  // Apply period filter
  if (periodFilter.value !== "all") {
    const now = new Date();
    let startDate;
    let endDate = now;

    switch (periodFilter.value) {
      case "today": {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
        );
        break;
      }
      case "yesterday": {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        startDate = new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate(),
        );
        endDate = new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate(),
          23,
          59,
          59,
        );
        break;
      }
      case "this_week": {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + 1); // Lundi
        startDate = new Date(
          weekStart.getFullYear(),
          weekStart.getMonth(),
          weekStart.getDate(),
        );
        break;
      }
      case "last_week": {
        const lastWeekStart = new Date(now);
        lastWeekStart.setDate(now.getDate() - now.getDay() - 6);
        const lastWeekEnd = new Date(now);
        lastWeekEnd.setDate(now.getDate() - now.getDay());
        startDate = new Date(
          lastWeekStart.getFullYear(),
          lastWeekStart.getMonth(),
          lastWeekStart.getDate(),
        );
        endDate = new Date(
          lastWeekEnd.getFullYear(),
          lastWeekEnd.getMonth(),
          lastWeekEnd.getDate(),
          23,
          59,
          59,
        );
        break;
      }
      case "this_month": {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      }
      case "last_month": {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        startDate = lastMonth;
        endDate = new Date(
          lastMonthEnd.getFullYear(),
          lastMonthEnd.getMonth(),
          lastMonthEnd.getDate(),
          23,
          59,
          59,
        );
        break;
      }
      case "this_year": {
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      }
      case "last_year": {
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        break;
      }
      case "custom": {
        if (customStartDate.value) {
          startDate = new Date(customStartDate.value);
        }
        if (customEndDate.value) {
          endDate = new Date(customEndDate.value);
          endDate.setHours(23, 59, 59);
        }
        break;
      }
    }

    if (startDate || endDate) {
      filtered = filtered.filter((invoice) => {
        // Reconstituer la date à partir de la date formatée française
        const [day, month, year] = invoice.date.split("/");
        const invoiceDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
        );

        if (startDate && endDate) {
          return invoiceDate >= startDate && invoiceDate <= endDate;
        } else if (startDate) {
          return invoiceDate >= startDate;
        } else if (endDate) {
          return invoiceDate <= endDate;
        }
        return true;
      });
    }
  }

  return filtered;
});

const totalPages = computed(() =>
  Math.ceil(filteredInvoices.value.length / itemsPerPage.value),
);

const paginatedInvoices = computed(() => {
  const start = currentPage.value * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredInvoices.value.slice(start, end);
});

// Reset page when filters change
watch(
  [searchQuery, statusFilter, periodFilter, customStartDate, customEndDate],
  () => {
    currentPage.value = 0;
    saveFiltersToStorage(); // Sauvegarder les filtres à chaque changement
  },
);

// Watcher séparé pour sauvegarder automatiquement les filtres
watch(
  [searchQuery, statusFilter, periodFilter, customStartDate, customEndDate],
  () => {
    saveFiltersToStorage();
  },
  { deep: true },
);

const fetchInvoices = async () => {
  // Vérifie que magasinId est bien défini et non vide
  if (!magasinStore.magasinId) {
    invoices.value = [];
    error.value = "Veuillez sélectionner un magasin.";
    loading.value = false;
    return;
  }
  try {
    loading.value = true;
    const { data, error: fetchError } = await supabase
      .from("invoices")
      .select(
        `
        *,
        magasin_id,
        clients(name)
      `,
      )
      .eq("magasin_id", magasinStore.magasinId)
      .order("date", { ascending: false });

    if (fetchError) throw fetchError;

    // Vérification du format de la réponse
    if (!Array.isArray(data)) {
      error.value =
        "Réponse inattendue du serveur. Veuillez réessayer plus tard.";
      invoices.value = [];
      return;
    }

    try {
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (parseErr) {
      error.value =
        "Erreur de format des données reçues. Contactez un administrateur.";
      invoices.value = [];
    }
  } catch (err) {
    error.value = err.message || "Erreur lors de la récupération des factures.";
    invoices.value = [];
  } finally {
    loading.value = false;
  }
};

const handleDownloadDeliveryNote = async (invoiceId) => {
  if (typeof window === "undefined") {
    error.value = "La génération du PDF n'est pas disponible côté serveur.";
    return;
  }
  try {
    downloadingDeliveryNote.value = invoiceId;
    const { downloadDeliveryNote } = useDeliveryNoteGenerator();
    await downloadDeliveryNote(invoiceId);
    successMessage.value = "Bon de livraison généré avec succès !";
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err) {
    error.value =
      err.message || "Erreur lors de la génération du bon de livraison.";
  } finally {
    downloadingDeliveryNote.value = null;
  }
};

const handlePrintDeliveryNote = async (invoiceId) => {
  if (typeof window === "undefined") {
    error.value = "L'impression du PDF n'est pas disponible côté serveur.";
    return;
  }
  try {
    downloadingDeliveryNote.value = `${invoiceId}_print`;
    const { printDeliveryNote } = useDeliveryNoteGenerator();
    await printDeliveryNote(invoiceId);
    successMessage.value = "Impression du bon de livraison lancée !";
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err) {
    error.value =
      err.message || "Erreur lors de l'impression du bon de livraison.";
  } finally {
    downloadingDeliveryNote.value = null;
  }
};

const getStatusColor = (invoice) => {
  if (invoice.delivery) {
    return "green"; // Livrée
  } else {
    return "orange"; // En attente
  }
};

const getStatusLabel = (invoice) => {
  if (invoice.delivery) {
    return "Livrée";
  } else {
    return "En attente";
  }
};

const getPaymentStatusLabel = (invoice) => {
  if (invoice.status === "paid") return "Payée";
  if (invoice.status === "partially_paid") return "Partiellement payée";
  return "Non payée";
};

const getPaymentStatusIcon = (invoice) => {
  if (invoice.status === "paid") return "i-lucide-check-circle";
  if (invoice.status === "partially_paid") return "i-lucide-alert-circle";
  return "i-lucide-x-circle";
};

const getPaymentStatusClass = (invoice) => {
  if (invoice.status === "paid") return "text-green-600";
  if (invoice.status === "partially_paid") return "text-amber-600";
  return "text-orange-600";
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
    (page) => page !== "..." || pages.indexOf(page) === pages.lastIndexOf(page),
  );
};

// Fonction pour réinitialiser tous les filtres
const resetAllFilters = () => {
  searchQuery.value = "";
  statusFilter.value = "all";
  periodFilter.value = "all";
  customStartDate.value = "";
  customEndDate.value = "";
  currentPage.value = 0;

  // Supprimer les filtres du localStorage
  if (import.meta.client) {
    localStorage.removeItem("commandes-filters");
  }
};

onMounted(() => {
  loadFiltersFromStorage(); // Charger les filtres sauvegardés
  // Attendre que magasinId soit prêt
  if (!magasinStore.magasinId) {
    const stop = watch(
      () => magasinStore.magasinId,
      (val) => {
        if (val) {
          magasinIdError.value = "";
          fetchInvoices();
          stop();
        }
      },
    );
    // Si après 2 secondes magasinId n'est toujours pas défini, afficher une erreur
    setTimeout(() => {
      if (!magasinStore.magasinId) {
        magasinIdError.value =
          "Aucun magasin sélectionné. Veuillez choisir un magasin pour afficher les commandes.";
        loading.value = false;
      }
    }, 2000);
  } else {
    fetchInvoices();
  }
});
watch(
  () => magasinStore.magasinId,
  () => {
    magasinIdError.value = "";
    fetchInvoices();
  },
);
</script>

<template>
  <div class="container mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-8">
    <!-- Header Section -->
    <div class="mb-8">
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">
            Gestion des Commandes
          </h1>
          <p class="text-gray-600 mt-1 text-sm sm:text-base">
            Gérez vos commandes et suivez les livraisons
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <UButton
            icon="i-lucide-package-plus"
            color="orange"
            variant="soft"
            size="lg"
            to="/commande/autres"
            class="shadow-lg hover:shadow-xl transition-shadow"
            :disabled="userRoles?.includes('magasinier')"
          >
            Produits Externes
          </UButton>
          <UButton
            icon="i-lucide-plus"
            color="primary"
            size="lg"
            to="/commande/add"
            class="shadow-lg hover:shadow-xl transition-shadow"
            :disabled="userRoles?.includes('magasinier')"
          >
            Nouvelle Commande
          </UButton>
        </div>
      </div>
    </div>

    <!-- Search and Filters Section -->
    <div
      class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6"
    >
      <div class="space-y-4">
        <!-- Première ligne: Recherche -->
        <div
          class="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div class="flex-1 min-w-0">
            <UInput
              v-model="searchQuery"
              placeholder="Rechercher par référence ou client..."
              icon="i-lucide-search"
              size="lg"
              class="w-full"
            />
          </div>

          <div
            class="flex flex-wrap items-center gap-6 text-xs sm:text-sm text-gray-600"
          >
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-blue-500 rounded-full" />
              <span
                >{{ filteredInvoices.length }} commande{{
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

        <!-- Deuxième ligne: Filtres -->
        <div
          class="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-wrap"
        >
          <!-- Filtre de statut -->
          <div class="flex items-center gap-2">
            <label
              for="status-filter"
              class="text-sm font-medium text-gray-700 whitespace-nowrap"
            >
              Statut :
            </label>
            <select
              id="status-filter"
              v-model="statusFilter"
              class="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Toutes</option>
              <option value="pending">En attente</option>
              <option value="delivered">Livrées</option>
            </select>
          </div>

          <!-- Filtre de période -->
          <div class="flex items-center gap-2">
            <label
              for="period-filter"
              class="text-sm font-medium text-gray-700 whitespace-nowrap"
            >
              Période :
            </label>
            <select
              id="period-filter"
              v-model="periodFilter"
              class="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Toutes</option>
              <option value="today">Aujourd'hui</option>
              <option value="yesterday">Hier</option>
              <option value="this_week">Cette semaine</option>
              <option value="last_week">Semaine dernière</option>
              <option value="this_month">Ce mois</option>
              <option value="last_month">Mois dernier</option>
              <option value="this_year">Cette année</option>
              <option value="last_year">Année dernière</option>
              <option value="custom">Personnalisé</option>
            </select>
          </div>

          <!-- Dates personnalisées (si période personnalisée sélectionnée) -->
          <div
            v-if="periodFilter === 'custom'"
            class="flex items-center gap-2 flex-wrap"
          >
            <label class="text-sm font-medium text-gray-700 whitespace-nowrap"
              >Du :</label
            >
            <input
              v-model="customStartDate"
              type="date"
              class="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <label class="text-sm font-medium text-gray-700 whitespace-nowrap"
              >Au :</label
            >
            <input
              v-model="customEndDate"
              type="date"
              class="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <!-- Bouton pour effacer tous les filtres -->
          <UButton
            v-if="
              searchQuery || statusFilter !== 'all' || periodFilter !== 'all'
            "
            variant="soft"
            color="gray"
            size="sm"
            icon="i-lucide-x"
            @click="resetAllFilters"
          >
            Effacer filtres
          </UButton>
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
        <p class="text-gray-600">Chargement des commandes...</p>
      </div>
    </div>

    <!-- Liste des commandes - Compact Layout -->
    <div v-else-if="paginatedInvoices.length" class="space-y-3">
      <div
        v-for="invoice in paginatedInvoices"
        :key="invoice.id"
        class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
      >
        <div class="p-4">
          <!-- Ligne principale compacte -->
          <div
            class="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <!-- Info commande -->
            <div class="flex items-center gap-4 min-w-0 flex-1">
              <div
                class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center text-white flex-shrink-0"
              >
                <UIcon name="i-lucide-file-text" class="w-5 h-5" />
              </div>

              <div class="min-w-0 flex-1">
                <div
                  class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-wrap"
                >
                  <h3
                    class="text-base sm:text-lg font-semibold text-gray-900 truncate"
                  >
                    {{ invoice.reference }}
                  </h3>
                  <div
                    class="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 flex-wrap"
                  >
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
            <div
              class="flex flex-col sm:flex-row items-end gap-2 sm:gap-4 flex-shrink-0"
            >
              <div class="text-right">
                <p class="text-base sm:text-xl font-bold text-gray-900">
                  {{ invoice.total.toFixed(2) }}{{ companySettings?.currency }}
                </p>
              </div>

              <div class="flex items-center gap-2 flex-wrap">
                <UBadge
                  :color="getStatusColor(invoice)"
                  :label="getStatusLabel(invoice)"
                  variant="soft"
                  size="sm"
                />
                <div class="flex items-center gap-1">
                  <UIcon
                    :name="getPaymentStatusIcon(invoice)"
                    :class="getPaymentStatusClass(invoice)"
                    class="w-4 h-4"
                  />
                  <span class="text-xs text-gray-600">{{
                    getPaymentStatusLabel(invoice)
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2 flex-shrink-0">
              <UButton
                icon="i-lucide-eye"
                variant="soft"
                color="gray"
                size="sm"
                title="Voir les détails"
                @click="router.push(`/commande/${invoice.id}`)"
              />

              <!-- Bouton principal d'impression du bon de livraison -->
              <UDropdown
                :items="[
                  [
                    {
                      label: 'Imprimer bon de livraison',
                      icon: 'i-lucide-printer',
                      click: () => handlePrintDeliveryNote(invoice.id),
                    },
                  ],
                  [
                    {
                      label: 'Télécharger bon de livraison',
                      icon: 'i-lucide-download',
                      click: () => handleDownloadDeliveryNote(invoice.id),
                    },
                  ],
                ]"
              >
                <UButton
                  icon="i-lucide-printer"
                  variant="soft"
                  color="blue"
                  size="sm"
                  :loading="
                    downloadingDeliveryNote === `${invoice.id}_print` ||
                    downloadingDeliveryNote === invoice.id
                  "
                  :disabled="
                    downloadingDeliveryNote === `${invoice.id}_print` ||
                    downloadingDeliveryNote === invoice.id
                  "
                  title="Imprimer bon de livraison"
                  @click="handlePrintDeliveryNote(invoice.id)"
                />
              </UDropdown>

              <UButton
                v-if="!invoice.delivery && !userRoles?.includes('employe')"
                icon="i-lucide-truck"
                variant="soft"
                color="green"
                size="sm"
                title="Gérer la livraison"
                to="/commande/livraison"
              />
              <UButton
                v-if="
                  invoice.status !== 'paid' &&
                  (invoice.delivery !== true ||
                    invoice.status === 'partially_paid') &&
                  !userRoles?.includes('magasinier')
                "
                icon="i-lucide-edit"
                variant="soft"
                color="primary"
                size="sm"
                title="Modifier la commande"
                @click="router.push(`/commande/edit/${invoice.id}`)"
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
                filteredInvoices.length,
              )
            }}
            sur {{ filteredInvoices.length }} commandes
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

    <!-- Aucune commande -->
    <div
      v-else-if="!loading && !filteredInvoices.length"
      class="text-center py-16"
    >
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
        <UIcon
          name="i-lucide-package"
          class="w-16 h-16 mx-auto mb-4 text-gray-300"
        />
        <h3 class="text-xl font-semibold text-gray-900 mb-2">
          {{
            searchQuery || statusFilter !== "all" || periodFilter !== "all"
              ? "Aucun résultat"
              : "Aucune commande"
          }}
        </h3>
        <p class="text-gray-600 mb-6">
          {{
            searchQuery || statusFilter !== "all" || periodFilter !== "all"
              ? "Aucune commande ne correspond aux filtres appliqués"
              : "Commencez par créer votre première commande."
          }}
        </p>
        <div class="flex justify-center gap-3">
          <UButton
            v-if="
              searchQuery || statusFilter !== 'all' || periodFilter !== 'all'
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
            to="/commande/add"
          >
            Créer votre première commande
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- Message d'erreur magasinId -->
<div
  v-if="magasinIdError"
  class="bg-white rounded-xl shadow-sm border border-orange-200 p-12 text-center mb-6"
>
</div>
