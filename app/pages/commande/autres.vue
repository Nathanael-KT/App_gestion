<script setup>
const { companyId, isLoadingUser, loadCurrentUser } = useCurrentUser();
const { settings: companySettings, fetchCompanySettings } =
  useCompanySettings();

const magasinStore = useMagasinStore();

const supabase = useSupabaseClient();
const router = useRouter();

// utilise la composable useCurrentUser pour récupérer les rôles de l'utilisateur
const { userRoles } = useCurrentUser();

// Meta configuration
definePageMeta({
  middleware: ["auth", "roles"],
});

// SEO
useSeoMeta({
  title: "Nouvelle Commande - Produits Externes",
  description: "Création d'une facture avec produits externes",
});

// Données de l'entreprise calculées

// Données de la facture
const invoiceData = ref({
  number: "",
  date: new Date().toISOString().split("T")[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0],
  status: "draft",
  paymentMethod: "virement",
  notes: "",
});

const clients = ref([]);
const selectedClient = ref(null);
const invoiceItems = ref([]);
const newItem = ref({
  reference: "",
  description: "",
  quantity: 1,
  price: 0,
});
const subtotal = ref(0);
// Utiliser le taux de TVA des paramètres d'entreprise
const taxRate = computed(() => (companySettings.value?.tax_rate || 20) / 100);
const taxAmount = ref(0);
const total = ref(0);
const error = ref(null);
const loadingClients = ref(false);
const loadingSubmit = ref(false);
const successMessage = ref("");

const toast = useToast();

const generateInvoiceNumber = () => {
  const date = new Date();
  return `FAC-EXT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${Math.floor(1000 + Math.random() * 9000)}`;
};

