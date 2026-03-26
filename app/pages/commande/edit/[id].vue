<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useCompanySettings } from "../../../composables/useCompanySettings";

const { companyId, isLoadingUser, loadCurrentUser } = useCurrentUser();
const { settings: companySettings, fetchCompanySettings } =
  useCompanySettings();

onMounted(async () => {
  if (isLoadingUser.value) {
    await loadCurrentUser();
  }
  if (companyId.value) await fetchCompanySettings(companyId.value);
});

const supabase = useSupabaseClient();
const router = useRouter();
const route = useRoute();

// ID de la facture à modifier
const invoiceId = route.params.id;

// utilise la composable useCurrentUser pour récupérer les rôles de l'utilisateur
const { userRoles } = useCurrentUser();

// Données de l'entreprise calculées
const companyInfo = computed(() => ({
  name: companySettings.value?.company_name || "Nom de l'entreprise",
  address: companySettings.value?.company_address || "Adresse de l'entreprise",
  phone: companySettings.value?.company_phone || "Téléphone",
  email: companySettings.value?.company_email || "email@entreprise.com",
  siret: companySettings.value?.company_siret || "N° SIRET",
  vatNumber: companySettings.value?.vat_number || "N° TVA",
}));

// Données de la facture
const invoiceData = ref({
  id: null,
  number: "",
  date: "",
  status: "pending",
  client_id: null,
  total: 0,
  delivery: false,
  magasin_id: null,
});

const clients = ref([]);
const products = ref([]);
const selectedClient = ref(null);
const invoiceItems = ref([]);
const originalItems = ref([]); // Pour comparer les changements de stock
const newItem = ref({
  product: null,
  quantity: 1,
  price: 0,
  description: "",
});

// États calculés
const subtotal = computed(() => {
  return invoiceItems.value.reduce((sum, item) => sum + item.total, 0);
});

// Utiliser le taux de TVA des paramètres d'entreprise
const taxRate = computed(() => (companySettings.value?.tax_rate || 20) / 100);
const taxAmount = computed(() => subtotal.value * taxRate.value);
const total = computed(() => subtotal.value + taxAmount.value);

// États de l'interface
const loading = ref(true);
const error = ref(null);
const loadingClients = ref(false);
const loadingProducts = ref(false);
const loadingSubmit = ref(false);
const successMessage = ref("");

// Fonction pour calculer le stock disponible pour un produit donné
const getAvailableStock = (product) => {
  if (!product) return 0;

  // Quantité déjà utilisée dans la facture originale pour ce produit
  const originalQuantity = originalItems.value
    .filter((item) => item.product_id === product.id)
    .reduce((sum, item) => sum + item.quantity, 0);

  // Quantité actuellement ajoutée dans l'interface
  const currentQuantity = invoiceItems.value
    .filter((item) => item.product_id === product.id)
    .reduce((sum, item) => sum + item.quantity, 0);

  // Stock disponible = stock du produit + quantité originale - quantité actuelle
  return product.stock + originalQuantity - currentQuantity;
};

const fetchInvoice = async () => {
  try {
    loading.value = true;
    error.value = null;

    // Étape 1: Récupérer la facture (sans jointe imbriquée problématique)
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(
        `
        *,
        clients(id, name, email, phone, address)
      `,
      )
      .eq("id", invoiceId)
      .single();

    if (invoiceError) throw invoiceError;

    if (!invoice) {
      throw new Error("Facture non trouvée");
    }

    // Étape 2: Récupérer les articles séparément
    const { data: itemsData, error: itemsError } = await supabase
      .from("invoice_items")
      .select(
        `
        id,
        product_id,
        quantity,
        price,
        is_external,
        external_reference,
        external_description,
        products_carreaux(id, reference, name, price, stock)
      `,
      )
      .eq("invoice_id", invoiceId);

    if (itemsError) throw itemsError;

    // Remplir les données de la facture
    invoiceData.value = {
      id: invoice.id,
      number: invoice.reference,
      date: invoice.date,
      status: invoice.status,
      client_id: invoice.client_id,
      total: invoice.total,
      delivery: invoice.delivery || false,
      magasin_id: invoice.magasin_id || null,
    };

    // Remplir le client sélectionné
    selectedClient.value = invoice.clients;

    // Remplir les items de la facture
    invoiceItems.value = (itemsData || []).map((item) => ({
      id: item.id,
      product_id: item.product_id,
      reference: item.is_external
        ? item.external_reference
        : item.products_carreaux?.reference || "N/A",
      description: item.is_external
        ? item.external_description
        : item.products_carreaux?.name || "Produit inconnu",
      quantity: item.quantity,
      price: item.price,
      total: item.quantity * item.price,
      product: item.products_carreaux,
      is_external: item.is_external,
    }));

    // Sauvegarder les items originaux pour le calcul du stock
    originalItems.value = [...invoiceItems.value];
  } catch (err) {
    console.error("Erreur lors de la récupération de la facture:", err);
    error.value =
      err.message || "Erreur lors de la récupération de la facture.";
  } finally {
    loading.value = false;
  }
};

