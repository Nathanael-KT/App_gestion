<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
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

const supabase = useSupabaseClient();
const router = useRouter();
const route = useRoute();

// États de l'application
const loading = ref(true);
const saving = ref(false);
const error = ref(null);

// Données de la facture
const invoice = ref(null);
const payments = ref([]);
const newPayment = ref({
  amount: 0,
  date: new Date().toISOString().split("T")[0],
  method: "virement",
  reference: "",
  note: "",
});

// Méthodes de paiement disponibles
const paymentMethods = [
  { value: "virement", label: "Virement bancaire" },
  { value: "cheque", label: "Chèque" },
  { value: "especes", label: "Espèces" },
  { value: "carte", label: "Carte bancaire" },
  { value: "autre", label: "Autre" },
];

// Calculés
const totalPaid = computed(() => {
  return payments.value.reduce((sum, payment) => sum + payment.amount, 0);
});

const remainingAmount = computed(() => {
  return invoice.value ? invoice.value.total - totalPaid.value : 0;
});

const isFullyPaid = computed(() => {
  return remainingAmount.value <= 0;
});

const paymentProgress = computed(() => {
  if (!invoice.value || invoice.value.total === 0) return 0;
  return Math.min((totalPaid.value / invoice.value.total) * 100, 100);
});

// Récupérer la facture et ses paiements
const fetchInvoiceData = async () => {
  try {
    loading.value = true;
    error.value = null;

    // Récupérer l'ID de la facture depuis l'URL ou depuis les paramètres
    const invoiceId = route.query.invoice_id || route.params.id;

    if (!invoiceId) {
      useToast().add({
        title: "Erreur",
        description: "ID de facture manquant",
        icon: "i-lucide-alert-circle",
        color: "red",
      });
      return;
    }

    // Récupérer la facture avec indication produits externes
    const { data: invoiceData, error: invoiceError } = await supabase
      .from("invoices")
      .select(
        `
        *,
        clients(id, name, email, phone),
        invoice_items(
          id,
          product_id,
          external_reference,
          external_description,
          is_external,
          quantity,
          price
        )
      `
      )
      .eq("id", invoiceId)
      .single();

    if (invoiceError) throw invoiceError;

    if (!invoiceData) {
      useToast().add({
        title: "Erreur",
        description: "Facture non trouvée",
        icon: "i-lucide-alert-circle",
        color: "red",
      });
      return;
    }

    invoice.value = {
      ...invoiceData,
      date: new Date(invoiceData.date).toLocaleDateString("fr-cf"),
      hasExternalProducts:
        invoiceData.invoice_items?.some((item) => item.is_external) || false,
      externalProductsCount:
        invoiceData.invoice_items?.filter((item) => item.is_external).length ||
        0,
      internalProductsCount:
        invoiceData.invoice_items?.filter((item) => !item.is_external).length ||
        0,
    };

    // Récupérer les paiements existants (simulés avec des colonnes personnalisées ou table séparée)
    // Pour l'instant, on simule avec des données locales si pas de table payments
    await loadExistingPayments(invoiceId);
  } catch (err) {
    console.error("Erreur lors de la récupération de la facture:", err);
    useToast().add({
      title: "Erreur",
      description:
        err.message || "Erreur lors de la récupération de la facture",
      icon: "i-lucide-alert-circle",
      color: "red",
    });
  } finally {
    loading.value = false;
  }
};

// Charger les paiements existants
const loadExistingPayments = async (invoiceId) => {
  try {
    // Essayer d'abord de récupérer depuis une table payments si elle existe
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: false });

    if (error) {
      // Si la table n'existe pas, initialiser avec un tableau vide
      console.log(
        "Table payments non trouvée, initialisation avec données vides"
      );
      payments.value = [];
      useToast().add({
        title: "Information",
        description:
          "Table de paiements non configurée. Fonctionnalité en mode simulation.",
        icon: "i-lucide-info",
        color: "blue",
      });
      return;
    }

    if (data && data.length > 0) {
      payments.value = data.map((payment) => ({
        ...payment,
        date: new Date(payment.created_at).toLocaleDateString("fr-cf"),
        time: new Date(payment.created_at).toLocaleTimeString("fr-cf", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));
    } else {
      payments.value = [];
    }
  } catch (err) {
    // En cas d'erreur, initialiser avec un tableau vide
    console.log("Initialisation des paiements vides:", err);
    payments.value = [];
    useToast().add({
      title: "Information",
      description: "Mode simulation des paiements activé",
      icon: "i-lucide-info",
      color: "blue",
    });
  }
};

