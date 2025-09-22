<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useDeliveryNoteGenerator } from "../../composables/useDeliveryNoteGenerator";
import { useMagasinStore } from "../../composables/useMagasinStore";



const supabase = useSupabaseClient();
const router = useRouter();
const magasinStore = useMagasinStore();

const orders = ref([]);
const loading = ref(false);
const error = ref(null);
const successMessage = ref(null);
const processingDelivery = ref(null);
const downloadingNote = ref(null);

// utilise la composable useCurrentUser pour récupérer les rôles de l'utilisateur
const { userRoles } = useCurrentUser();

// Search and filters
const searchQuery = ref("");
const statusFilter = ref("pending"); // Par défaut, afficher les commandes en attente
const periodFilter = ref("all");
const customStartDate = ref("");
const customEndDate = ref("");

// Pagination
const currentPage = ref(0);
const itemsPerPage = ref(6);

// Modal de confirmation de livraison
const showDeliveryModal = ref(false);
const selectedOrder = ref(null);
const deliveryNotes = ref("");
const deliveryDate = ref(new Date().toISOString().split("T")[0]);

const filteredOrders = computed(() => {
  let filtered = orders.value;

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (order) =>
        order.reference.toLowerCase().includes(query) ||
        order.client_name.toLowerCase().includes(query)
    );
  }

  // Apply status filter
  if (statusFilter.value !== "all") {
    if (statusFilter.value === "delivered") {
      filtered = filtered.filter((order) => order.delivery === true);
    } else if (statusFilter.value === "pending") {
      filtered = filtered.filter((order) => order.delivery !== true);
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
          59
        );
        break;
      }
      case "this_week": {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + 1);
        startDate = new Date(
          weekStart.getFullYear(),
          weekStart.getMonth(),
          weekStart.getDate()
        );
        break;
      }
      case "this_month": {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      }
    }

    if (startDate || endDate) {
      filtered = filtered.filter((order) => {
        const [day, month, year] = order.date.split("/");
        const orderDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        );

        if (startDate && endDate) {
          return orderDate >= startDate && orderDate <= endDate;
        } else if (startDate) {
          return orderDate >= startDate;
        } else if (endDate) {
          return orderDate <= endDate;
        }
        return true;
      });
    }
  }

  return filtered.sort((a, b) => {
    // Priorité aux commandes en attente
    if (a.delivery !== b.delivery) {
      return a.delivery ? 1 : -1;
    }
    // Puis par date (plus récentes en premier)
    return new Date(b.created_at) - new Date(a.created_at);
  });
});

const totalPages = computed(() =>
  Math.ceil(filteredOrders.value.length / itemsPerPage.value)
);

const paginatedOrders = computed(() => {
  const start = currentPage.value * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredOrders.value.slice(start, end);
});

// Reset page when filters change
watch([searchQuery, statusFilter, periodFilter], () => {
  currentPage.value = 0;
});

const fetchOrders = async () => {
  try {
    loading.value = true;
    const { data, error: fetchError } = await supabase
      .from("invoices")
      .select(
        `
        id,
        client_id,
        date,
        total,
        status,
        reference,
        created_at,
        delivery,
        delivery_date,
        delivery_notes,
        clients(name),
        magasins(nom),
        invoice_items(
          id,
          quantity,
          price,
          products_carreaux(name, unite)
        )
      `
      )
      .eq("magasin_id", magasinStore.magasinId)
      .order("created_at", { ascending: false });

    if (fetchError) throw fetchError;

    orders.value =
      data.map((order) => ({
        ...order,
        reference: order.reference || "N/A",
        client_name: order.clients?.name || "Inconnu",
        total: order.total || 0,
        status: order.status || "pending",
        delivery: order.delivery || false,
        delivery_date: order.delivery_date || null,
        delivery_notes: order.delivery_notes || null,
        date: new Date(order.date).toLocaleDateString("fr-FR"),
        items: (order.invoice_items || []).map((item) => ({
          ...item,
          products_carreaux: item.products_carreaux || {
            name: "Produit inconnu",
            unite: "unité",
          },
        })),
        items_count: (order.invoice_items || []).length,
        total_quantity: (order.invoice_items || []).reduce(
          (sum, item) => sum + (item.quantity || 0),
          0
        ),
      })) || [];
  } catch (err) {
    error.value =
      err.message || "Erreur lors de la récupération des commandes.";
  } finally {
    loading.value = false;
  }
};