const fetchClients = async () => {
  try {
    loadingClients.value = true;
    error.value = null;

    const { data, error: fetchError } = await supabase
      .from("clients")
      .select("id, name, email, phone, address")
      .order("name", { ascending: true });

    if (fetchError) throw fetchError;
    clients.value = data || [];

    if (clients.value.length === 0) {
      error.value =
        "Aucun client trouvé. Veuillez d'abord ajouter des clients.";
    }
  } catch (err) {
    console.error("Erreur lors de la récupération des clients:", err);
    error.value = err.message || "Erreur lors de la récupération des clients.";
  } finally {
    loadingClients.value = false;
  }
};

const fetchProducts = async () => {
  try {
    loadingProducts.value = true;
    error.value = null;

    const { data, error: fetchError } = await supabase
      .from("products_carreaux")
      .select("id, reference, name, stock, price")
      .order("name", { ascending: true });

    if (fetchError) throw fetchError;
    products.value = data || [];

    if (products.value.length === 0) {
      error.value =
        "Aucun produit trouvé. Veuillez d'abord ajouter des produits au stock.";
    }
  } catch (err) {
    console.error("Erreur lors de la récupération des produits:", err);
    error.value = err.message || "Erreur lors de la récupération des produits.";
  } finally {
    loadingProducts.value = false;
  }
};

const addItem = () => {
  error.value = null;
  successMessage.value = "";

  if (!newItem.value.product || newItem.value.quantity <= 0) {
    error.value = "Veuillez sélectionner un produit et une quantité valide.";
    return;
  }

  // Vérifier le stock disponible
  const availableStock = getAvailableStock(newItem.value.product);
  if (newItem.value.quantity > availableStock) {
    error.value = `Quantité demandée (${newItem.value.quantity}) dépasse le stock disponible (${availableStock}).`;
    return;
  }

  invoiceItems.value.push({
    id: null, // Nouveau item, pas encore en base
    product_id: newItem.value.product.id,
    reference: newItem.value.product.reference,
    description: newItem.value.product.name,
    quantity: newItem.value.quantity,
    price: newItem.value.price || newItem.value.product.price,
    total:
      newItem.value.quantity *
      (newItem.value.price || newItem.value.product.price),
    product: newItem.value.product,
  });

  resetItemForm();
  successMessage.value = "Article ajouté avec succès !";

  setTimeout(() => {
    if (successMessage.value === "Article ajouté avec succès !") {
      successMessage.value = "";
    }
  }, 3000);
};

const removeItem = (index) => {
  const removedItem = invoiceItems.value[index];
  invoiceItems.value.splice(index, 1);

  successMessage.value = `Article "${removedItem.description}" supprimé avec succès !`;
  error.value = null;

  setTimeout(() => {
    if (successMessage.value.includes("supprimé avec succès")) {
      successMessage.value = "";
    }
  }, 3000);
};

const resetItemForm = () => {
  newItem.value = {
    product: null,
    quantity: 1,
    price: 0,
    description: "",
  };
};