// Ajouter un nouveau paiement
const addPayment = async () => {
  if (newPayment.value.amount <= 0) {
    useToast().add({
      title: "Erreur",
      description: "Le montant du paiement doit être supérieur à 0",
      icon: "i-lucide-alert-circle",
      color: "red",
    });
    return;
  }

  if (newPayment.value.amount > remainingAmount.value) {
    useToast().add({
      title: "Erreur",
      description: `Le montant ne peut pas dépasser le reste à payer (${remainingAmount.value.toFixed(
        2
      )} {${companySettings?.currency }})`,
      icon: "i-lucide-alert-circle",
      color: "red",
    });
    return;
  }

  try {
    saving.value = true;
    error.value = null;

    const paymentData = {
      invoice_id: invoice.value.id,
      amount: parseFloat(newPayment.value.amount),
      payment_date: newPayment.value.date,
      payment_method: newPayment.value.method,
      reference: newPayment.value.reference || null,
      note: newPayment.value.note || null,
      created_at: new Date().toISOString(),
    };

    // Essayer d'insérer dans la table payments
    const { data, error: insertError } = await supabase
      .from("payments")
      .insert([paymentData])
      .select()
      .single();

    if (insertError) {
      // Si la table n'existe pas, ajouter localement et marquer comme à créer
      console.log("Table payments non trouvée, ajout local");
      const localPayment = {
        id: Date.now(), // ID temporaire
        ...paymentData,
        isLocal: true, // Marquer comme local
      };
      payments.value.unshift(localPayment);
    } else {
      payments.value.unshift(data);
    }

    // Réinitialiser le formulaire
    newPayment.value = {
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      method: "virement",
      reference: "",
      note: "",
    };

    useToast().add({
      title: "Succès",
      description: "Paiement ajouté avec succès",
      icon: "i-lucide-check-circle",
      color: "green",
    });

    // Si totalement payé, proposer de marquer la facture comme payée
    if (isFullyPaid.value) {
      setTimeout(() => {
        if (
          confirm(
            "La facture est maintenant entièrement payée. Voulez-vous la marquer comme payée ?"
          )
        ) {
          markInvoiceAsPaid();
        }
      }, 1000);
    }
  } catch (err) {
    console.error("Erreur lors de l'ajout du paiement:", err);
    useToast().add({
      title: "Erreur",
      description: err.message || "Erreur lors de l'ajout du paiement",
      icon: "i-lucide-alert-circle",
      color: "red",
    });
  } finally {
    saving.value = false;
  }
};

// Supprimer un paiement
const removePayment = async (paymentId, isLocal = false) => {
  if (!confirm("Êtes-vous sûr de vouloir supprimer ce paiement ?")) {
    return;
  }

  try {
    if (!isLocal) {
      const { error: deleteError } = await supabase
        .from("payments")
        .delete()
        .eq("id", paymentId);

      if (deleteError) throw deleteError;
    }

    // Supprimer de la liste locale
    payments.value = payments.value.filter((p) => p.id !== paymentId);

    useToast().add({
      title: "Succès",
      description: "Paiement supprimé avec succès",
      icon: "i-lucide-check-circle",
      color: "green",
    });
  } catch (err) {
    console.error("Erreur lors de la suppression du paiement:", err);
    useToast().add({
      title: "Erreur",
      description: err.message || "Erreur lors de la suppression du paiement",
      icon: "i-lucide-alert-circle",
      color: "red",
    });
  }
};

// Marquer la facture comme payée
const markInvoiceAsPaid = async () => {
  try {
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "paid",
      })
      .eq("id", invoice.value.id);

    if (updateError) throw updateError;

    invoice.value.status = "paid";

    useToast().add({
      title: "Succès",
      description:
        "Facture marquée comme payée ! Le stock a été ajusté lors de la création de la commande.",
      icon: "i-lucide-check-circle",
      color: "green",
    });

    setTimeout(() => {
      router.push("/facture");
    }, 2000);
  } catch (err) {
    console.error("Erreur lors de la mise à jour de la facture:", err);
    useToast().add({
      title: "Erreur",
      description: err.message || "Erreur lors de la mise à jour de la facture",
      icon: "i-lucide-alert-circle",
      color: "red",
    });
  }
};