const fetchClients = async () => {
  try {
    loadingClients.value = true;
    error.value = null;

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
  { immediate: true }
);

const addItem = () => {
  error.value = null;
  successMessage.value = "";

  // Validation des champs
  if (!newItem.value.description.trim()) {
    error.value = "Veuillez saisir une description pour le produit.";
    return;
  }

  if (!newItem.value.reference.trim()) {
    error.value = "Veuillez saisir une référence pour le produit.";
    return;
  }

  if (newItem.value.quantity <= 0) {
    error.value = "La quantité doit être supérieure à 0.";
    return;
  }

  if (newItem.value.price <= 0) {
    error.value = "Le prix doit être supérieur à 0.";
    return;
  }

  // Vérifier si la référence n'existe pas déjà
  const existingItem = invoiceItems.value.find(
    (item) =>
      item.reference.toLowerCase() === newItem.value.reference.toLowerCase()
  );

  if (existingItem) {
    error.value =
      "Un article avec cette référence existe déjà dans la facture.";
    return;
  }

  // Ajouter l'article
  invoiceItems.value.push({
    reference: newItem.value.reference.trim(),
    description: newItem.value.description.trim(),
    quantity: newItem.value.quantity,
    price: newItem.value.price,
    total: newItem.value.quantity * newItem.value.price,
    isExternal: true, // Marquer comme produit externe
  });

  calculateTotals();
  resetItemForm();

  toast.add({
    title: "Article ajouté",
    description: "L'article a été ajouté avec succès à la facture",
    icon: "i-heroicons-check-circle",
    color: "green",
  });
};

const removeItem = (index) => {
  const removedItem = invoiceItems.value[index];
  invoiceItems.value.splice(index, 1);
  calculateTotals();

  toast.add({
    title: "Article supprimé",
    description: `"${removedItem.description}" a été supprimé de la facture`,
    icon: "i-heroicons-trash",
    color: "orange",
  });
};

const editItem = (index) => {
  const item = invoiceItems.value[index];
  newItem.value = {
    reference: item.reference,
    description: item.description,
    quantity: item.quantity,
    price: item.price,
  };

  // Supprimer l'ancien article pour permettre la modification
  invoiceItems.value.splice(index, 1);
  calculateTotals();

  toast.add({
    title: "Mode édition",
    description: "Modifiez l'article et cliquez sur Ajouter pour confirmer",
    icon: "i-heroicons-pencil-square",
    color: "blue",
  });
};

const calculateTotals = () => {
  subtotal.value = invoiceItems.value.reduce(
    (sum, item) => sum + item.total,
    0
  );
  taxAmount.value = subtotal.value * taxRate.value;
  total.value = subtotal.value + taxAmount.value;
};

const resetItemForm = () => {
  newItem.value = {
    reference: "",
    description: "",
    quantity: 1,
    price: 0,
  };
};

const handleSubmit = async () => {
  error.value = null;
  successMessage.value = "";
  loadingSubmit.value = true;

  // Vérifie que magasinId est bien défini et non vide
  if (!magasinStore.magasinId) {
    error.value = "Veuillez sélectionner un magasin.";
    loadingSubmit.value = false;
    return;
  }

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
          // notes: invoiceData.value.notes || null, // Temporairement commenté - colonne notes n'existe pas
          is_external: true, // Marquer comme facture de produits externes
          magasin_id: magasinStore.magasinId,
        },
      ])
      .select("id");

    if (invoiceError) throw invoiceError;

    const invoiceId = invoiceDataResult[0].id;

    // Pour les produits externes, on crée des entrées dans invoice_items
    // avec les colonnes spécialement conçues pour les produits externes
    const { error: itemsError } = await supabase.from("invoice_items").insert(
      invoiceItems.value.map((item) => ({
        invoice_id: invoiceId,
        product_id: null, // Pas de référence produit pour les articles externes
        quantity: item.quantity,
        price: item.price,
        external_reference: item.reference, // Référence personnalisée
        external_description: item.description, // Description personnalisée
        is_external: true, // Marquer comme article externe
      }))
    );

    if (itemsError) throw itemsError;

    toast.add({
      title: "Commande créée",
      description: "La commande avec produits externes a été créée avec succès",
      icon: "i-heroicons-check-circle",
      color: "green",
    });

    // Rediriger vers la facture créée
    setTimeout(() => {
      router.push(`/facture/${invoiceId}`);
    }, 1500);
  } catch (err) {
    console.error("Erreur lors de la création de la commande:", err);
    error.value = err.message || "Erreur lors de la création de la commande.";

    toast.add({
      title: "Erreur",
      description: error.value,
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
  } finally {
    loadingSubmit.value = false;
  }
};

onMounted(async () => {
  if (isLoadingUser.value) await loadCurrentUser();
  if (companyId.value) await fetchCompanySettings(companyId.value);
  await fetchClients();
});
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
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
        <h1 class="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <UIcon
            name="i-heroicons-document-plus"
            class="w-8 h-8 text-blue-600"
          />
          Nouvelle Commande - Produits Externes
        </h1>
        <p class="text-gray-600 mt-2">
          Créer une facture avec des produits qui ne sont pas dans votre stock
        </p>
      </div>

      <UCard class="shadow-lg">
        <template #header>
          <div class="flex justify-between items-center">
            <h2 class="text-xl font-semibold text-gray-800">
              Détails de la commande
            </h2>
            <div class="flex items-center space-x-3">
              <UBadge label="Produits Externes" color="purple" />
              <UBadge :label="invoiceData.status" color="blue" />
              <span class="text-gray-500 text-sm">
                N°: {{ invoiceData.number || "Auto-généré" }}
              </span>
            </div>
          </div>
        </template>

        <!-- Messages d'erreur -->
        <UAlert
          v-if="error"
          title="Erreur"
          :description="error"
          icon="i-heroicons-exclamation-triangle"
          color="red"
          variant="subtle"
          class="mb-6"
          :close-button="{ icon: 'i-heroicons-x-mark-20-solid' }"
          @close="error = null"
        />

        <!-- En-tête de facture -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <!-- Informations entreprise -->
          <div class="bg-gray-50 p-6 rounded-lg">
            <h3
              class="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2"
            >
              <UIcon name="i-heroicons-building-office" class="w-5 h-5" />
              Émetteur
            </h3>
            <div class="space-y-4">
              <div>
                <h4 class="text-xl font-bold text-gray-900 dark:text-white">
                  {{ companySettings?.company_name || "Nom de l'entreprise" }}
                </h4>
                <p class="text-sm text-gray-500 dark:text-gray-300 mt-1">
                  {{ companySettings?.company_address || "Adresse du magasin" }}
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
                    TVA : {{ companySettings?.company_tva || "Non renseigné" }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Sélection client -->
          <div class="bg-gray-50 p-6 rounded-lg">
            <h3
              class="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2"
            >
              <UIcon name="i-heroicons-user" class="w-5 h-5" />
              Client
            </h3>

            <USelectMenu
              v-model="selectedClient"
              :items="clients"
              placeholder="Sélectionner un client"
              searchable
              :loading="loadingClients"
              class="mb-4"
              :filter-fields="['name', 'email']"
            >
              <template #item="{ item }">
                <div>
                  <p class="font-medium">{{ item.name }}</p>
                  <p class="text-sm text-gray-500">
                    {{ item.email }} • {{ item.phone }}
                  </p>
                </div>
              </template>
              <template #empty="{ searchTerm }">
                <span v-if="searchTerm"
                  >Aucun client trouvé pour "{{ searchTerm }}"</span
                >
                <span v-else>Aucun client disponible</span>
              </template>
            </USelectMenu>

            <!-- Message d'information si pas de clients -->
            <div v-if="!loadingClients && clients.length === 0" class="mb-4">
              <UAlert
                icon="i-heroicons-information-circle"
                color="blue"
                variant="subtle"
                title="Aucun client disponible"
                description="Vous devez d'abord ajouter des clients avant de créer une commande."
              >
                <template #actions>
                  <UButton
                    color="blue"
                    variant="outline"
                    size="sm"
                    to="/client/add"
                    icon="i-heroicons-plus"
                  >
                    Ajouter un client
                  </UButton>
                </template>
              </UAlert>
            </div>

            <!-- Debugging info (à supprimer en production) -->
            <div v-if="!loadingClients" class="text-xs text-gray-400 mb-2">
              {{ clients.length }} client(s) trouvé(s)
            </div>

            <div
              v-if="selectedClient"
              class="bg-blue-50 p-4 rounded-lg border border-blue-200"
            >
              <h4 class="font-medium text-blue-800 mb-2">
                {{ selectedClient.name }}
              </h4>
              <div class="text-sm text-blue-700 space-y-1">
                <p v-if="selectedClient.address">
                  <UIcon
                    name="i-heroicons-map-pin"
                    class="w-4 h-4 inline mr-1"
                  />
                  {{ selectedClient.address }}
                </p>
                <p v-if="selectedClient.email">
                  <UIcon
                    name="i-heroicons-envelope"
                    class="w-4 h-4 inline mr-1"
                  />
                  {{ selectedClient.email }}
                </p>
                <p v-if="selectedClient.phone">
                  <UIcon name="i-heroicons-phone" class="w-4 h-4 inline mr-1" />
                  {{ selectedClient.phone }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Détails facture -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 justify-end">
          <div class="md:col-start-3">
            <UFormGroup label="Date de facturation">
              <UInput
                v-model="invoiceData.date"
                type="date"
                class="rounded-md"
                :max="new Date().toISOString().split('T')[0]"
                disabled
              />
            </UFormGroup>
          </div>
        </div>

        <!-- Ajout d'articles -->
        <div class="mb-8">
          <h3
            class="text-lg font-semibold mb-6 text-gray-800 flex items-center gap-2"
          >
            <UIcon name="i-heroicons-cube" class="w-5 h-5" />
            Articles (Produits Externes)
          </h3>

          <!-- Formulaire d'ajout -->
          <UCard class="mb-6">
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
              <!-- Référence -->
              <div class="md:col-span-3">
                <UFormGroup label="Référence *">
                  <UInput
                    v-model="newItem.reference"
                    placeholder="REF-001"
                    icon="i-heroicons-hashtag"
                  />
                </UFormGroup>
              </div>

              <!-- Description -->
              <div class="md:col-span-4">
                <UFormGroup label="Description *">
                  <UInput
                    v-model="newItem.description"
                    placeholder="Description du produit"
                    icon="i-heroicons-document-text"
                  />
                </UFormGroup>
              </div>

              <!-- Quantité -->
              <div class="md:col-span-2">
                <UFormGroup label="Quantité *">
                  <UInput
                    v-model.number="newItem.quantity"
                    type="number"
                    min="1"
                    step="1"
                    icon="i-heroicons-calculator"
                  />
                </UFormGroup>
              </div>

              <!-- Prix unitaire -->
              <div class="md:col-span-2">
                <UFormGroup label="Prix unitaire ({{ companySettings?.currency }}) *">
                  <UInput
                    v-model.number="newItem.price"
                    type="number"
                    min="0"
                    step="0.01"
                    icon="i-heroicons-currency-euro"
                  />
                </UFormGroup>
              </div>

              <!-- Bouton d'ajout -->
              <div class="md:col-span-1 flex items-end">
                <UButton
                  icon="i-heroicons-plus"
                  color="green"
                  :disabled="
                    !newItem.reference.trim() ||
                    !newItem.description.trim() ||
                    newItem.quantity <= 0 ||
                    newItem.price <= 0
                  "
                  @click="addItem"
                >
                  Ajouter
                </UButton>
              </div>
            </div>

            <!-- Aperçu du total -->
            <div
              v-if="newItem.quantity > 0 && newItem.price > 0"
              class="mt-4 p-3 bg-blue-50 rounded-lg"
            >
              <p class="text-sm text-blue-700">
                <span class="font-medium">Total de cet article :</span>
                {{ (newItem.quantity * newItem.price).toFixed(2) }} {{ companySettings?.currency }}
              </p>
            </div>
          </UCard>

          <!-- Liste des articles -->
          <div v-if="invoiceItems.length > 0" class="overflow-x-auto">
            <table
              class="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow-sm"
            >
              <thead class="bg-gray-50">
                <tr>
                  <th
                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Référence
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Description
                  </th>
                  <th
                    class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                  >
                    Quantité
                  </th>
                  <th
                    class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"
                  >
                    Prix unitaire
                  </th>
                  <th
                    class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"
                  >
                    Total
                  </th>
                  <th
                    class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr
                  v-for="(item, index) in invoiceItems"
                  :key="`${item.reference}-${index}`"
                  class="hover:bg-gray-50"
                >
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">
                    {{ item.reference }}
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600">
                    {{ item.description }}
                  </td>
                  <td class="px-4 py-3 text-sm text-center text-gray-600">
                    {{ item.quantity }}
                  </td>
                  <td class="px-4 py-3 text-sm text-right text-gray-600">
                    {{ item.price.toFixed(2) }} {{ companySettings?.currency }}
                  </td>
                  <td
                    class="px-4 py-3 text-sm text-right font-medium text-gray-900"
                  >
                    {{ item.total.toFixed(2) }} {{ companySettings?.currency }}
                  </td>
                  <td class="px-4 py-3 text-center">
                    <div class="flex justify-center space-x-2">
                      <UButton
                        icon="i-heroicons-pencil-square"
                        color="blue"
                        variant="ghost"
                        size="sm"
                        @click="editItem(index)"
                      />
                      <UButton
                        icon="i-heroicons-trash"
                        color="red"
                        variant="ghost"
                        size="sm"
                        @click="removeItem(index)"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="text-center py-12 text-gray-500">
            <UIcon
              name="i-heroicons-cube-transparent"
              class="w-16 h-16 mx-auto mb-4"
            />
            <p class="text-lg">Aucun article ajouté</p>
            <p class="text-sm">
              Utilisez le formulaire ci-dessus pour ajouter des articles
            </p>
          </div>
        </div>

        <!-- Récapitulatif des totaux -->
        <div class="flex justify-end mb-8">
          <div class="w-full max-w-md space-y-3 bg-gray-50 p-6 rounded-lg">
            <div class="flex justify-between text-gray-600">
              <span>Sous-total HT :</span>
              <span class="font-medium">{{ subtotal.toFixed(2) }} {{ companySettings?.currency }}</span>
            </div>
            <div class="flex justify-between text-gray-600">
              <span>TVA ({{ (taxRate.value * 100).toFixed(0) }}%) :</span>
              <span class="font-medium">{{ taxAmount.toFixed(2) }} {{ companySettings?.currency }}</span>
            </div>
            <UDivider />
            <div class="flex justify-between text-lg font-bold text-gray-900">
              <span>Total TTC :</span>
              <span>{{ total.toFixed(2) }} {{ companySettings?.currency }}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <UFormGroup label="Notes et commentaires" class="mb-8">
          <UTextarea
            v-model="invoiceData.notes"
            placeholder="Informations complémentaires, conditions de paiement, etc."
            rows="3"
          />
        </UFormGroup>

        <!-- Actions -->
        <template #footer>
          <div
            class="flex flex-col sm:flex-row justify-between items-center gap-4"
          >
            <div class="text-sm text-gray-500">
              <UIcon
                name="i-heroicons-information-circle"
                class="w-4 h-4 inline mr-1"
              />
              Les produits externes ne modifient pas votre stock
            </div>

            <div class="flex space-x-3">
              <UButton
                label="Annuler"
                color="gray"
                variant="outline"
                icon="i-heroicons-x-mark"
                @click="router.push('/commande')"
              />
              <UButton
                label="Créer la commande"
                icon="i-heroicons-document-check"
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
        </template>
      </UCard>
    </div>
  </div>
</template>