const handleSubmit = async () => {
  error.value = null;
  successMessage.value = "";
  loadingSubmit.value = true;

  if (!selectedClient.value) {
    error.value = "Veuillez sélectionner un client.";
    loadingSubmit.value = false;
    return;
  }

  if (invoiceItems.value.length === 0) {
    error.value = "Veuillez ajouter au moins un article à la facture.";
    loadingSubmit.value = false;
    return;
  }

  try {
    // Mise à jour de la facture
    const { error: invoiceError } = await supabase
      .from("invoices")
      .update({
        client_id: selectedClient.value.id,
        date: invoiceData.value.date,
        total: total.value,
        status: invoiceData.value.status,
        reference: invoiceData.value.number,
      })
      .eq("id", invoiceId);

    if (invoiceError) throw invoiceError;

    // Supprimer tous les anciens items
    const { error: deleteError } = await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", invoiceId);

    if (deleteError) throw deleteError;

    // Ajouter les nouveaux items
    const { error: itemsError } = await supabase.from("invoice_items").insert(
      invoiceItems.value.map((item) => ({
        invoice_id: invoiceId,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        magasin_id: invoiceData.value.magasin_id,
      })),
    );

    if (itemsError) throw itemsError;

    // Restaurer le stock des anciens items
    for (const originalItem of originalItems.value) {
      const product = products.value.find(
        (p) => p.id === originalItem.product_id,
      );
      if (product) {
        const newStock = product.stock + originalItem.quantity;

        const { error: stockError } = await supabase
          .from("products_carreaux")
          .update({ stock: newStock })
          .eq("id", originalItem.product_id);

        if (stockError) throw stockError;

        // Mettre à jour localement
        product.stock = newStock;
      }
    }

    // Déduire le stock pour les nouveaux items
    for (const item of invoiceItems.value) {
      const product = products.value.find((p) => p.id === item.product_id);
      if (product) {
        const newStock = product.stock - item.quantity;

        if (newStock < 0) {
          throw new Error(
            `Stock insuffisant pour le produit ${item.description}`,
          );
        }

        const { error: stockError } = await supabase
          .from("products_carreaux")
          .update({ stock: newStock })
          .eq("id", item.product_id);

        if (stockError) throw stockError;
      }
    }

    successMessage.value = "Commande modifiée avec succès et stock mis à jour.";

    // Rediriger après un délai
    setTimeout(() => {
      router.push(`/commande/${invoiceId}`);
    }, 2000);
  } catch (err) {
    console.error("Erreur lors de la modification de la commande:", err);
    error.value =
      err.message || "Erreur lors de la modification de la commande.";
  } finally {
    loadingSubmit.value = false;
  }
};

const handleDeliveryToggle = async () => {
  try {
    const newDeliveryStatus = !invoiceData.value.delivery;

    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        delivery: newDeliveryStatus,
        status: newDeliveryStatus ? "delivered" : invoiceData.value.status,
      })
      .eq("id", invoiceId);

    if (updateError) throw updateError;

    invoiceData.value.delivery = newDeliveryStatus;
    if (newDeliveryStatus) {
      invoiceData.value.status = "delivered";
    }

    successMessage.value = `Commande marquée comme ${
      newDeliveryStatus ? "livrée" : "non livrée"
    }`;

    setTimeout(() => {
      successMessage.value = "";
    }, 3000);
  } catch (err) {
    console.error("Erreur lors de la mise à jour du statut de livraison:", err);
    error.value =
      err.message || "Erreur lors de la mise à jour du statut de livraison.";
  }
};

