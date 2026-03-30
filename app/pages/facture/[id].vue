<script setup>
import { useCurrentUser } from "../../composables/useCurrentUser";
import { useCompanySettings } from "../../composables/useCompanySettings";
import { usePdfGenerator } from "../../composables/usePdfGenerator";

const { companyId, isLoadingUser, loadCurrentUser } = useCurrentUser();
const { settings: companySettings, fetchCompanySettings } =
  useCompanySettings();

const supabase = useSupabaseClient();
const router = useRouter();
const route = useRoute();

const invoice = ref(null);
const invoiceItems = ref([]);
const loading = ref(false);
const error = ref(null);
const downloadingPdf = ref(false);

const { fetchInvoiceDetails: fetchInvoiceDetailsForPdf, downloadPDF } =
  usePdfGenerator();

const fetchInvoiceDetails = async () => {
  try {
    loading.value = true;
    const invoiceId = route.params.id;

    const { invoice: invoiceData, items } = await fetchInvoiceDetailsForPdf(
      String(invoiceId),
    );

    invoice.value = invoiceData;
    invoiceItems.value = items;
  } catch (err) {
    error.value =
      err.message || "Erreur lors de la récupération de la facture.";
  } finally {
    loading.value = false;
  }
};

const markAsPaid = async () => {
  try {
    const { error: updateError } = await supabase
      .from("invoices")
      .update({ status: "paid" })
      .eq("id", route.params.id);

    if (updateError) throw updateError;

    invoice.value.status = "paid";
  } catch (err) {
    error.value = err.message || "Erreur lors de la mise à jour de la facture.";
  }
};

const handleDownloadPDF = async () => {
  try {
    downloadingPdf.value = true;
    await downloadPDF(String(route.params.id));
  } catch (err) {
    error.value = err.message || "Erreur lors de la génération du PDF.";
  } finally {
    downloadingPdf.value = false;
  }
};

const calculateSubtotal = () => {
  return invoiceItems.value.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );
};

const calculateTax = () => {
  const taxRate = companySettings.value?.tax_rate || 20; // Utiliser le taux de TVA des paramètres ou 20% par défaut
  return calculateSubtotal() * (taxRate / 100);
};

onMounted(async () => {
  if (isLoadingUser.value) await loadCurrentUser();
  if (companyId.value) await fetchCompanySettings(companyId.value);
  await fetchInvoiceDetails();
});
</script>

