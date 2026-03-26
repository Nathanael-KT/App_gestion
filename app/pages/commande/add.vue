<script setup>
import { ref, onMounted, watch, computed } from "vue";
import { useRouter } from "vue-router";
import { useMagasinStore } from "../../composables/useMagasinStore";
import { useCurrentUser } from "../../composables/useCurrentUser";
import { useCompanySettings } from "../../composables/useCompanySettings";

const { companyId, isLoadingUser, loadCurrentUser } = useCurrentUser();
const { settings: companySettings, fetchCompanySettings } =
  useCompanySettings();

const supabase = useSupabaseClient();
const router = useRouter();
const magasinStore = useMagasinStore();

// Données de l'entreprise calculées

// Données de la facture
const invoiceData = ref({
  number: "",
  date: new Date().toISOString().split("T")[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0],
  status: "draft",
  notes: "",
});

// utilise la composable useCurrentUser pour récupérer les rôles de l'utilisateur
const { userRoles } = useCurrentUser();

const clients = ref([]);
const products = ref([]);
const selectedClient = ref(null);
const invoiceItems = ref([]);
const newItem = ref({
  product: null,
  quantity: 1,
  price: 0,
  description: "",
});

// Watch pour mettre à jour le prix quand un produit est sélectionné
watch(
  () => newItem.value.product,
  (newProduct) => {
    if (newProduct) {
      newItem.value.price = newProduct.price;
    } else {
      newItem.value.price = 0;
    }
  },
);
onMounted(async () => {
  if (isLoadingUser.value) await loadCurrentUser();
  if (companyId.value) await fetchCompanySettings(companyId.value);
  await fetchClients();
});

const subtotal = ref(0);
// Utiliser le taux de TVA des paramètres d'entreprise
const taxRate = computed(() => (companySettings.value?.tax_rate || 20) / 100);
const taxAmount = ref(0);
const total = ref(0);
const error = ref(null);
const loadingClients = ref(false);
const loadingProducts = ref(false);
const loadingSubmit = ref(false);
const successMessage = ref("");

// Fonction pour calculer le stock disponible pour un produit donné
const getAvailableStock = (product) => {
  if (!product) return 0;

  const alreadyAddedQuantity = invoiceItems.value
    .filter((item) => item.product_id === product.id)
    .reduce((sum, item) => sum + item.quantity, 0);

  return product.stock - alreadyAddedQuantity;
};

const generateInvoiceNumber = () => {
  const date = new Date();
  return `FAC-${date.getFullYear()}${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${Math.floor(1000 + Math.random() * 9000)}`;
};