// Générer une référence de paiement automatique
const generatePaymentReference = () => {
  const date = new Date();
  const ref = `PAY-${invoice.value.reference}-${date.getFullYear()}${String(
    date.getMonth() + 1
  ).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}-${Math.floor(
    100 + Math.random() * 900
  )}`;
  newPayment.value.reference = ref;
};

onMounted(() => {
  fetchInvoiceData();
});
</script>

<template>
  <div class="container mx-auto px-6 py-8">
    <!-- Header -->
    <div class="mb-8">
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 class="text-3xl font-bold text-gray-900">
            Gestion des Paiements
          </h1>
          <p class="text-gray-600 mt-1">
            Suivez les paiements partiels et avances
          </p>
        </div>
        <UButton
          icon="i-lucide-arrow-left"
          color="gray"
          variant="soft"
          @click="router.push('/facture')"
        >
          Retour aux factures
        </UButton>
      </div>
    </div>

    <!-- Messages d'erreur seulement (les succès utilisent maintenant les toasts) -->
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

    <div v-else-if="invoice" class="space-y-6">
      <!-- Informations de la facture -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-gray-900">
            Facture {{ invoice.reference }}
          </h2>
          <div class="flex items-center gap-3">
            <UBadge
              :color="invoice.status === 'paid' ? 'green' : 'yellow'"
              :label="invoice.status === 'paid' ? 'Payée' : 'En attente'"
              variant="soft"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 class="text-sm font-medium text-gray-500 mb-2">Client</h3>
            <p class="text-lg font-semibold text-gray-900">
              {{ invoice.clients.name }}
            </p>
            <p class="text-sm text-gray-600">{{ invoice.clients.email }}</p>
          </div>

          <div>
            <h3 class="text-sm font-medium text-gray-500 mb-2">Date</h3>
            <p class="text-lg text-gray-900">{{ invoice.date }}</p>
          </div>

          <div>
            <h3 class="text-sm font-medium text-gray-500 mb-2">
              Total facture
              <span v-if="invoice.hasExternalProducts" class="ml-2">
                <UBadge color="purple" variant="soft" size="xs"
                  >Produits externes</UBadge
                >
              </span>
            </h3>
            <p class="text-2xl font-bold text-gray-900">
              {{ invoice.total.toFixed(2) }}{{ companySettings?.currency }}
            </p>
            <p
              v-if="invoice.hasExternalProducts"
              class="text-xs text-gray-500 mt-1"
            >
              {{ invoice.internalProductsCount }} produit(s) stock +
              {{ invoice.externalProductsCount }} externe(s)
            </p>
          </div>
        </div>
      </div>

      <!-- Résumé des paiements -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">
          Résumé des Paiements
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div class="text-center p-4 bg-blue-50 rounded-lg">
            <h3 class="text-sm font-medium text-blue-600 mb-2">Total Payé</h3>
            <p class="text-2xl font-bold text-blue-900">
              {{ totalPaid.toFixed(2) }}{{ companySettings?.currency }}
            </p>
          </div>

          <div class="text-center p-4 bg-orange-50 rounded-lg">
            <h3 class="text-sm font-medium text-orange-600 mb-2">
              Reste à Payer
            </h3>
            <p class="text-2xl font-bold text-orange-900">
              {{ remainingAmount.toFixed(2) }}{{ companySettings?.currency }}
            </p>
          </div>

          <div class="text-center p-4 bg-green-50 rounded-lg">
            <h3 class="text-sm font-medium text-green-600 mb-2">Progression</h3>
            <p class="text-2xl font-bold text-green-900">
              {{ paymentProgress.toFixed(1) }}%
            </p>
          </div>
        </div>

        <!-- Barre de progression -->
        <div class="w-full bg-gray-200 rounded-full h-3">
          <div
            class="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
            :style="{ width: `${paymentProgress}%` }"
          />
        </div>

        <div class="flex justify-between text-xs text-gray-600 mt-2">
          <span>0{{ companySettings?.currency }}</span>
          <span>{{ invoice.total.toFixed(2) }}{{ companySettings?.currency }}</span>
        </div>
      </div>

      <!-- Ajouter un paiement -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">
          Nouveau Paiement
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Montant ({{ companySettings?.currency }})
            </label>
            
            <UInput
              v-model="newPayment.amount"
              type="number"
              min="0"
              :max="null"
              placeholder="0.00"
              inputmode="decimal"
              step="any"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"
              >Date</label
            >
            <UInput
              v-model="newPayment.date"
              type="date"
              :min="new Date().toISOString().split('T')[0]"
              :max="new Date().toISOString().split('T')[0]"
              :disabled="true"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"
              >Méthode</label
            >
            <select
              v-model="newPayment.method"
              class="block w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option
                v-for="method in paymentMethods"
                :key="method.value"
                :value="method.value"
              >
                {{ method.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"
              >Référence</label
            >
            <div class="flex gap-2">
              <UInput
                v-model="newPayment.reference"
                placeholder="Référence..."
                class="flex-1"
              />
              <UButton
                icon="i-lucide-refresh-cw"
                variant="soft"
                size="sm"
                title="Générer une référence"
                @click="generatePaymentReference"
              />
            </div>
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2"
            >Note (optionnel)</label
          >
          <UTextarea
            v-model="newPayment.note"
            placeholder="Note sur le paiement..."
            rows="2"
          />
        </div>

        <div class="flex justify-end gap-3">
          <UButton
            icon="i-lucide-plus"
            color="primary"
            :loading="saving"
            :disabled="
              saving ||
              newPayment.amount <= 0 ||
              newPayment.amount > remainingAmount
            "
            @click="addPayment"
          >
            {{ saving ? "Ajout..." : "Ajouter le paiement" }}
          </UButton>
        </div>
      </div>

      <!-- Historique des paiements -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">
          Historique des Paiements
        </h2>

        <div v-if="payments.length === 0" class="text-center py-8">
          <UIcon
            name="i-lucide-credit-card"
            class="w-12 h-12 mx-auto mb-4 text-gray-300"
          />
          <p class="text-gray-600">Aucun paiement enregistré</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="payment in payments"
            :key="payment.id"
            class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <div class="flex items-center gap-4">
              <div
                class="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white"
              >
                <UIcon name="i-lucide-credit-card" class="w-5 h-5" />
              </div>

              <div>
                <div class="flex items-center gap-3">
                  <p class="font-semibold text-gray-900">
                    {{ payment.amount.toFixed(2) }}{{ companySettings?.currency }}
                  </p>
                  <UBadge
                    :label="
                      paymentMethods.find(
                        (m) => m.value === payment.payment_method
                      )?.label || payment.payment_method
                    "
                    variant="soft"
                    color="blue"
                    size="sm"
                  />
                  <span v-if="payment.isLocal" class="text-xs text-orange-600"
                    >(Local)</span
                  >
                </div>
                <p class="text-sm text-gray-600">
                  {{
                    new Date(payment.payment_date).toLocaleDateString("fr-cf")
                  }}
                  <span v-if="payment.reference">
                    • Réf: {{ payment.reference }}</span
                  >
                </p>
                <p v-if="payment.note" class="text-xs text-gray-500 mt-1">
                  {{ payment.note }}
                </p>
              </div>
            </div>

            <UButton
              icon="i-lucide-trash-2"
              color="red"
              variant="soft"
              size="sm"
              @click="removePayment(payment.id, payment.isLocal)"
            />
          </div>
        </div>
      </div>

      <!-- Actions finales -->
      <div
        v-if="!invoice.status === 'paid'"
        class="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              Finaliser la facture
            </h3>
            <p class="text-sm text-gray-600">
              {{
                isFullyPaid
                  ? "La facture est entièrement payée"
                  : `Il reste ${remainingAmount.toFixed(2)} ${companySettings?.currency} à encaisser`
              }}
            </p>
          </div>

          <UButton
            v-if="isFullyPaid && invoice.status !== 'paid'"
            icon="i-lucide-check-circle"
            color="green"
            @click="markInvoiceAsPaid"
          >
            Marquer comme payée
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