onMounted(async () => {
  await Promise.all([
    fetchCompanySettings(),
    fetchClients(),
    fetchProducts(),
    fetchInvoice(),
  ]);
});
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
      <UButton label="Retour" to="/commande" />
    </div>

    <!-- Contenu normal -->
    <div v-else>
      <div class="mb-8">
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 class="text-3xl font-bold text-gray-900">
              Modifier la Commande
            </h1>
            <p class="text-gray-600 mt-1">
              Modification de la facture {{ invoiceData.number }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <UBadge
              v-if="invoiceData.delivery"
              color="green"
              label="Livrée"
              variant="soft"
            />
            <UBadge
              :color="
                invoiceData.status === 'paid'
                  ? 'green'
                  : invoiceData.status === 'pending'
                    ? 'yellow'
                    : 'gray'
              "
              :label="
                invoiceData.status === 'paid'
                  ? 'Payée'
                  : invoiceData.status === 'pending'
                    ? 'En attente'
                    : invoiceData.status
              "
              variant="soft"
            />
            <UButton
              icon="i-lucide-arrow-left"
              color="gray"
              variant="soft"
              @click="router.push('/commande')"
            >
              Retour à la liste
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
          <p class="text-gray-600">Chargement de la facture...</p>
        </div>
      </div>

      <!-- Contenu principal -->
      <div v-else class="space-y-6">
        <!-- Information générale -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-6">
            Informations générales
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Information entreprise -->
            <div class="bg-gray-50 p-4 rounded-lg">
              <h3 class="text-lg font-semibold mb-2 text-gray-800">
                {{ companyInfo.name }}
              </h3>
              <p class="text-gray-600">{{ companyInfo.address }}</p>
              <p class="text-gray-600">Tél: {{ companyInfo.phone }}</p>
              <p class="text-gray-600">Email: {{ companyInfo.email }}</p>
              <p class="text-gray-600 mt-2">SIRET: {{ companyInfo.siret }}</p>
              <p class="text-gray-600">TVA: {{ companyInfo.vatNumber }}</p>
            </div>

            <!-- Information client -->
            <div class="space-y-4">
              <div>
                <label
                  for="client-select"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Client
                </label>
                <select
                  id="client-select"
                  v-model="selectedClient"
                  :disabled="loadingClients"
                  class="block w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="" disabled>Sélectionner un client</option>
                  <option
                    v-for="client in clients"
                    :key="client.id"
                    :value="client"
                  >
                    {{ client.name }} ({{ client.email }})
                  </option>
                </select>
              </div>

              <div v-if="selectedClient" class="bg-blue-50 p-4 rounded-lg">
                <h4 class="font-medium mb-1 text-blue-800">
                  {{ selectedClient.name }}
                </h4>
                <p v-if="selectedClient.address" class="text-sm text-gray-600">
                  {{ selectedClient.address }}
                </p>
                <p v-if="selectedClient.email" class="text-sm text-gray-600">
                  {{ selectedClient.email }}
                </p>
                <p v-if="selectedClient.phone" class="text-sm text-gray-600">
                  {{ selectedClient.phone }}
                </p>
              </div>
            </div>
          </div>

          <!-- Détails facture -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div>
              <label
                for="reference"
                class="block text-sm font-medium text-gray-700 mb-2"
              >
                Référence
              </label>
              <UInput
                id="reference"
                v-model="invoiceData.number"
                class="w-full"
              />
            </div>

            <div>
              <label
                for="date"
                class="block text-sm font-medium text-gray-700 mb-2"
              >
                Date
              </label>
              <UInput
                id="date"
                v-model="invoiceData.date"
                type="date"
                class="w-full"
              />
            </div>

            <div>
              <label
                for="status"
                class="block text-sm font-medium text-gray-700 mb-2"
              >
                Statut
              </label>
              <select
                id="status"
                v-model="invoiceData.status"
                class="block w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="pending">En attente</option>
                <option value="paid">Payée</option>
                <option value="delivered">Livrée</option>
                <option value="overdue">En retard</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Livraison
              </label>
              <UButton
                :label="invoiceData.delivery ? 'Livrée' : 'Non livrée'"
                :color="invoiceData.delivery ? 'green' : 'orange'"
                :icon="
                  invoiceData.delivery
                    ? 'i-lucide-check-circle'
                    : 'i-lucide-truck'
                "
                variant="soft"
                class="w-full"
                @click="handleDeliveryToggle"
              />
            </div>
          </div>
        </div>

        <!-- Articles -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-6">Articles</h2>

          <!-- Ajouter un article -->
          <div
            class="grid grid-cols-12 gap-3 items-end mb-6 p-4 bg-gray-50 rounded-lg"
          >
            <div class="col-span-5">
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Produit</label
              >
              <select
                v-model="newItem.product"
                :disabled="loadingProducts"
                class="block w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="" disabled>Sélectionner un produit</option>
                <option
                  v-for="product in products"
                  :key="product.id"
                  :value="product"
                  :disabled="getAvailableStock(product) <= 0"
                >
                  {{ product.name }} (Stock: {{ getAvailableStock(product) }}) -
                  {{ product.price.toFixed(2) }} {{ companySettings?.currency }}
                </option>
              </select>
            </div>

            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Quantité</label
              >
              <UInput
                v-model="newItem.quantity"
                type="number"
                min="1"
                :max="
                  newItem.product
                    ? getAvailableStock(newItem.product)
                    : undefined
                "
                :disabled="
                  !newItem.product || getAvailableStock(newItem.product) <= 0
                "
              />
            </div>

            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Prix unitaire</label
              >
              <UInput
                v-model="newItem.price"
                type="number"
                min="0"
                step="0.01"
                :placeholder="
                  newItem.product ? newItem.product.price.toFixed(2) : '0.00'
                "
              />
            </div>

            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-2"
                >Total</label
              >
              <UInput
                :value="
                  (
                    newItem.quantity *
                    (newItem.price || newItem.product?.price || 0)
                  ).toFixed(2)
                "
                disabled
                class="bg-gray-100"
              />
            </div>

            <div class="col-span-1">
              <UButton
                icon="i-lucide-plus"
                color="primary"
                :disabled="
                  !newItem.product ||
                  getAvailableStock(newItem.product) <= 0 ||
                  newItem.quantity <= 0
                "
                @click="addItem"
              />
            </div>
          </div>

          <!-- Liste des articles -->
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th
                    class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Référence
                  </th>
                  <th
                    class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Description
                  </th>
                  <th
                    class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Quantité
                  </th>
                  <th
                    class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Prix unitaire
                  </th>
                  <th
                    class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Total
                  </th>
                  <th
                    class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  v-for="(item, index) in invoiceItems"
                  :key="`${item.product_id}-${index}`"
                >
                  <td class="px-4 py-2">{{ item.reference }}</td>
                  <td class="px-4 py-2">{{ item.description }}</td>
                  <td class="px-4 py-2">{{ item.quantity }}</td>
                  <td class="px-4 py-2">
                    {{ item.price.toFixed(2) }}{{ companySettings?.currency }}
                  </td>
                  <td class="px-4 py-2 font-medium">
                    {{ item.total.toFixed(2) }}{{ companySettings?.currency }}
                  </td>
                  <td class="px-4 py-2">
                    <UButton
                      icon="i-lucide-trash-2"
                      color="red"
                      variant="soft"
                      size="sm"
                      @click="removeItem(index)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Totaux -->
          <div class="mt-6 flex justify-end">
            <div class="w-full max-w-sm space-y-3 bg-gray-50 p-4 rounded-lg">
              <div class="flex justify-between">
                <span class="text-gray-600">Sous-total :</span>
                <span class="font-medium"
                  >{{ subtotal.toFixed(2)
                  }}{{ companySettings?.currency }}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600"
                  >TVA ({{ (taxRate.value * 100).toFixed(0) }}%) :</span
                >
                <span class="font-medium"
                  >{{ taxAmount.toFixed(2)
                  }}{{ companySettings?.currency }}</span
                >
              </div>
              <div class="border-t border-gray-300 pt-3">
                <div class="flex justify-between text-lg font-bold">
                  <span>Total :</span>
                  <span
                    >{{ total.toFixed(2) }}{{ companySettings?.currency }}</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <UButton
            icon="i-lucide-x"
            color="gray"
            variant="soft"
            @click="router.push('/commande')"
          >
            Annuler
          </UButton>
          <UButton
            icon="i-lucide-save"
            color="primary"
            :loading="loadingSubmit"
            :disabled="
              loadingSubmit || invoiceItems.length === 0 || !selectedClient
            "
            @click="handleSubmit"
          >
            {{
              loadingSubmit
                ? "Enregistrement..."
                : "Enregistrer les modifications"
            }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
