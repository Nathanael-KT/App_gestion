<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import CartonCalculator from "@/components/CartonCalculator.vue";
import { useCurrentUser } from "../../composables/useCurrentUser";
import { useCompanySettings } from "../../composables/useCompanySettings";

const { isLoadingUser, loadCurrentUser } = useCurrentUser();
const { settings: companySettings, fetchCompanySettings } =
  useCompanySettings();

const supabase = useSupabaseClient();
const router = useRouter();
const route = useRoute();

const invoice = ref(null);
const invoiceItems = ref([]);
const loading = ref(false);
const error = ref(null);
const downloadingDeliveryNote = ref(false);
const successMessage = ref(null);

// Données de l'entreprise calculées

const fetchInvoiceDetails = async () => {
  try {
    loading.value = true;
    const invoiceId = route.params.id;

    // Étape 1: Récupérer les détails de la commande avec le client
    const { data: invoiceData, error: invoiceError } = await supabase
      .from("invoices")
      .select(
        `
        *,
        clients (
          id,
          name,
          email,
          phone,
          address
        )
      `,
      )
      .eq("id", invoiceId)
      .single();

    if (invoiceError) throw invoiceError;

    // Étape 2: Récupérer les articles SÉPARÉMENt sans jointe problématique
    const { data: itemsData, error: itemsError } = await supabase
      .from("invoice_items")
      .select(
        `
        id,
        invoice_id,
        product_id,
        quantity,
        price,
        is_external,
        external_reference,
        external_description,
        magasin_id
      `,
      )
      .eq("invoice_id", invoiceId);

    if (itemsError) throw itemsError;

    // Étape 3: Si des articles ont des product_id, charger les produits
    const productIds = (itemsData || [])
      .filter((item) => item.product_id && !item.is_external)
      .map((item) => item.product_id);

    let productsMap = {};
    if (productIds.length > 0) {
      const { data: productsData, error: productsError } = await supabase
        .from("products_carreaux")
        .select(
          `
          id,
          name,
          reference,
          description,
          type_produit,
          nbr_pieces,
          longueur,
          largeur
        `,
        )
        .in("id", productIds);

      if (productsError)
        // console.warn("Erreur chargement produits:", productsError);

      // Créer une map pour accès rapide
      productsMap = (productsData || []).reduce((map, product) => {
        map[product.id] = product;
        return map;
      }, {});
    }

    // Enrichir les articles avec les produits
    const enrichedItems = (itemsData || []).map((item) => ({
      ...item,
      products_carreaux: item.product_id
        ? productsMap[item.product_id] || null
        : null,
    }));

    invoice.value = invoiceData;
    invoiceItems.value = enrichedItems;
  } catch (err) {
    error.value =
      err.message || "Erreur lors de la récupération de la commande.";
  } finally {
    loading.value = false;
  }
};

const markAsDelivered = async () => {
  try {
    const { error: updateError } = await supabase
      .from("invoices")
      .update({ delivery: true, status: "delivered" })
      .eq("id", route.params.id);

    if (updateError) throw updateError;

    invoice.value.delivery = true;
    invoice.value.status = "delivered";
    successMessage.value = "Commande marquée comme livrée !";

    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err) {
    error.value =
      err.message || "Erreur lors de la mise à jour de la commande.";
  }
};

const handleDownloadDeliveryNote = async () => {
  try {
    downloadingDeliveryNote.value = true;
    const { downloadDeliveryNote } = useDeliveryNoteGenerator();
    await downloadDeliveryNote(route.params.id);
    successMessage.value = "Bon de livraison généré avec succès !";

    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err) {
    error.value =
      err.message || "Erreur lors de la génération du bon de livraison.";
  } finally {
    downloadingDeliveryNote.value = false;
  }
};

const calculateSubtotal = () => {
  return invoiceItems.value.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );
};

const calculateTax = () => {
  const taxRate = (companySettings.value?.tax_rate || 20) / 100;
  return calculateSubtotal() * taxRate;
};

// Taux de TVA pour affichage dans le template
const displayTaxRate = computed(() => {
  return companySettings.value?.tax_rate || 20;
});

onMounted(async () => {
  if (isLoadingUser.value) await loadCurrentUser();
  await Promise.all([fetchCompanySettings(), fetchInvoiceDetails()]);
});
</script>