const fetchClients = async () => {
  try {
    loadingClients.value = true;
    error.value = null; // Réinitialiser les erreurs

    // Vérifier que magasinId est bien défini
    if (!magasinStore.magasinId) {
      error.value =
        "Veuillez sélectionner un magasin pour afficher les clients.";
      clients.value = [];
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("clients")
      .select("id, name, email, phone, address")
      .eq("magasin_id", magasinStore.magasinId)
      .order("name", { ascending: true });

    if (fetchError) throw fetchError;
    clients.value = data || [];

    if (clients.value.length === 0) {
      error.value =
        "Aucun client trouvé pour ce magasin. Veuillez d'abord ajouter des clients.";
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
    error.value = null; // Réinitialiser les erreurs

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
  // Réinitialiser les messages précédents
  error.value = null;
  successMessage.value = "";

  if (!newItem.value.product || newItem.value.quantity <= 0) {
    error.value = "Veuillez sélectionner un produit et une quantité valide.";
    return;
  }

  // Vérifier la quantité déjà ajoutée pour ce produit
  const alreadyAddedQuantity = invoiceItems.value
    .filter((item) => item.product_id === newItem.value.product.id)
    .reduce((sum, item) => sum + item.quantity, 0);

  const totalQuantityNeeded = alreadyAddedQuantity + newItem.value.quantity;

  if (totalQuantityNeeded > newItem.value.product.stock) {
    error.value = `Quantité totale demandée (${totalQuantityNeeded}) dépasse le stock disponible (${newItem.value.product.stock}). Déjà ajouté: ${alreadyAddedQuantity}`;
    return;
  }

  invoiceItems.value.push({
    product_id: newItem.value.product.id,
    reference: newItem.value.product.reference,
    description: newItem.value.product.name,
    quantity: newItem.value.quantity,
    price: newItem.value.price || newItem.value.product.price,
    total:
      newItem.value.quantity *
      (newItem.value.price || newItem.value.product.price),
  });

  calculateTotals();
  resetItemForm();

  // Message de succès pour l'ajout d'article
  successMessage.value = "Article ajouté avec succès !";

  // Faire disparaître le message après 3 secondes
  setTimeout(() => {
    if (successMessage.value === "Article ajouté avec succès !") {
      successMessage.value = "";
    }
  }, 3000);
};

const removeItem = (index) => {
  const removedItem = invoiceItems.value[index];
  invoiceItems.value.splice(index, 1);
  calculateTotals();

  // Message de succès pour la suppression
  successMessage.value = `Article "${removedItem.description}" supprimé avec succès !`;
  error.value = null;

  // Faire disparaître le message après 3 secondes
  setTimeout(() => {
    if (successMessage.value.includes("supprimé avec succès")) {
      successMessage.value = "";
    }
  }, 3000);
};

const calculateTotals = () => {
  subtotal.value = invoiceItems.value.reduce(
    (sum, item) => sum + item.total,
    0,
  );
  taxAmount.value = subtotal.value * taxRate.value;
  total.value = subtotal.value + taxAmount.value;
};

const resetItemForm = () => {
  newItem.value = {
    product: null,
    quantity: 1,
    price: 0,
    description: "",
  };
  // Ne pas réinitialiser les messages ici car ils peuvent être utiles
};

const handleSubmit = async () => {
  // Vérifie que magasinId est bien défini et non vide
  if (!magasinStore.magasinId) {
    error.value = "Veuillez sélectionner un magasin.";
    loadingSubmit.value = false;
    return;
  }

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
    invoiceData.value.number = generateInvoiceNumber();

    // Création de la facture avec magasin_id
    const { data: invoiceDataResult, error: invoiceError } = await supabase
      .from("invoices")
      .insert([
        {
          client_id: selectedClient.value.id,
          date: invoiceData.value.date,
          total: total.value,
          status: invoiceData.value.status,
          reference: invoiceData.value.number,
          magasin_id: magasinStore.magasinId,
        },
      ])
      .select("id");

    if (invoiceError) throw invoiceError;

    const invoiceId = invoiceDataResult[0].id;

    // Ajout des articles
    const { error: itemsError } = await supabase.from("invoice_items").insert(
      invoiceItems.value.map((item) => ({
        invoice_id: invoiceId,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
      })),
    );

    if (itemsError) throw itemsError;

    // Mise à jour du stock des produits
    for (const item of invoiceItems.value) {
      const currentProduct = products.value.find(
        (p) => p.id === item.product_id,
      );
      if (currentProduct) {
        const newStock = currentProduct.stock - item.quantity;

        if (newStock < 0) {
          throw new Error(
            `Stock insuffisant pour le produit ${currentProduct.name}`,
          );
        }

        const { error: stockError } = await supabase
          .from("products_carreaux")
          .update({ stock: newStock })
          .eq("id", item.product_id);

        if (stockError) throw stockError;
      }
    }

    successMessage.value = "Commande créée avec succès et stock mis à jour.";

    // Attendre un peu pour que l'utilisateur voie le message de succès
    setTimeout(() => {
      router.push(`/commande/${invoiceId}`);
    }, 2000); // 2 secondes de délai
  } catch (err) {
    console.error("Erreur lors de la création de la commande:", err);
    error.value = err.message || "Erreur lors de la création de la commande.";
  } finally {
    loadingSubmit.value = false;
  }
};

const magasinInfo = ref({ adresse: "", telephone: "" });

const fetchMagasinInfo = async () => {
  if (!magasinStore.magasinId) return;
  const { data, error } = await supabase
    .from("magasins")
    .select("adresse, telephone, email")
    .eq("id", magasinStore.magasinId)
    .single();
  if (!error && data) {
    magasinInfo.value = data;
  }
};

watch(
  () => magasinStore.magasinId,
  (id) => {
    if (id) fetchMagasinInfo();
  },
  { immediate: true },
);

onMounted(async () => {
  await Promise.all([fetchCompanySettings(), fetchClients(), fetchProducts()]);
});
</script>

<template>
  <UContainer class="py-8">
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
      <UPageHeader
        title="Nouvelle Commande"
        icon="i-heroicons-document-plus"
        description="Créer une nouvelle commande professionnelle"
        class="mb-8"
      />

      <div class="space-y-6">
        <UCard class="shadow-sm border-0">
          <template #header>
            <div
              class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                  Détails de la commande
                </h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Complétez les informations ci-dessous
                </p>
              </div>
              <div class="flex items-center gap-3">
                <UBadge
                  :label="
                    invoiceData.status === 'draft'
                      ? 'Brouillon'
                      : invoiceData.status
                  "
                  color="amber"
                  variant="subtle"
                />
                <UBadge
                  :label="`N° ${invoiceData.number || '--'}`"
                  color="gray"
                  variant="outline"
                />
              </div>
            </div>
          </template>

          <!-- Messages d'erreur/succès -->
          <div v-if="error || successMessage" class="space-y-3">
            <UAlert
              v-if="error"
              icon="i-heroicons-exclamation-triangle"
              color="red"
              variant="subtle"
              title="Attention"
              :description="error"
              :close-button="{
                icon: 'i-heroicons-x-mark-20-solid',
                color: 'gray',
                variant: 'link',
              }"
              @close="error = null"
            />

            <UAlert
              v-if="successMessage"
              icon="i-heroicons-check-circle"
              color="green"
              variant="subtle"
              title="Succès"
              :description="successMessage"
              :close-button="{
                icon: 'i-heroicons-x-mark-20-solid',
                color: 'gray',
                variant: 'link',
              }"
              @close="successMessage = ''"
            />
          </div>

          <!-- Section Informations -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Information entreprise -->
            <UCard class="border-0 bg-gray-50 dark:bg-gray-800/50">
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-building-office"
                    class="w-5 h-5 text-primary-500"
                  />
                  <h3 class="text-lg font-semibold">Informations entreprise</h3>
                </div>
              </template>

              <div class="space-y-4">
                <div>
                  <h4 class="text-xl font-bold text-gray-900 dark:text-white">
                    {{ companySettings?.company_name || "Nom de l'entreprise" }}
                  </h4>
                  <p class="text-sm text-gray-500 dark:text-gray-300 mt-1">
                    {{
                      companySettings?.company_address || "Adresse du magasin"
                    }}
                  </p>
                </div>

                <UDivider />

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div class="flex items-center gap-2">
                    <UIcon
                      name="i-heroicons-phone"
                      class="w-4 h-4 text-primary-500"
                    />
                    <span class="font-medium text-gray-700 dark:text-gray-200">
                      {{
                        companySettings?.company_phone ||
                        "Téléphone non renseigné"
                      }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <UIcon
                      name="i-heroicons-envelope"
                      class="w-4 h-4 text-primary-500"
                    />
                    <span class="font-medium text-gray-700 dark:text-gray-200">
                      {{
                        companySettings?.company_email || "Email non renseigné"
                      }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <UIcon
                      name="i-heroicons-identification"
                      class="w-4 h-4 text-primary-500"
                    />
                    <span class="font-medium text-gray-700 dark:text-gray-200">
                      SIRET :
                      {{ companySettings?.company_siret || "Non renseigné" }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <UIcon
                      name="i-heroicons-document-text"
                      class="w-4 h-4 text-primary-500"
                    />
                    <span class="font-medium text-gray-700 dark:text-gray-200">
                      TVA :
                      {{ companySettings?.company_tva || "Non renseigné" }}
                    </span>
                  </div>
                </div>
              </div>
            </UCard>

            <!-- Information client -->
            <UCard class="border-0 bg-gray-50 dark:bg-gray-800/50">
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-user"
                    class="w-5 h-5 text-primary-500"
                  />
                  <h3 class="text-lg font-semibold">Client</h3>
                </div>
              </template>

              <div class="space-y-4">
                <UFormGroup label="Sélectionner un client" required>
                  <USelectMenu
                    v-model="selectedClient"
                    :items="clients"
                    placeholder="Choisir un client"
                    :loading="loadingClients"
                    searchable
                    :filter-fields="['name', 'email']"
                    class="w-full"
                  >
                    <template #item="{ item }">
                      <div class="flex flex-col">
                        <span class="font-medium">{{ item.name }}</span>
                        <span class="text-sm text-gray-500"
                          >{{ item.email }} • {{ item.phone }}</span
                        >
                      </div>
                    </template>

                    <template #empty="{ searchTerm }">
                      <span v-if="searchTerm"
                        >Aucun client trouvé pour "{{ searchTerm }}"</span
                      >
                      <span v-else>Aucun client disponible</span>
                    </template>
                  </USelectMenu>
                </UFormGroup>

                <div
                  v-if="selectedClient"
                  class="p-4 bg-primary-50 dark:bg-primary-950 rounded-lg border border-primary-200 dark:border-primary-800"
                >
                  <div class="flex items-start gap-3">
                    <UAvatar
                      :alt="selectedClient.name"
                      size="sm"
                      :ui="{ background: 'bg-primary-500 dark:bg-primary-400' }"
                    />
                    <div class="flex-1 min-w-0">
                      <h4
                        class="font-medium text-primary-900 dark:text-primary-100"
                      >
                        {{ selectedClient.name }}
                      </h4>
                      <div
                        class="mt-1 space-y-1 text-sm text-primary-700 dark:text-primary-300"
                      >
                        <p
                          v-if="selectedClient.address"
                          class="flex items-center gap-1"
                        >
                          <UIcon name="i-heroicons-map-pin" class="w-3 h-3" />
                          {{ selectedClient.address }}
                        </p>
                        <p
                          v-if="selectedClient.email"
                          class="flex items-center gap-1"
                        >
                          <UIcon name="i-heroicons-envelope" class="w-3 h-3" />
                          {{ selectedClient.email }}
                        </p>
                        <p
                          v-if="selectedClient.phone"
                          class="flex items-center gap-1"
                        >
                          <UIcon name="i-heroicons-phone" class="w-3 h-3" />
                          {{ selectedClient.phone }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </UCard>
          </div>
        </UCard>

        <!-- Section Articles -->
        <UCard class="shadow-sm border-0">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-shopping-bag"
                class="w-5 h-5 text-primary-500"
              />
              <h3 class="text-lg font-semibold">Articles de la commande</h3>
            </div>
          </template>

          <!-- Date de facturation -->
          <div class="mb-6">
            <div class="flex justify-end">
              <div class="w-full sm:w-64">
                <UFormGroup label="Date de facturation">
                  <UInput
                    v-model="invoiceData.date"
                    type="date"
                    :max="new Date().toISOString().split('T')[0]"
                    disabled
                  />
                </UFormGroup>
              </div>
            </div>
          </div>

          <!-- Formulaire d'ajout d'article -->
          <div class="space-y-4">
            <div
              class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700"
            >
              <h4 class="font-medium mb-4 flex items-center gap-2">
                <UIcon name="i-heroicons-plus-circle" class="w-4 h-4" />
                Ajouter un article
              </h4>

              <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <!-- Sélection du produit -->
                <div class="md:col-span-5">
                  <UFormGroup label="Produit" required>
                    <USelectMenu
                      v-model="newItem.product"
                      :items="products"
                      placeholder="Sélectionner un produit"
                      :loading="loadingProducts"
                      searchable
                      :filter-fields="['name', 'reference']"
                    >
                      <template #item="{ item }">
                        <div class="flex flex-col py-1">
                          <div class="flex justify-between items-start">
                            <div>
                              <span class="font-medium">{{ item.name }}</span>
                              <UBadge
                                :label="item.reference"
                                color="gray"
                                variant="soft"
                                size="xs"
                                class="ml-2"
                              />
                            </div>
                            <span
                              class="text-sm font-medium text-primary-600 dark:text-primary-400"
                            >
                              {{ item.price.toFixed(2) }}
                              {{ companySettings?.currency }}
                            </span>
                          </div>
                          <div class="flex items-center gap-2 mt-1">
                            <UBadge
                              :label="`Stock: ${getAvailableStock(item)}`"
                              :color="
                                getAvailableStock(item) > 0 ? 'green' : 'red'
                              "
                              variant="soft"
                              size="xs"
                            />
                            <span
                              v-if="getAvailableStock(item) <= 0"
                              class="text-xs text-red-500"
                            >
                              Épuisé
                            </span>
                          </div>
                        </div>
                      </template>

                      <template #empty="{ searchTerm }">
                        <span v-if="searchTerm"
                          >Aucun produit trouvé pour "{{ searchTerm }}"</span
                        >
                        <span v-else>Aucun produit disponible</span>
                      </template>
                    </USelectMenu>
                  </UFormGroup>

                  <!-- Détails du produit sélectionné -->
                  <div
                    v-if="newItem.product"
                    class="mt-3 p-3 bg-white dark:bg-gray-900 rounded-lg border"
                  >
                    <div class="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span class="text-gray-500">Référence:</span>
                        <span class="font-medium ml-1">{{
                          newItem.product.reference
                        }}</span>
                      </div>
                      <div>
                        <span class="text-gray-500">Prix:</span>
                        <span class="font-medium ml-1"
                          >{{ newItem.product.price.toFixed(2) }}
                          {{ companySettings?.currency }}</span
                        >
                      </div>
                      <div>
                        <span class="text-gray-500">Stock total:</span>
                        <span class="font-medium ml-1">{{
                          newItem.product.stock
                        }}</span>
                      </div>
                      <div>
                        <span class="text-gray-500">Disponible:</span>
                        <span
                          :class="
                            getAvailableStock(newItem.product) <= 0
                              ? 'text-red-600 font-semibold'
                              : 'text-green-600 font-semibold'
                          "
                          class="ml-1"
                        >
                          {{ getAvailableStock(newItem.product) }}
                        </span>
                      </div>
                    </div>

                    <UAlert
                      v-if="getAvailableStock(newItem.product) <= 0"
                      icon="i-heroicons-exclamation-triangle"
                      color="red"
                      variant="soft"
                      title="Produit épuisé"
                      description="Ce produit n'est plus disponible pour cette commande"
                      class="mt-2"
                    />
                  </div>
                </div>

                <!-- Quantité -->
                <div class="md:col-span-2">
                  <UFormGroup label="Quantité" required>
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
                        !newItem.product ||
                        getAvailableStock(newItem.product) <= 0
                      "
                      placeholder="1"
                    />
                  </UFormGroup>
                </div>

                <!-- Prix unitaire -->
                <div class="md:col-span-2">
                  <UFormGroup label="Prix unitaire">
                    <UInput
                      v-model="newItem.price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </UFormGroup>
                </div>

                <!-- Total calculé -->
                <div class="md:col-span-2">
                  <UFormGroup label="Total">
                    <UInput
                      :model-value="
                        (newItem.quantity * (newItem.price || 0)).toFixed(2)
                      "
                      disabled
                      class="font-medium"
                      trailing="{{ companySettings?.currency }}"
                    />
                  </UFormGroup>
                </div>

                <!-- Bouton d'ajout -->
                <div class="md:col-span-1">
                  <UButton
                    icon="i-heroicons-plus"
                    color="primary"
                    class="w-full md:w-auto"
                    :ui="{ rounded: 'rounded-full' }"
                    :disabled="
                      !newItem.product ||
                      getAvailableStock(newItem.product) <= 0 ||
                      newItem.quantity <= 0
                    "
                    @click="addItem"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Liste des articles -->
          <div v-if="invoiceItems.length > 0" class="space-y-4">
            <UDivider label="Articles ajoutés" />

            <div class="space-y-3">
              <UCard
                v-for="(item, index) in invoiceItems"
                :key="`${item.product_id}-${index}`"
                class="border-0 bg-gray-50 dark:bg-gray-800/50"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                    <!-- Informations produit -->
                    <div class="md:col-span-2">
                      <div class="flex items-start gap-3">
                        <UIcon
                          name="i-heroicons-cube"
                          class="w-5 h-5 text-gray-400 mt-0.5"
                        />
                        <div class="min-w-0">
                          <h4
                            class="font-medium text-gray-900 dark:text-white truncate"
                          >
                            {{ item.description }}
                          </h4>
                          <p class="text-sm text-gray-500 dark:text-gray-400">
                            Réf: {{ item.reference }}
                          </p>
                        </div>
                      </div>
                    </div>

                    <!-- Quantité -->
                    <div class="flex items-center gap-2">
                      <UIcon
                        name="i-heroicons-calculator"
                        class="w-4 h-4 text-gray-400"
                      />
                      <div>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                          Quantité
                        </p>
                        <p class="font-medium">{{ item.quantity }}</p>
                      </div>
                    </div>

                    <!-- Prix unitaire -->
                    <div class="flex items-center gap-2">
                      <UIcon
                        name="i-heroicons-banknotes"
                        class="w-4 h-4 text-gray-400"
                      />
                      <div>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                          Prix unitaire
                        </p>
                        <p class="font-medium">
                          {{ item.price.toFixed(2) }}
                          {{ companySettings?.currency }}
                        </p>
                      </div>
                    </div>

                    <!-- Total -->
                    <div class="flex items-center gap-2">
                      <UIcon
                        name="i-heroicons-currency-euro"
                        class="w-4 h-4 text-gray-400"
                      />
                      <div>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                          Total
                        </p>
                        <p
                          class="font-semibold text-lg text-primary-600 dark:text-primary-400"
                        >
                          {{ (item.quantity * item.price).toFixed(2) }}
                          {{ companySettings?.currency }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="flex items-center gap-2">
                    <UButton
                      icon="i-heroicons-trash"
                      color="red"
                      variant="ghost"
                      size="sm"
                      class="hover:bg-red-50 dark:hover:bg-red-950"
                      @click="removeItem(index)"
                    />
                  </div>
                </div>
              </UCard>
            </div>
          </div>

          <!-- État vide -->
          <div v-else class="text-center py-12">
            <UIcon
              name="i-heroicons-shopping-bag"
              class="w-12 h-12 text-gray-400 mx-auto mb-4"
            />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Aucun article ajouté
            </h3>
            <p class="text-gray-500 dark:text-gray-400">
              Sélectionnez un produit ci-dessus pour commencer à construire
              votre commande
            </p>
          </div>
        </UCard>

        <!-- Section Totaux et Finalisation -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Notes -->
          <UCard class="shadow-sm border-0">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-heroicons-chat-bubble-left-ellipsis"
                  class="w-5 h-5 text-primary-500"
                />
                <h3 class="text-lg font-semibold">Notes supplémentaires</h3>
              </div>
            </template>

            <UFormGroup label="Ajouter des notes à la commande">
              <UTextarea
                v-model="invoiceData.notes"
                placeholder="Notes, instructions spéciales, conditions particulières..."
                :rows="4"
                autoresize
              />
            </UFormGroup>
          </UCard>

          <!-- Récapitulatif des totaux -->
          <UCard class="shadow-sm border-0">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-heroicons-calculator"
                  class="w-5 h-5 text-primary-500"
                />
                <h3 class="text-lg font-semibold">Récapitulatif</h3>
              </div>
            </template>

            <div class="space-y-4">
              <div class="space-y-3">
                <div class="flex justify-between items-center py-2">
                  <span class="text-gray-600 dark:text-gray-300"
                    >Sous-total HT</span
                  >
                  <span class="font-medium"
                    >{{ subtotal.toFixed(2) }}
                    {{ companySettings?.currency }}</span
                  >
                </div>

                <div class="flex justify-between items-center py-2">
                  <span class="text-gray-600 dark:text-gray-300"
                    >TVA (20%)</span
                  >
                  <span class="font-medium"
                    >{{ taxAmount.toFixed(2) }}
                    {{ companySettings?.currency }}</span
                  >
                </div>

                <UDivider />

                <div class="flex justify-between items-center py-2">
                  <span
                    class="text-lg font-semibold text-gray-900 dark:text-white"
                    >Total TTC</span
                  >
                  <span
                    class="text-2xl font-bold text-primary-600 dark:text-primary-400"
                  >
                    {{ total.toFixed(2) }} {{ companySettings?.currency }}
                  </span>
                </div>
              </div>

              <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div class="flex flex-col sm:flex-row gap-3">
                  <UButton
                    label="Annuler"
                    color="gray"
                    variant="ghost"
                    class="flex-1"
                    @click="router.push('/commande')"
                  />

                  <UButton
                    label="Créer la commande"
                    icon="i-heroicons-check"
                    color="primary"
                    size="lg"
                    class="flex-1"
                    :loading="loadingSubmit"
                    :disabled="
                      !selectedClient ||
                      invoiceItems.length === 0 ||
                      userRoles?.includes('magasinier')
                    "
                    @click="handleSubmit"
                  />
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </div></div
  ></UContainer>
</template>
