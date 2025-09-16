<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useMagasinStore } from "../../composables/useMagasinStore";

const magasinStore = useMagasinStore();
const supabase = useSupabaseClient();
const clients = ref([]);
const loading = ref(true);
const error = ref(null);

const searchQuery = ref("");
const filteredClients = computed(() => {
  if (!searchQuery.value) return clients.value;
  const query = searchQuery.value.toLowerCase();
  return clients.value.filter(
    (client) =>
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      (client.phone && client.phone.toLowerCase().includes(query)) ||
      (client.address && client.address.toLowerCase().includes(query))
  );
});

const expandedInvoices = ref(new Set());

// Pagination
const currentPage = ref(0);
const itemsPerPage = ref(10);
const totalPages = computed(() =>
  Math.ceil(filteredClients.value.length / itemsPerPage.value)
);
const paginatedClients = computed(() => {
  const start = currentPage.value * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredClients.value.slice(start, end);
});

// Reset page when search changes
watch(searchQuery, () => {
  currentPage.value = 0;
});

const fetchClientsWithInvoices = async () => {
  // Vérifie que magasinId est bien défini et non vide
  if (!magasinStore.magasinId) {
    clients.value = [];
    error.value = "Veuillez sélectionner un magasin.";
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = null;

  try {
    const { data, error: fetchError } = await supabase
      .from("clients")
      .select(
        `
        id,
        name,
        email,
        phone,
        address,
        magasin_id,
        invoices (
          id,
          reference,
          date,
          total,
          status
        )
      `
      )
      .eq("magasin_id", magasinStore.magasinId);

    if (fetchError) throw fetchError;
    clients.value = data || [];
  } catch (err) {
    error.value = err.message || "Erreur lors de la récupération des données.";
  } finally {
    loading.value = false;
  }
};

// utilise la composable useCurrentUser pour récupérer les rôles de l'utilisateur
const { userRoles } = useCurrentUser();

const toggleInvoices = (clientId) => {
  if (expandedInvoices.value.has(clientId)) {
    expandedInvoices.value.delete(clientId);
  } else {
    expandedInvoices.value.add(clientId);
  }
};

// Fonction pour formater les montants
const formatCurrency = (amount) => {
  if (!amount) return "0";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Fonction pour calculer les statistiques des factures d'un client
const getClientInvoiceStats = (invoices) => {
  if (!invoices || invoices.length === 0) {
    return {
      total: 0,
      count: 0,
      paid: 0,
      pending: 0,
      unpaid: 0,
      paidAmount: 0,
      pendingAmount: 0,
      unpaidAmount: 0,
    };
  }

  const paid = invoices.filter((inv) => inv.status === "paid");
  const pending = invoices.filter((inv) => inv.status === "pending");
  const unpaid = invoices.filter(
    (inv) => inv.status !== "paid" && inv.status !== "pending"
  );

  return {
    total: invoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
    count: invoices.length,
    paid: paid.length,
    pending: pending.length,
    unpaid: unpaid.length,
    paidAmount: paid.reduce((sum, inv) => sum + (inv.total || 0), 0),
    pendingAmount: pending.reduce((sum, inv) => sum + (inv.total || 0), 0),
    unpaidAmount: unpaid.reduce((sum, inv) => sum + (inv.total || 0), 0),
  };
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

    if (current > 3) {
      pages.push("...");
    }

    const start = Math.max(1, current - 1);
    const end = Math.min(total - 2, current + 1);

    for (let i = start; i <= end; i++) {
      if (i !== 0 && i !== total - 1) {
        pages.push(i);
      }
    }

    if (current < total - 4) {
      pages.push("...");
    }

    if (total > 1) {
      pages.push(total - 1);
    }
  }

  return pages.filter(
    (page) => page !== "..." || pages.indexOf(page) === pages.lastIndexOf(page)
  );
};

onMounted(() => {
  fetchClientsWithInvoices();
});
watch(() => magasinStore.magasinId, fetchClientsWithInvoices);
</script>

<template>
  <div class="container mx-auto px-6 py-8">
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
      <!-- Header Section -->
      <div class="mb-8">
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 class="text-3xl font-bold text-gray-900">
              Gestion des Clients
            </h1>
            <p class="text-gray-600 mt-1">
              Gérez vos clients et suivez leurs factures
            </p>
          </div>
          <UButton
            v-if="
              userRoles?.includes('admin') || userRoles?.includes('employe')
            "
            icon="i-lucide-user-plus"
            color="primary"
            size="lg"
            to="/client/add"
            class="shadow-lg hover:shadow-xl transition-shadow"
          >
            Nouveau Client
          </UButton>
        </div>
      </div>

      <!-- Search and Stats Section -->
      <div
        class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6"
      >
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div class="flex-1 max-w-md">
            <UInput
              v-model="searchQuery"
              placeholder="Rechercher un client par nom, email..."
              icon="i-lucide-search"
              size="lg"
              class="w-full"
            />
          </div>
          <div class="flex items-center gap-6 text-sm text-gray-600">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-green-500 rounded-full" />
              <span
                >{{ filteredClients.length }} client{{
                  filteredClients.length > 1 ? "s" : ""
                }}</span
              >
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-blue-500 rounded-full" />
              <span>
                {{
                  filteredClients.reduce(
                    (sum, client) => sum + (client.invoices?.length || 0),
                    0
                  )
                }}
                facture{{
                  filteredClients.reduce(
                    (sum, client) => sum + (client.invoices?.length || 0),
                    0
                  ) > 1
                    ? "s"
                    : ""
                }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-emerald-500 rounded-full" />
              <span>
                {{
                  formatCurrency(
                    filteredClients.reduce(
                      (sum, client) =>
                        sum +
                        (client.invoices?.reduce(
                          (invSum, inv) => invSum + inv.total,
                          0
                        ) || 0),
                      0
                    )
                  )
                }}
                FCFA
              </span>
            </div>
            <div
              v-if="filteredClients.length > itemsPerPage"
              class="flex items-center gap-2"
            >
              <div class="w-3 h-3 bg-purple-500 rounded-full" />
              <span>Page {{ currentPage + 1 }}/{{ totalPages }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Chargement -->
      <div v-if="loading" class="flex justify-center items-center py-16">
        <div class="text-center">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"
          />
          <p class="text-gray-600">Chargement des clients...</p>
        </div>
      </div>

      <!-- Erreur -->
      <div
        v-if="error"
        class="bg-red-50 border border-red-200 text-red-800 p-4 mb-6 rounded-xl flex items-center gap-3"
      >
        <UIcon name="i-lucide-alert-circle" class="w-5 h-5 text-red-500" />
        <p>{{ error }}</p>
      </div>

      <!-- Liste des clients - Format professionnel et compact -->
      <div v-if="!loading && paginatedClients.length">
        <!-- Vue Desktop -->
        <div
          class="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
        >
          <!-- En-tête du tableau -->
          <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div
              class="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700"
            >
              <div class="col-span-4">Client</div>
              <div class="col-span-3">Contact</div>
              <div class="col-span-2">Factures</div>
              <div class="col-span-2">Totaux & Statuts</div>
              <div class="col-span-1">Actions</div>
            </div>
          </div>

          <!-- Lignes des clients -->
          <div class="divide-y divide-gray-100">
            <div
              v-for="client in paginatedClients"
              :key="client.id"
              class="px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div class="grid grid-cols-12 gap-4 items-center">
                <!-- Informations client -->
                <div class="col-span-4">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                    >
                      {{ client.name.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <h4 class="font-medium text-gray-900">
                        {{ client.name }}
                      </h4>
                      <p
                        v-if="client.address"
                        class="text-sm text-gray-500 truncate max-w-48"
                      >
                        {{ client.address }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Contact -->
                <div class="col-span-3">
                  <div class="space-y-1">
                    <p class="text-sm text-gray-900">{{ client.email }}</p>
                    <p v-if="client.phone" class="text-sm text-gray-500">
                      {{ client.phone }}
                    </p>
                  </div>
                </div>

                <!-- Statistiques factures -->
                <div class="col-span-2">
                  <div class="text-center">
                    <p class="text-lg font-semibold text-gray-900">
                      {{ getClientInvoiceStats(client.invoices).count }}
                    </p>
                    <p class="text-xs text-gray-500">Factures</p>
                  </div>
                </div>

                <!-- Totaux et Statuts -->
                <div class="col-span-2">
                  <div class="space-y-2">
                    <!-- Montant total -->
                    <div class="text-center">
                      <p class="text-base font-semibold text-green-600">
                        {{
                          formatCurrency(
                            getClientInvoiceStats(client.invoices).total
                          )
                        }}
                        FCFA
                      </p>
                    </div>

                    <!-- Statuts de paiement -->
                    <div v-if="client.invoices?.length" class="space-y-1">
                      <div
                        v-if="getClientInvoiceStats(client.invoices).paid > 0"
                        class="flex justify-center"
                      >
                        <UBadge
                          color="green"
                          variant="soft"
                          size="xs"
                          class="px-2 text-green-600 bg-green-100"
                        >
                          {{ getClientInvoiceStats(client.invoices).paid }}
                          Versées
                        </UBadge>
                      </div>
                      <div
                        v-if="getClientInvoiceStats(client.invoices).unpaid > 0"
                        class="flex justify-center"
                      >
                        <UBadge
                          color="red"
                          variant="soft"
                          size="xs"
                          class="px-2 text-red-600 bg-red-100"
                        >
                          {{ getClientInvoiceStats(client.invoices).unpaid }}
                          Impayées
                        </UBadge>
                      </div>
                      <div
                        v-if="
                          getClientInvoiceStats(client.invoices).pending > 0
                        "
                        class="flex justify-center"
                      >
                        <UBadge
                          color="yellow"
                          variant="soft"
                          size="xs"
                          class="px-2"
                        >
                          {{ getClientInvoiceStats(client.invoices).pending }}
                          En attente
                        </UBadge>
                      </div>
                    </div>
                    <div v-else class="text-center">
                      <p class="text-xs text-gray-400">-</p>
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="col-span-1">
                  <div class="flex items-center gap-1">
                    <UButton
                      icon="i-lucide-edit"
                      color="gray"
                      variant="ghost"
                      size="sm"
                      :to="`/client/edit/${client.id}`"
                      class="hover:bg-blue-50 hover:text-blue-600"
                    />

                    <UButton
                      v-if="client.invoices?.length"
                      :icon="
                        expandedInvoices.has(client.id)
                          ? 'i-lucide-chevron-up'
                          : 'i-lucide-chevron-down'
                      "
                      color="gray"
                      variant="ghost"
                      size="sm"
                      class="hover:bg-gray-100"
                      @click="toggleInvoices(client.id)"
                    />
                  </div>
                </div>
              </div>

              <!-- Factures détaillées (expandable) -->
              <div
                v-if="
                  expandedInvoices.has(client.id) && client.invoices?.length
                "
                class="mt-4 pl-13 border-l-2 border-blue-100"
              >
                <div class="bg-gray-50 rounded-lg p-4">
                  <h5 class="font-medium text-gray-900 mb-3 text-sm">
                    Factures détaillées
                  </h5>
                  <div class="space-y-2">
                    <div
                      v-for="invoice in client.invoices.slice(0, 5)"
                      :key="invoice.id"
                      class="flex items-center justify-between py-2 px-3 bg-white rounded border"
                    >
                      <div class="flex items-center gap-3">
                        <UIcon
                          name="i-lucide-receipt"
                          class="w-4 h-4 text-gray-400"
                        />
                        <div>
                          <p class="font-medium text-sm">
                            {{
                              invoice.reference || `#${invoice.id.slice(-6)}`
                            }}
                          </p>
                          <p class="text-xs text-gray-500">
                            {{
                              new Date(invoice.date).toLocaleDateString("fr-FR")
                            }}
                          </p>
                        </div>
                      </div>
                      <div class="flex items-center gap-3">
                        <span class="font-semibold text-sm text-gray-900">
                          {{ formatCurrency(invoice.total) }} FCFA
                        </span>
                        <UBadge
                          :color="
                            invoice.status === 'paid'
                              ? 'green'
                              : invoice.status === 'pending'
                              ? 'yellow'
                              : 'red'
                          "
                          variant="soft"
                          size="xs"
                        >
                          {{
                            invoice.status === "paid"
                              ? "Payée"
                              : invoice.status === "pending"
                              ? "En attente"
                              : "Impayée"
                          }}
                        </UBadge>
                      </div>
                    </div>
                    <div
                      v-if="client.invoices.length > 5"
                      class="text-center pt-2"
                    >
                      <span class="text-xs text-gray-500">
                        ... et {{ client.invoices.length - 5 }} autres factures
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Vue Mobile -->
        <div class="lg:hidden space-y-3">
          <div
            v-for="client in paginatedClients"
            :key="client.id"
            class="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <!-- En-tête mobile -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3 flex-1">
                <div
                  class="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-semibold"
                >
                  {{ client.name.charAt(0).toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-semibold text-gray-900 truncate">
                    {{ client.name }}
                  </h4>
                  <p class="text-sm text-gray-600 truncate">
                    {{ client.email }}
                  </p>
                  <p v-if="client.phone" class="text-sm text-gray-500">
                    {{ client.phone }}
                  </p>
                </div>
              </div>
              <div class="flex gap-1 ml-2">
                <UButton
                  icon="i-lucide-edit"
                  color="gray"
                  variant="ghost"
                  size="sm"
                  :to="`/client/edit/${client.id}`"
                />
              </div>
            </div>

            <!-- Stats mobile -->
            <div class="grid grid-cols-2 gap-4 py-3 border-t border-gray-100">
              <!-- Colonne gauche: Nombre de factures -->
              <div class="text-center">
                <p class="text-lg font-bold text-gray-900">
                  {{ getClientInvoiceStats(client.invoices).count }}
                </p>
                <p class="text-xs text-gray-500">Factures</p>
              </div>

              <!-- Colonne droite: Totaux et statuts -->
              <div class="space-y-2">
                <!-- Montant total -->
                <div class="text-center">
                  <p class="text-base font-bold text-green-600 leading-tight">
                    {{
                      formatCurrency(
                        getClientInvoiceStats(client.invoices).total
                      )
                    }}
                    FCFA
                  </p>
                </div>

                <!-- Statuts de paiement -->
                <div v-if="client.invoices?.length" class="space-y-1">
                  <div
                    v-if="getClientInvoiceStats(client.invoices).paid > 0"
                    class="flex justify-center"
                  >
                    <UBadge color="green" size="xs" class="text-xs px-2">
                      {{ getClientInvoiceStats(client.invoices).paid }} Payées
                    </UBadge>
                  </div>
                  <div
                    v-if="getClientInvoiceStats(client.invoices).unpaid > 0"
                    class="flex justify-center"
                  >
                    <UBadge color="red" size="xs" class="text-xs px-2">
                      {{ getClientInvoiceStats(client.invoices).unpaid }}
                      Impayées
                    </UBadge>
                  </div>
                  <div
                    v-if="getClientInvoiceStats(client.invoices).pending > 0"
                    class="flex justify-center"
                  >
                    <UBadge color="yellow" size="xs" class="text-xs px-2">
                      {{ getClientInvoiceStats(client.invoices).pending }}
                      Attente
                    </UBadge>
                  </div>
                </div>
                <div v-else class="text-center">
                  <p class="text-xs text-gray-400">-</p>
                </div>
              </div>
            </div>

            <!-- Bouton voir factures mobile -->
            <div
              v-if="client.invoices?.length"
              class="border-t border-gray-100 pt-3 mt-3"
            >
              <UButton
                :icon="
                  expandedInvoices.has(client.id)
                    ? 'i-lucide-chevron-up'
                    : 'i-lucide-chevron-down'
                "
                variant="ghost"
                size="sm"
                class="w-full justify-center"
                @click="toggleInvoices(client.id)"
              >
                {{ expandedInvoices.has(client.id) ? "Masquer" : "Voir" }} les
                factures
              </UButton>

              <!-- Factures mobile expandable -->
              <div
                v-if="expandedInvoices.has(client.id)"
                class="mt-3 space-y-2"
              >
                <div
                  v-for="invoice in client.invoices.slice(0, 3)"
                  :key="invoice.id"
                  class="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <div>
                    <p class="font-medium text-sm">
                      {{ invoice.reference || `#${invoice.id.slice(-6)}` }}
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ new Date(invoice.date).toLocaleDateString("fr-FR") }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="font-semibold text-sm text-gray-900">
                      {{ formatCurrency(invoice.total) }} FCFA
                    </p>
                    <UBadge
                      :color="
                        invoice.status === 'paid'
                          ? 'green'
                          : invoice.status === 'pending'
                          ? 'yellow'
                          : 'red'
                      "
                      size="xs"
                    >
                      {{
                        invoice.status === "paid"
                          ? "Payée"
                          : invoice.status === "pending"
                          ? "Attente"
                          : "Impayée"
                      }}
                    </UBadge>
                  </div>
                </div>
                <div v-if="client.invoices.length > 3" class="text-center">
                  <span class="text-xs text-gray-500">
                    ... et {{ client.invoices.length - 3 }} autres
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="!loading && filteredClients.length > itemsPerPage"
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
                  filteredClients.length
                )
              }}
              sur {{ filteredClients.length }} clients
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

      <!-- Aucun client -->
      <div v-if="!loading && !filteredClients.length" class="text-center py-16">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <UIcon
            name="i-lucide-users"
            class="w-16 h-16 mx-auto mb-4 text-gray-300"
          />
          <h3 class="text-xl font-semibold text-gray-900 mb-2">
            {{ searchQuery ? "Aucun résultat" : "Aucun client" }}
          </h3>
          <p class="text-gray-600 mb-6">
            {{
              searchQuery
                ? `Aucun client ne correspond à "${searchQuery}"`
                : "Commencez par ajouter votre premier client pour gérer vos relations commerciales."
            }}
          </p>
          <div class="flex justify-center gap-3">
            <UButton
              v-if="searchQuery"
              variant="soft"
              @click="searchQuery = ''"
            >
              Effacer la recherche
            </UButton>
            <UButton
              v-else
              icon="i-lucide-user-plus"
              color="primary"
              size="lg"
              to="/client/add"
            >
              Ajouter votre premier client
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