<template>
  <UContainer class="py-4 sm:py-8 bg-gray-100">
    <UPageHeader
      title="Détails de la commande"
      :description="
        invoice
          ? `Commande ${invoice.reference || route.params.id}`
          : 'Chargement...'
      "
      class="mb-6 sm:mb-8"
    >
      <template #actions>
        <div class="flex flex-wrap gap-2 sm:gap-3">
          <UButton
            label="Retour"
            icon="i-heroicons-arrow-left"
            color="gray"
            variant="outline"
            @click="router.push('/commande/index')"
          />
          <UButton
            v-if="invoice && !invoice.delivery"
            label="Marquer comme livrée"
            icon="i-heroicons-check"
            color="blue"
            @click="markAsDelivered"
          />
          <UButton
            :label="
              downloadingDeliveryNote
                ? 'Génération...'
                : 'Télécharger bon de livraison'
            "
            icon="i-heroicons-document-arrow-down"
            color="green"
            :loading="downloadingDeliveryNote"
            :disabled="downloadingDeliveryNote || !invoice"
            @click="handleDownloadDeliveryNote"
          />
        </div>
      </template>
    </UPageHeader>

    <!-- Messages d'erreur et de succès -->
    <UAlert
      v-if="error"
      title="Erreur"
      :description="error"
      icon="i-heroicons-exclamation-triangle"
      color="red"
      variant="subtle"
      class="mb-4"
    />

    <UAlert
      v-if="successMessage"
      title="Succès"
      :description="successMessage"
      icon="i-heroicons-check-circle"
      color="green"
      variant="subtle"
      class="mb-4"
    />

    <!-- Contenu principal -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="text-center">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"
        />
        <p class="text-gray-600">Chargement des détails de la commande...</p>
      </div>
    </div>

    <UCard v-else-if="invoice" class="shadow-lg rounded-lg bg-white">
      <!-- En-tête de commande -->
      <template #header>
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">COMMANDE</h1>
            <p class="text-gray-600 mt-1">
              {{ invoice.reference || `#${invoice.id}` }}
            </p>
          </div>
          <div class="text-right">
            <UBadge
              :label="invoice.delivery ? 'Livrée' : 'En attente'"
              :color="invoice.delivery ? 'green' : 'orange'"
              size="lg"
            />
            <p class="text-sm text-gray-600 mt-2">
              Date: {{ new Date(invoice.date).toLocaleDateString("fr-FR") }}
            </p>
          </div>
        </div>
      </template>

      <!-- Informations entreprise et client -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
        <!-- Information entreprise -->
        <div class="bg-gray-50 p-4 sm:p-6 rounded-lg">
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
                    companySettings?.company_phone || "Téléphone non renseigné"
                  }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-heroicons-envelope"
                  class="w-4 h-4 text-primary-500"
                />
                <span class="font-medium text-gray-700 dark:text-gray-200">
                  {{ companySettings?.company_email || "Email non renseigné" }}
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

        <!-- Information client -->
        <div class="bg-gray-50 p-4 sm:p-6 rounded-lg">
          <h3 class="text-lg font-semibold mb-3 text-gray-900">Client</h3>
          <div class="space-y-1 text-gray-700">
            <p class="font-medium">{{ invoice.clients.name }}</p>
            <p v-if="invoice.clients.address">{{ invoice.clients.address }}</p>
            <p v-if="invoice.clients.email">{{ invoice.clients.email }}</p>
            <p v-if="invoice.clients.phone">{{ invoice.clients.phone }}</p>
          </div>
        </div>
      </div>

      <!-- Articles de la commande -->
      <div class="mb-6 sm:mb-8">
        <h3
          class="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800"
        >
          Articles commandés
        </h3>
        <div class="overflow-x-auto rounded-lg border border-gray-200">
          <table class="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-2 sm:px-6 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider"
                >
                  Description
                </th>
                <th
                  class="px-2 sm:px-6 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider"
                >
                  Référence
                </th>
                <th
                  class="px-2 sm:px-6 py-2 sm:py-3 text-center font-medium text-gray-500 uppercase tracking-wider"
                >
                  Quantité (m²)
                </th>
                <th
                  class="px-2 sm:px-6 py-2 sm:py-3 text-center font-medium text-gray-500 uppercase tracking-wider"
                >
                  Cartons nécessaires
                </th>
                <th
                  class="px-2 sm:px-6 py-2 sm:py-3 text-right font-medium text-gray-500 uppercase tracking-wider"
                >
                  Prix unitaire
                </th>
                <th
                  class="px-2 sm:px-6 py-2 sm:py-3 text-right font-medium text-gray-500 uppercase tracking-wider"
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="item in invoiceItems"
                :key="item.id"
                class="hover:bg-gray-50"
              >
                <td class="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                  <div
                    class="text-xs sm:text-sm font-medium text-gray-900 flex items-center gap-2 flex-wrap"
                  >
                    <span>{{
                      item.is_external
                        ? item.external_description || "Produit externe"
                        : item.products_carreaux?.name || "Produit supprimé"
                    }}</span>
                    <UBadge
                      v-if="item.is_external"
                      color="purple"
                      variant="soft"
                      size="xs"
                      >Externe</UBadge
                    >
                  </div>
                  <div
                    v-if="
                      item.is_external
                        ? item.external_description
                        : item.products_carreaux?.description
                    "
                    class="text-xs sm:text-sm text-gray-500"
                  >
                    {{
                      item.is_external
                        ? item.external_description
                        : item.products_carreaux.description
                    }}
                  </div>
                </td>
                <td
                  class="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500"
                >
                  {{
                    item.is_external
                      ? item.external_reference || "N/A"
                      : item.products_carreaux?.reference || "N/A"
                  }}
                </td>
                <td
                  class="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 text-center"
                >
                  {{ item.quantity }}
                </td>
                <td
                  class="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-center"
                >
                  <template v-if="!item.is_external && item.products_carreaux">
                    <CartonCalculator
                      :product="{
                        ...item.products_carreaux,
                        stock: item.quantity,
                      }"
                      :show-only-conditionnement="false"
                    />
                  </template>
                  <span
                    v-else-if="item.is_external"
                    class="text-purple-600 text-xs"
                    >Produit externe</span
                  >
                  <span v-else class="text-gray-500">—</span>
                </td>
                <td
                  class="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 text-right"
                >
                  {{ item.price.toFixed(2) }} {{ companySettings?.currency }}
                </td>
                <td
                  class="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 text-right"
                >
                  {{ (item.quantity * item.price).toFixed(2) }}
                  {{ companySettings?.currency }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Totaux -->
      <div class="border-t border-gray-200 pt-4 sm:pt-6">
        <div class="max-w-full sm:max-w-md ml-auto space-y-2 sm:space-y-3">
          <div class="flex justify-between text-xs sm:text-sm">
            <span class="text-gray-600">Sous-total HT:</span>
            <span class="font-medium"
              >{{ calculateSubtotal().toFixed(2) }}
              {{ companySettings?.currency }}</span
            >
          </div>
          <div class="flex justify-between text-xs sm:text-sm">
            <span class="text-gray-600">TVA ({{ displayTaxRate }}%):</span>
            <span class="font-medium"
              >{{ calculateTax().toFixed(2) }}
              {{ companySettings?.currency }}</span
            >
          </div>
          <div
            class="flex justify-between text-base sm:text-lg font-bold border-t border-gray-200 pt-2 sm:pt-3"
          >
            <span>Total TTC:</span>
            <span
              >{{ invoice.total.toFixed(2) }}
              {{ companySettings?.currency }}</span
            >
          </div>
        </div>
      </div>

      <!-- Informations de livraison -->
      <div class="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
        <div class="text-xs sm:text-sm text-gray-600 space-y-1">
          <p>
            <strong>Statut de livraison:</strong>
            <span
              :class="invoice.delivery ? 'text-green-600' : 'text-orange-600'"
            >
              {{ invoice.delivery ? "Livrée" : "En attente de livraison" }}
            </span>
          </p>
          <p>
            <strong>Retrait magasin:</strong> Présentez le bon de livraison à
            l'accueil
          </p>
        </div>
      </div>
    </UCard>

    <div v-else-if="!loading" class="text-center py-12">
      <p class="text-gray-500">Commande introuvable</p>
      <UButton
        label="Retour à la liste"
        icon="i-heroicons-arrow-left"
        color="gray"
        variant="outline"
        class="mt-4"
        @click="router.push('/commande/index')"
      />
    </div>
  </UContainer>
</template>