<template>
  <UContainer class="py-8 bg-gray-100">
    <UPageHeader
      title="Détails de la facture"
      :description="
        invoice
          ? `Facture ${invoice.reference || route.params.id}`
          : 'Chargement...'
      "
      class="mb-8"
    >
      <template #actions>
        <div class="flex items-center space-x-3">
          <!-- Badge pour facture avec produits externes -->
          <UBadge
            v-if="invoice?.is_external"
            label="Produits Externes"
            color="purple"
            variant="soft"
          />
          <!-- Badge statut payé -->
          <UBadge
            v-if="
              invoice?.status === 'paid' || invoice?.status === 'partially_paid'
            "
            :label="
              invoice?.status === 'paid' ? 'Payée' : 'Partiellement payée'
            "
            :color="invoice?.status === 'paid' ? 'green' : 'amber'"
            variant="soft"
          />
          <!-- Boutons d'actions -->
          <UButton
            label="Retour"
            icon="i-heroicons-arrow-left"
            color="gray"
            variant="outline"
            @click="router.push('/facture')"
          />
          <UButton
            v-if="invoice && invoice.status !== 'paid'"
            label="Marquer comme payée"
            icon="i-heroicons-check"
            color="green"
            @click="markAsPaid"
          />
          <UButton
            :label="downloadingPdf ? 'Génération...' : 'Télécharger PDF'"
            icon="i-heroicons-document-arrow-down"
            color="primary"
            :loading="downloadingPdf"
            :disabled="downloadingPdf || !invoice"
            @click="handleDownloadPDF"
          />
        </div>
      </template>
    </UPageHeader>

    <!-- Messages d'erreur -->
    <UAlert
      v-if="error"
      title="Erreur"
      :description="error"
      icon="i-heroicons-exclamation-triangle"
      color="red"
      variant="subtle"
      class="mb-4"
    />

    <!-- Contenu principal -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="text-center">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"
        />
        <p class="text-gray-600">Chargement des détails de la facture...</p>
      </div>
    </div>

    <UCard v-else-if="invoice" class="shadow-lg rounded-lg bg-white">
      <!-- En-tête de facture -->
      <template #header>
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">FACTURE</h1>
            <p class="text-gray-600 mt-1">
              {{ invoice.reference || `#${invoice.id}` }}
            </p>
          </div>
          <div class="text-right">
            <UBadge
              :label="
                invoice.status === 'paid'
                  ? 'Payée'
                  : invoice.status === 'partially_paid'
                    ? 'Partiellement payée'
                    : 'En attente'
              "
              :color="
                invoice.status === 'paid'
                  ? 'green'
                  : invoice.status === 'partially_paid'
                    ? 'amber'
                    : 'orange'
              "
              size="lg"
            />
            <p class="text-sm text-gray-600 mt-2">
              Date: {{ new Date(invoice.date).toLocaleDateString("fr-FR") }}
            </p>
          </div>
        </div>
      </template>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <!-- Informations entreprise et client -->
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
        <div class="bg-gray-50 p-6 rounded-lg">
          <h3 class="text-lg font-semibold mb-3 text-gray-900">Facturé à</h3>
          <div class="space-y-1 text-gray-700">
            <p class="font-medium">{{ invoice.clients.name }}</p>
            <p v-if="invoice.clients.address">{{ invoice.clients.address }}</p>
            <p v-if="invoice.clients.email">{{ invoice.clients.email }}</p>
            <p v-if="invoice.clients.phone">{{ invoice.clients.phone }}</p>
          </div>
        </div>
      </div>

      <!-- Articles de la facture -->
      <div class="mb-8">
        <h3 class="text-lg font-semibold mb-4 text-gray-800">Articles</h3>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Description
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Référence
                </th>
                <th
                  class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Quantité
                </th>
                <th
                  class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Prix unitaire
                </th>
                <th
                  class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
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
                <td class="px-6 py-4 whitespace-nowrap">
                  <div
                    class="text-sm font-medium text-gray-900 flex items-center gap-2"
                  >
                    <!-- Afficher le nom du produit (interne ou externe) -->
                    {{
                      item.is_external
                        ? item.external_description
                        : item.products_carreaux?.name || "Produit supprimé"
                    }}
                    <!-- Badge pour produits externes -->
                    <UBadge
                      v-if="item.is_external"
                      label="Externe"
                      color="purple"
                      variant="soft"
                      size="xs"
                    />
                  </div>
                  <div
                    v-if="
                      !item.is_external && item.products_carreaux?.description
                    "
                    class="text-sm text-gray-500"
                  >
                    {{ item.products_carreaux.description }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <!-- Afficher la référence (interne ou externe) -->
                  {{
                    item.is_external
                      ? item.external_reference
                      : item.products_carreaux?.reference || "N/A"
                  }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center"
                >
                  {{ item.quantity }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right"
                >
                  {{ item.price.toFixed(2) }} {{ companySettings?.currency }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right"
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
      <div class="border-t border-gray-200 pt-6">
        <div class="max-w-md ml-auto space-y-3">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Sous-total HT:</span>
            <span class="font-medium"
              >{{ calculateSubtotal().toFixed(2) }}
              {{ companySettings?.currency }}</span
            >
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600"
              >TVA ({{ companySettings?.tax_rate || 20 }}%):</span
            >
            <span class="font-medium"
              >{{ calculateTax().toFixed(2) }}
              {{ companySettings?.currency }}</span
            >
          </div>
          <div
            class="flex justify-between text-lg font-bold border-t border-gray-200 pt-3"
          >
            <span>Total TTC:</span>
            <span
              >{{ invoice.total.toFixed(2) }}
              {{ companySettings?.currency }}</span
            >
          </div>
        </div>
      </div>

      <!-- Informations de paiement -->
      <div class="mt-8 pt-6 border-t border-gray-200">
        <div class="text-sm text-gray-600 space-y-1">
          <p><strong>Conditions de paiement:</strong> 30 jours net</p>
          <p>
            <strong>Date d'échéance:</strong>
            {{
              new Date(
                new Date(invoice.date).getTime() + 30 * 24 * 60 * 60 * 1000,
              ).toLocaleDateString("fr-FR")
            }}
          </p>
        </div>
      </div>
    </UCard>

    <div v-else-if="!loading" class="text-center py-12">
      <p class="text-gray-500">Facture introuvable</p>
      <UButton
        label="Retour à la liste"
        icon="i-heroicons-arrow-left"
        color="gray"
        variant="outline"
        class="mt-4"
        @click="router.push('/facture')"
      />
    </div>
  </UContainer>
</template>