const openDeliveryModal = (order) => {
  selectedOrder.value = order;
  deliveryNotes.value = "";
  deliveryDate.value = new Date().toISOString().split("T")[0];
  showDeliveryModal.value = true;
};

const confirmDelivery = async () => {
  if (!selectedOrder.value) return;

  try {
    processingDelivery.value = selectedOrder.value.id;

    const { data, error: updateError } = await supabase
      .from("invoices")
      .update({
        delivery: true,
        delivery_date: deliveryDate.value,
        delivery_notes: deliveryNotes.value || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedOrder.value.id)
      .select();

    if (updateError) throw updateError;

    if (data.length > 0) {
      // Mettre à jour la commande dans notre liste
      const orderIndex = orders.value.findIndex(
        (o) => o.id === selectedOrder.value.id
      );
      if (orderIndex !== -1) {
        orders.value[orderIndex] = {
          ...orders.value[orderIndex],
          delivery: true,
          delivery_date: deliveryDate.value,
          delivery_notes: deliveryNotes.value,
        };
      }

      successMessage.value = `Commande ${selectedOrder.value.reference} marquée comme livrée avec succès !`;
      setTimeout(() => {
        successMessage.value = null;
      }, 5000);
    }

    showDeliveryModal.value = false;
    selectedOrder.value = null;
  } catch (err) {
    error.value =
      err.message || "Erreur lors de la confirmation de la livraison.";
  } finally {
    processingDelivery.value = null;
  }
};

const cancelDelivery = async (order) => {
  if (
    !confirm(
      `Êtes-vous sûr de vouloir annuler la livraison de la commande ${order.reference} ?`
    )
  ) {
    return;
  }

  try {
    processingDelivery.value = order.id;

    const { data, error: updateError } = await supabase
      .from("invoices")
      .update({
        delivery: false,
        delivery_date: null,
        delivery_notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .select();

    if (updateError) throw updateError;

    if (data.length > 0) {
      // Mettre à jour la commande dans notre liste
      const orderIndex = orders.value.findIndex((o) => o.id === order.id);
      if (orderIndex !== -1) {
        orders.value[orderIndex] = {
          ...orders.value[orderIndex],
          delivery: false,
          delivery_date: null,
          delivery_notes: null,
        };
      }

      successMessage.value = `Livraison de la commande ${order.reference} annulée avec succès !`;
      setTimeout(() => {
        successMessage.value = null;
      }, 5000);
    }
  } catch (err) {
    error.value = err.message || "Erreur lors de l'annulation de la livraison.";
  } finally {
    processingDelivery.value = null;
  }
};

const _handleDownloadDeliveryNote = async (orderId) => {
  try {
    downloadingNote.value = orderId;
    const { downloadDeliveryNote } = useDeliveryNoteGenerator();
    await downloadDeliveryNote(orderId);
    successMessage.value = "Bon de livraison généré avec succès !";
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err) {
    error.value =
      err.message || "Erreur lors de la génération du bon de livraison.";
  } finally {
    downloadingNote.value = null;
  }
};

const _handlePrintDeliveryNote = async (orderId) => {
  try {
    downloadingNote.value = `${orderId}_print`;
    const { printDeliveryNote } = useDeliveryNoteGenerator();
    await printDeliveryNote(orderId);
    successMessage.value = "Impression du bon de livraison lancée !";
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err) {
    error.value =
      err.message || "Erreur lors de l'impression du bon de livraison.";
  } finally {
    downloadingNote.value = null;
  }
};

const getStatusColor = (order) => {
  if (order.delivery) {
    return "green";
  } else {
    return "orange";
  }
};

const getStatusLabel = (order) => {
  if (order.delivery) {
    return "Livrée";
  } else {
    return "En attente";
  }
};

const resetFilters = () => {
  searchQuery.value = "";
  statusFilter.value = "pending";
  periodFilter.value = "all";
  customStartDate.value = "";
  customEndDate.value = "";
  currentPage.value = 0;
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

onMounted(() => {
  fetchOrders();
});
</script>

<template>
  <div class="container mx-auto px-6 py-8">
    <!-- Header Section -->
    <div class="mb-8">
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 class="text-3xl font-bold text-gray-900">
            Gestion des Livraisons
          </h1>
          <p class="text-gray-600 mt-1">
            Gérez et validez les livraisons de vos commandes
          </p>
        </div>
        <div class="flex items-center gap-6 text-sm">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 bg-orange-500 rounded-full" />
            <span class="text-gray-600">
              {{ filteredOrders.filter((o) => !o.delivery).length }} En attente
            </span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 bg-green-500 rounded-full" />
            <span class="text-gray-600">
              {{ filteredOrders.filter((o) => o.delivery).length }} Livrées
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters Section -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div class="space-y-3">
        <!-- Search and quick filters -->
        <div
          class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
        >
          <div class="flex-1 max-w-sm">
            <UInput
              v-model="searchQuery"
              placeholder="Rechercher par référence ou client..."
              icon="i-lucide-search"
              size="md"
              class="w-full"
            />
          </div>

          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <label
                for="status-filter"
                class="text-xs font-medium text-gray-700 whitespace-nowrap"
              >
                Statut :
              </label>
              <select
                id="status-filter"
                v-model="statusFilter"
                class="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Toutes</option>
                <option value="pending">En attente</option>
                <option value="delivered">Livrées</option>
              </select>
            </div>

            <div class="flex items-center gap-2">
              <label
                for="period-filter"
                class="text-xs font-medium text-gray-700 whitespace-nowrap"
              >
                Période :
              </label>
              <select
                id="period-filter"
                v-model="periodFilter"
                class="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Toutes</option>
                <option value="today">Aujourd'hui</option>
                <option value="this_week">Cette semaine</option>
                <option value="this_month">Ce mois</option>
              </select>
            </div>

            <UButton
              v-if="
                searchQuery ||
                statusFilter !== 'pending' ||
                periodFilter !== 'all'
              "
              variant="soft"
              color="gray"
              size="xs"
              icon="i-lucide-x"
              @click="resetFilters"
            >
              Reset
            </UButton>
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
        <UButton
          variant="soft"
          color="red"
          size="sm"
          icon="i-lucide-x"
          class="ml-auto"
          @click="error = null"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-16">
      <div class="text-center">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"
        />
        <p class="text-gray-600">Chargement des commandes...</p>
      </div>
    </div>

    <!-- Orders List -->
    <div v-else-if="paginatedOrders.length" class="space-y-3">
      <div
        v-for="order in paginatedOrders"
        :key="order.id"
        class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
      >
        <div class="p-3">
          <!-- Order header -->
          <div class="flex items-start justify-between gap-3 mb-2">
            <div class="flex items-start gap-2 flex-1">
              <div
                :class="[
                  'w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0',
                  order.delivery
                    ? 'bg-gradient-to-br from-green-500 to-green-600'
                    : 'bg-gradient-to-br from-orange-500 to-orange-600',
                ]"
              >
                <UIcon
                  :name="
                    order.delivery ? 'i-lucide-check-circle' : 'i-lucide-clock'
                  "
                  class="w-4 h-4"
                />
              </div>

              <div class="flex-1">
                <div class="flex items-center gap-2 flex-wrap mb-1">
                  <h3 class="text-sm font-semibold text-gray-900">
                    {{ order.reference }}
                  </h3>
                  <UBadge
                    :color="getStatusColor(order)"
                    :label="getStatusLabel(order)"
                    variant="soft"
                    size="xs"
                  />
                </div>

                <div
                  class="flex items-center gap-3 text-xs text-gray-600 flex-wrap"
                >
                  <div class="flex items-center gap-1">
                    <UIcon name="i-lucide-user" class="w-3 h-3" />
                    <span>{{ order.client_name }}</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <UIcon name="i-lucide-calendar" class="w-3 h-3" />
                    <span>{{ order.date }}</span>
                  </div>
                </div>

                <!-- Delivery info if delivered -->
                <div
                  v-if="order.delivery"
                  class="mt-1 p-1 bg-green-50 rounded border border-green-200"
                >
                  <div class="flex items-center gap-2 text-xs text-green-700">
                    <UIcon name="i-lucide-truck" class="w-3 h-3" />
                    <span v-if="order.delivery_date">
                      {{
                        new Date(order.delivery_date).toLocaleDateString(
                          "fr-FR"
                        )
                      }}
                    </span>
                    <span v-if="order.delivery_notes" class="truncate">
                      - {{ order.delivery_notes }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Total and actions -->
            <div class="text-right flex-shrink-0">
              <div class="flex items-center gap-1 justify-end flex-wrap">
                <!-- Delivery actions -->
                <div v-if="!userRoles?.includes('employe')">
                  <UButton
                    v-if="!order.delivery"
                    icon="i-lucide-truck"
                    variant="solid"
                    color="green"
                    size="xs"
                    title="Confirmer la livraison"
                    :loading="processingDelivery === order.id"
                    :disabled="processingDelivery === order.id"
                    @click="openDeliveryModal(order)"
                  >
                    Livrer
                  </UButton>

                  <UButton
                    v-else
                    icon="i-lucide-undo"
                    variant="soft"
                    color="orange"
                    size="xs"
                    title="Annuler la livraison"
                    :loading="processingDelivery === order.id"
                    :disabled="processingDelivery === order.id"
                    @click="cancelDelivery(order)"
                  >
                    Annuler
                  </UButton>
                </div>

                <!-- View details -->
                <UButton
                  icon="i-lucide-eye"
                  variant="soft"
                  color="gray"
                  size="xs"
                  title="Voir les détails"
                  @click="router.push(`/commande/${order.id}`)"
                />
              </div>
            </div>
          </div>

          <!-- Items summary - Supprimé pour simplifier -->
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div
      v-if="!loading && filteredOrders.length > itemsPerPage"
      class="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-4"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm text-gray-600">
          <span>
            Affichage {{ currentPage * itemsPerPage + 1 }} -
            {{
              Math.min((currentPage + 1) * itemsPerPage, filteredOrders.length)
            }}
            sur {{ filteredOrders.length }} commandes
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
            class="text-xs border border-gray-300 rounded px-1 py-1 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            @change="currentPage = 0"
          >
            <option value="4">4</option>
            <option value="6">6</option>
            <option value="8">8</option>
            <option value="10">10</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!loading && !filteredOrders.length"
      class="text-center py-16"
    >
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
        <UIcon
          name="i-lucide-truck"
          class="w-16 h-16 mx-auto mb-4 text-gray-300"
        />
        <h3 class="text-xl font-semibold text-gray-900 mb-2">
          {{
            searchQuery || statusFilter !== "pending" || periodFilter !== "all"
              ? "Aucun résultat"
              : "Aucune commande à livrer"
          }}
        </h3>
        <p class="text-gray-600 mb-6">
          {{
            searchQuery || statusFilter !== "pending" || periodFilter !== "all"
              ? "Aucune commande ne correspond aux filtres appliqués"
              : "Toutes les commandes ont été livrées ou il n'y a pas encore de commandes."
          }}
        </p>
        <div class="flex justify-center gap-3">
          <UButton
            v-if="
              searchQuery ||
              statusFilter !== 'pending' ||
              periodFilter !== 'all'
            "
            variant="soft"
            @click="resetFilters"
          >
            Effacer les filtres
          </UButton>
          <UButton icon="i-lucide-list" color="primary" to="/commande">
            Voir toutes les commandes
          </UButton>
        </div>
      </div>
    </div>

    <!-- Delivery Confirmation Modal -->
    <UModal
      v-model:open="showDeliveryModal"
      title="Confirmer la livraison"
      :description="`Commande ${selectedOrder?.reference} - ${selectedOrder?.client_name}`"
    >
      <template #body>
        <div class="space-y-4">
          <div>
            <label
              for="delivery-date"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Date de livraison
            </label>
            <input
              id="delivery-date"
              v-model="deliveryDate"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            >
          </div>

          <div>
            <label
              for="delivery-notes"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Notes de livraison (optionnel)
            </label>
            <textarea
              id="delivery-notes"
              v-model="deliveryNotes"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Ajouter des notes sur la livraison..."
            />
          </div>
        </div>
      </template>

      <template #footer="{ close }">
        <div class="flex justify-end gap-3">
          <UButton
            variant="soft"
            color="gray"
            :disabled="processingDelivery"
            @click="close"
          >
            Annuler
          </UButton>
          <UButton
            color="green"
            icon="i-lucide-check"
            :loading="processingDelivery === selectedOrder?.id"
            :disabled="
              processingDelivery === selectedOrder?.id || !deliveryDate
            "
            @click="confirmDelivery"
          >
            Confirmer la livraison
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
/* Styles additionnels si nécessaire */
.container {
  max-width: 1400px;
}
</style>
