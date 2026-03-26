<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <!-- Indicateur de chargement global -->
    <div
      v-if="loading && !cashSummary"
      class="flex justify-center items-center min-h-[400px]"
    >
      <div class="text-center">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
        />
        <p class="text-gray-600">Chargement des données de caisse...</p>
      </div>
    </div>

    <!-- Contenu principal -->
    <template v-else>
      <!-- En-tête du rapport -->
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Rapport de Caisse</h1>
            <p class="text-gray-600">
              Cumul des caisses validées - {{ formatDate(new Date()) }}
            </p>
          </div>
          <div class="flex gap-3">
            <UButton
              :loading="loading"
              color="primary"
              variant="solid"
              size="lg"
              @click="loadCashSummary"
            >
              <Icon
                name="i-heroicons-document-chart-bar"
                class="w-4 h-4 mr-2"
              />
              Actualiser
            </UButton>
            <UButton
              v-if="cashSummary"
              color="success"
              variant="outline"
              size="lg"
              @click="exportReport"
            >
              <Icon name="i-heroicons-arrow-down-tray" class="w-4 h-4 mr-2" />
              Export PDF
            </UButton>
          </div>
        </div>

        <!-- Info sur le système de cumul -->
        <UAlert
          color="info"
          variant="soft"
          title="Système de Gestion de Caisse"
          description="Cette page cumule tous les comptages validés depuis le dernier vidage. Vous pouvez consulter l'historique et effectuer un vidage si nécessaire."
          class="mb-4"
        />
      </div>

      <!-- Résumé de la caisse cumulée -->
      <div
        v-if="cashSummary"
        class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6"
      >
        <div
          class="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-blue-100 text-sm font-medium">
                Montant Disponible
              </p>
              <p class="text-2xl font-bold">
                {{ formatCurrency(cashSummary.totalCumulated) }}
              </p>
              <p class="text-xs text-blue-200 mt-1">Après tous les vidages</p>
            </div>
            <Icon name="i-heroicons-banknotes" class="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div
          class="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-green-100 text-sm font-medium">Total Compté</p>
              <p class="text-2xl font-bold">
                {{ formatCurrency(cashSummary.totalCountedAmount) }}
              </p>
              <p class="text-xs text-green-200 mt-1">
                {{ cashSummary.countingsCount }} comptages
              </p>
            </div>
            <Icon
              name="i-heroicons-calculator"
              class="w-8 h-8 text-green-200"
            />
          </div>
        </div>

        <div
          class="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg p-6"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-red-100 text-sm font-medium">Total Vidé</p>
              <p class="text-2xl font-bold">
                {{ formatCurrency(cashSummary.totalEmptied) }}
              </p>
              <p class="text-xs text-red-200 mt-1">
                {{ cashSummary.emptyingsCount }} vidages
              </p>
            </div>
            <Icon
              name="i-heroicons-arrow-up-tray"
              class="w-8 h-8 text-red-200"
            />
          </div>
        </div>

        <div
          class="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-purple-100 text-sm font-medium">
                Différence Totale
              </p>
              <p class="text-2xl font-bold">
                {{ formatCurrency(cashSummary.totalDifference) }}
              </p>
              <p class="text-xs text-purple-200 mt-1">
                {{ cashSummary.totalDifference >= 0 ? "Excédent" : "Manque" }}
              </p>
            </div>
            <Icon
              :name="
                cashSummary.totalDifference >= 0
                  ? 'i-heroicons-arrow-trending-up'
                  : 'i-heroicons-arrow-trending-down'
              "
              class="w-8 h-8 text-purple-200"
            />
          </div>
        </div>
      </div>

      <!-- Formule de calcul -->
      <div v-if="cashSummary" class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          <Icon name="i-heroicons-calculator" class="w-5 h-5 inline mr-2" />
          Calcul du Montant Disponible
        </h2>
        <div class="bg-gray-50 p-4 rounded-lg">
          <p class="text-center text-lg font-mono">
            <span class="font-semibold text-green-600">{{
              formatCurrency(cashSummary.totalCountedAmount)
            }}</span>
            <span class="mx-2 text-gray-500">-</span>
            <span class="font-semibold text-red-600">{{
              formatCurrency(cashSummary.totalEmptied)
            }}</span>
            <span class="mx-2 text-gray-500">=</span>
            <span class="font-bold text-blue-600">{{
              formatCurrency(cashSummary.totalCumulated)
            }}</span>
          </p>
          <p class="text-center text-sm text-gray-600 mt-2">
            Total des comptages - Total des vidages = Montant disponible
          </p>
        </div>
      </div>

      <!-- Comptages journaliers validés -->
      <div
        v-if="dailyClosings.length > 0"
        class="bg-white rounded-lg shadow-lg p-6 mb-6"
      >
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gray-900">
            <Icon
              name="i-heroicons-calendar-days"
              class="w-5 h-5 inline mr-2"
            />
            Comptages de Caisse
          </h2>
          <div class="text-sm text-gray-600">
            {{ dailyClosings.length }} comptage(s) au total
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Montant Attendu
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Montant Compté
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Différence
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Compté par
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="row in paginatedCountings"
                :key="row.id"
                class="hover:bg-gray-50"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="font-medium text-gray-900">{{
                    formatDate(new Date(row.date))
                  }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="font-semibold text-blue-600">
                    {{ formatCurrency(row.expected_amount || 0) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="font-semibold text-green-600">
                    {{ formatCurrency(row.actual_amount || 0) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getDifferenceColor(row.difference || 0)">
                    {{ formatCurrency(row.difference || 0) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-sm text-gray-600">{{
                    row.counted_by || "N/A"
                  }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination pour les comptages -->
        <div v-if="countingsTotalPages > 1" class="flex justify-center mt-6">
          <UPagination
            v-model="countingsPage"
            :page-count="itemsPerPage"
            :total="dailyClosings.length"
          />
        </div>
      </div>

      <!-- Historique des vidages -->
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          <Icon name="i-heroicons-clock" class="w-5 h-5 inline mr-2" />
          Historique des Vidages
        </h2>

        <div v-if="emptyingHistory.length > 0">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Montant
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Destination
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Vidé par
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  v-for="row in paginatedEmptyings"
                  :key="row.id"
                  class="hover:bg-gray-50"
                >
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="font-medium text-gray-900">{{
                      formatDate(new Date(row.date))
                    }}</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="font-semibold text-red-600">
                      -{{ formatCurrency(row.amount || 0) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <UBadge color="info" variant="soft" size="sm">
                      {{ getDestinationLabel(row.destination || "") }}
                    </UBadge>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="text-sm text-gray-600">{{
                      row.emptied_by || "N/A"
                    }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination pour les vidages -->
          <div v-if="emptyingsTotalPages > 1" class="flex justify-center mt-6">
            <UPagination
              v-model="emptyingsPage"
              :page-count="itemsPerPage"
              :total="emptyingHistory.length"
            />
          </div>
        </div>

        <div v-else class="text-center py-8">
          <Icon
            name="i-heroicons-inbox"
            class="w-12 h-12 mx-auto text-gray-400 mb-3"
          />
          <p class="text-gray-500">Aucun vidage effectué pour le moment</p>
        </div>
      </div>

      <!-- Action de vidage -->
      <div v-if="cashSummary" class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          <Icon
            name="i-heroicons-building-library"
            class="w-5 h-5 inline mr-2"
          />
          Vidage de Caisse
        </h2>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-blue-900">Montant disponible :</h3>
              <p class="text-2xl font-bold text-blue-600">
                <UInput
                  v-model.number="emptyingForm.amount"
                  type="number"
                  :min="0"
                  :max="cashSummary.totalCumulated"
                  step="0.01"
                  class="w-full"
                  placeholder="Montant à vider"
                />
              </p>
              <p class="text-sm text-blue-700 mt-1">
                Basé sur {{ cashSummary.countingsCount }} comptage(s) depuis
                {{ cashSummary.lastEmptyDate || "le début" }}
              </p>
              <p>
                Le maximum a retirer
                {{ formatCurrency(cashSummary.totalCumulated) }}
              </p>
            </div>
            <UButton
              v-if="!showEmptyingForm"
              color="warning"
              size="lg"
              @click="showEmptyingForm = true"
            >
              <Icon name="i-heroicons-banknotes" class="w-5 h-5 mr-2" />
              Effectuer un Vidage
            </UButton>
          </div>
        </div>

        <!-- Formulaire de vidage -->
        <div
          v-if="showEmptyingForm"
          class="border border-gray-200 rounded-lg p-6 mb-4"
        >
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Formulaire de Vidage
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-semibold mb-2">Montant disponible :</h4>
                <p class="text-2xl font-bold text-blue-600">
                  {{ formatCurrency(cashSummary.totalCumulated) }}
                </p>
              </div>

              <UFormGroup label="Montant à vider" required>
                <UInput
                  v-model.number="emptyingForm.amount"
                  type="number"
                  :min="0"
                  :max="cashSummary.totalCumulated"
                  step="0.01"
                  placeholder="0.00"
                >
                  <template #trailing>
                    <UButton
                      size="xs"
                      color="primary"
                      variant="link"
                      @click="emptyingForm.amount = cashSummary.totalCumulated"
                    >
                      Max
                    </UButton>
                  </template>
                </UInput>
                <template #help>
                  <span class="text-sm text-gray-500">
                    Maximum disponible :
                    {{ formatCurrency(cashSummary.totalCumulated) }}
                  </span>
                </template>
              </UFormGroup>
            </div>

            <div class="space-y-4">
              <UFormGroup label="Destination" required>
                <USelect
                  v-model="emptyingForm.destination"
                  :items="destinationOptions"
                  placeholder="Choisir la destination"
                />
              </UFormGroup>

              <UFormGroup label="Raison du vidage" required>
                <USelect
                  v-model="emptyingForm.reason"
                  :items="reasonOptions"
                  placeholder="Choisir la raison"
                />
              </UFormGroup>

              <UFormGroup label="Notes (optionnel)">
                <UTextarea
                  v-model="emptyingForm.notes"
                  placeholder="Informations complémentaires sur le vidage..."
                  :rows="3"
                />
              </UFormGroup>
            </div>
          </div>

          <div
            class="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6"
          >
            <UButton color="neutral" variant="outline" @click="cancelEmptying">
              Annuler
            </UButton>
            <UButton
              color="primary"
              :loading="processing"
              :disabled="
                !emptyingForm.destination ||
                !emptyingForm.reason ||
                emptyingForm.amount <= 0 ||
                emptyingForm.amount > cashSummary.totalCumulated
              "
              @click="confirmEmptying"
            >
              <Icon name="i-heroicons-check" class="w-4 h-4 mr-2" />
              Confirmer le Vidage
            </UButton>
          </div>
        </div>

        <p class="text-sm text-gray-600">
          <Icon
            name="i-heroicons-information-circle"
            class="w-4 h-4 inline mr-1"
          />
          <span v-if="cashSummary.totalCumulated > 0">
            Le vidage transférera le montant vers la destination choisie et
            remettra le cumul à zéro.
          </span>
          <span v-else class="text-orange-600 font-medium">
            Aucun montant disponible pour le vidage. Effectuez d'abord des
            comptages de caisse.
          </span>
        </p>
      </div>

      <!-- Message si pas de données -->
      <div
        v-if="!cashSummary && !loading"
        class="bg-white rounded-lg shadow-lg p-12 text-center"
      >
        <Icon
          name="i-heroicons-document-text"
          class="w-16 h-16 mx-auto text-gray-400 mb-4"
        />
        <h3 class="text-lg font-semibold text-gray-900 mb-2">
          Aucune donnée de caisse
        </h3>
        <p class="text-gray-600 mb-4">
          Il n'y a pas encore de comptages validés dans le système.
        </p>
        <UButton color="primary" @click="navigateTo('/caisse')">
          Aller à la caisse
        </UButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useMagasinStore } from "../../composables/useMagasinStore";
// Types
interface CashCount {
  id: string;
  expected_amount: number;
  actual_amount: number;
  difference: number;
  bills_detail: Record<string, unknown>;
  coins_detail: Record<string, unknown>;
  notes?: string;
  counted_by: string;
  created_at: string;
  users?: {
    name: string | null;
    email: string;
  };
}

interface CashEmptying {
  id: string;
  amount: number;
  destination: string;
  reason: string;
  notes?: string;
  emptied_by: string;
  date: string;
  created_at: string;
  users?: {
    name: string | null;
    email: string;
  };
}

interface UserBasic {
  id: string;
  name: string | null;
  email: string | null;
}

interface CashSummary {
  totalCumulated: number;
  totalCountedAmount: number;
  totalEmptied: number;
  totalExpected: number;
  totalDifference: number;
  countingsCount: number;
  emptyingsCount: number;
  lastEmptyDate: string | null;
  generatedAt: Date;
}

interface TableRow {
  id: string;
  date: string;
  expected_amount?: number;
  actual_amount?: number;
  difference?: number;
  counted_by?: string;
  amount?: number;
  destination?: string;
  emptied_by?: string;
  notes?: string;
}

// Importation des composables et utilitaires
const magasinStore = useMagasinStore();
const { formatCurrency } = useCashManagement();
const { currentUser } = useCurrentUser();
const supabase = useSupabaseClient() as any;
const toast = useToast();

// États réactifs
const loading = ref(false);
const processing = ref(false);
const cashSummary = ref<CashSummary | null>(null);
const dailyClosings = ref<TableRow[]>([]);
const emptyingHistory = ref<TableRow[]>([]);
const showEmptyingForm = ref(false);

// États de pagination
const countingsPage = ref(1);
const emptyingsPage = ref(1);
const itemsPerPage = 5;

// Computed pour la pagination des comptages
const paginatedCountings = computed(() => {
  const start = (countingsPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return dailyClosings.value.slice(start, end);
});

const countingsTotalPages = computed(() => {
  return Math.ceil(dailyClosings.value.length / itemsPerPage);
});

// Computed pour la pagination des vidages
const paginatedEmptyings = computed(() => {
  const start = (emptyingsPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return emptyingHistory.value.slice(start, end);
});

const emptyingsTotalPages = computed(() => {
  return Math.ceil(emptyingHistory.value.length / itemsPerPage);
});

// Formulation du vidage
const emptyingForm = ref({
  destination: "",
  amount: 0,
  notes: "",
  reason: "Vidage manuel depuis interface",
});

// Options de destination
const destinationOptions = [
  { value: "banque_principale", label: "Banque Principale - Compte Courant" },
  { value: "banque_epargne", label: "Banque - Compte Épargne" },
  { value: "caisse_depot", label: "Caisse de Dépôt" },
  { value: "autre", label: "Autre destination" },
];

// Options de raison du vidage
const reasonOptions = [
  { value: "Vidage manuel depuis interface", label: "Vidage manuel" },
  { value: "Vidage automatique programmé", label: "Vidage automatique" },
  { value: "Vidage de fermeture journalière", label: "Fermeture journalière" },
  { value: "Vidage de sécurité", label: "Vidage de sécurité" },
  { value: "Transfert de fonds", label: "Transfert de fonds" },
  { value: "Autre", label: "Autre raison" },
];

// Helper pour valider l'id magasin
function isValidMagasinId(id: unknown): boolean {
  return typeof id === "string" && id.trim() !== "";
}

async function loadUsersByIds(
  userIds: string[],
): Promise<Map<string, UserBasic>> {
  const uniqueIds = Array.from(
    new Set(
      userIds.filter(
        (id): id is string => typeof id === "string" && id.trim() !== "",
      ),
    ),
  );

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, name, email")
    .in("id", uniqueIds);

  if (error) {
    console.warn("Impossible de charger les utilisateurs:", error);
    return new Map();
  }

  return new Map((data || []).map((user: UserBasic) => [user.id, user]));
}

// Chargement des données au montage : attend que magasinId soit prêt
onMounted(async () => {
  // Si magasinId n'est pas prêt, on attend qu'il soit défini
  if (!isValidMagasinId(magasinStore.magasinId)) {
    const stop = watch(
      () => magasinStore.magasinId,
      async (val) => {
        if (isValidMagasinId(val)) {
          await loadCashSummary();
          stop();
        }
      },
    );
  } else {
    await loadCashSummary();
  }
});

// Chargement du résumé de caisse
async function loadCashSummary() {
  loading.value = true;
  try {
    console.log("Début du chargement des données...");

    // Vérifier magasinId
    if (!isValidMagasinId(magasinStore.magasinId)) {
      throw new Error(
        "Aucun magasin sélectionné ou identifiant magasin invalide.",
      );
    }

    // Récupérer tous les comptages de caisse
    const { data: cashCounts, error: countsError } = await supabase
      .from("cash_counts")
      .select("*")
      .eq("magasin_id", magasinStore.magasinId)
      .order("created_at", { ascending: false });

    if (countsError) {
      throw countsError;
    }

    console.log("Comptages récupérés:", cashCounts?.length || 0);

    // Récupérer tous les vidages de caisse
    const { data: allEmptyings, error: emptyingError } = await supabase
      .from("cash_emptying")
      .select("*")
      .eq("magasin_id", magasinStore.magasinId)
      .order("created_at", { ascending: false });

    if (emptyingError) {
      console.warn(
        "Erreur lors de la récupération des vidages:",
        emptyingError,
      );
    }

    console.log("Vidages récupérés:", allEmptyings?.length || 0);

    const userIds = [
      ...(cashCounts || []).map((count: CashCount) => count.counted_by),
      ...(allEmptyings || []).map(
        (emptying: CashEmptying) => emptying.emptied_by,
      ),
    ];
    const userMap = await loadUsersByIds(userIds);

    // Calculer les totaux des comptages
    let totalCountedAmount = 0;
    let totalExpected = 0;
    let totalDifference = 0;
    let countingsCount = 0;

    if (cashCounts && cashCounts.length > 0) {
      totalCountedAmount = cashCounts.reduce(
        (sum: number, count: CashCount) => {
          const amount = Number(count.actual_amount) || 0;
          return sum + amount;
        },
        0,
      );

      totalExpected = cashCounts.reduce((sum: number, count: CashCount) => {
        const amount = Number(count.expected_amount) || 0;
        return sum + amount;
      }, 0);

      totalDifference = cashCounts.reduce((sum: number, count: CashCount) => {
        const amount = Number(count.difference) || 0;
        return sum + amount;
      }, 0);

      countingsCount = cashCounts.length;

      // Préparer les données pour l'affichage dans le tableau
      dailyClosings.value = cashCounts.map(
        (count: CashCount): TableRow => ({
          id: count.id,
          date: count.created_at,
          expected_amount: Number(count.expected_amount) || 0,
          actual_amount: Number(count.actual_amount) || 0,
          difference: Number(count.difference) || 0,
          counted_by:
            userMap.get(count.counted_by)?.name ||
            userMap.get(count.counted_by)?.email ||
            "N/A",
          notes: count.notes,
        }),
      );
    } else {
      dailyClosings.value = [];
    }

    // Calculer le total des vidages effectués
    let totalEmptied = 0;
    if (allEmptyings && allEmptyings.length > 0) {
      totalEmptied = allEmptyings.reduce(
        (sum: number, emptying: CashEmptying) => {
          const amount = Number(emptying.amount) || 0;
          return sum + amount;
        },
        0,
      );
    }

    // Calculer le montant réellement disponible : Total compté - Total vidé
    const totalCumulated = Math.max(0, totalCountedAmount - totalEmptied);

    // Trouver la date du dernier vidage pour l'affichage
    const lastEmptyDate =
      allEmptyings && allEmptyings.length > 0 ? allEmptyings[0].date : null;

    console.log("Calculs finaux:", {
      totalCountedAmount,
      totalEmptied,
      totalCumulated,
      totalExpected,
      totalDifference,
    });

    // Récupérer l'historique des vidages pour l'affichage
    emptyingHistory.value = (allEmptyings || []).map(
      (emptying: CashEmptying): TableRow => ({
        id: emptying.id,
        date: emptying.date,
        amount: Number(emptying.amount) || 0,
        destination: emptying.destination || "",
        emptied_by:
          userMap.get(emptying.emptied_by)?.name ||
          userMap.get(emptying.emptied_by)?.email ||
          "N/A",
        notes: emptying.notes || "",
      }),
    );

    console.log("Historique des vidages:", emptyingHistory.value.length);

    // Construire le résumé
    cashSummary.value = {
      totalCumulated,
      totalCountedAmount,
      totalEmptied,
      totalExpected,
      totalDifference,
      countingsCount,
      emptyingsCount: allEmptyings?.length || 0,
      lastEmptyDate: lastEmptyDate ? formatDate(new Date(lastEmptyDate)) : null,
      generatedAt: new Date(),
    };

    console.log("Résumé final:", cashSummary.value);

    // Initialiser le montant de vidage avec le total disponible
    emptyingForm.value.amount = totalCumulated;

    // Afficher un toast de succès
    if (cashSummary.value) {
      toast.add({
        title: "Données chargées",
        color: "success",
      });
    }
  } catch (error) {
    console.error("Erreur lors du chargement:", error);
    toast.add({
      title: "Erreur de chargement",
      description:
        error instanceof Error
          ? error.message
          : "Impossible de charger les données de caisse",
      color: "error",
    });
    // Initialiser avec des valeurs par défaut en cas d'erreur
    cashSummary.value = null;
    dailyClosings.value = [];
    emptyingHistory.value = [];
  } finally {
    loading.value = false;
  }
}

// Export du rapport
async function exportReport() {
  try {
    toast.add({
      title: "Export en cours...",
      description: "Le rapport PDF sera téléchargé sous peu",
      color: "info",
    });
    // Ici vous pouvez implémenter l'export PDF
  } catch (error) {
    console.error("Erreur lors de l'export:", error);
    toast.add({
      title: "Erreur d'export",
      description: "Impossible d'exporter le rapport",
      color: "error",
    });
  }
}

// Annuler le vidage
function cancelEmptying() {
  showEmptyingForm.value = false;
  emptyingForm.value = {
    destination: "",
    amount: 0,
    notes: "",
    reason: "Vidage manuel depuis interface",
  };
}

// Confirmation du vidage
async function confirmEmptying() {
  if (
    !emptyingForm.value.destination ||
    !emptyingForm.value.reason ||
    !cashSummary.value ||
    emptyingForm.value.amount <= 0
  )
    return;

  processing.value = true;

  try {
    const currentTimestamp = new Date().toISOString();
    // Vérifier s'il existe déjà un vidage pour cette date et magasin
    const todayString = currentTimestamp.split("T")[0];
    const { data: existingEmptying, error: checkError } = await supabase
      .from("cash_emptying")
      .select("id")
      .eq("date", todayString)
      .eq("magasin_id", magasinStore.magasinId)
      .limit(1);

    if (checkError) throw checkError;
    if (existingEmptying && existingEmptying.length > 0) {
      toast.add({
        title: "Vidage déjà effectué",
        description:
          "Un vidage a déjà été enregistré pour ce magasin aujourd'hui.",
        color: "warning",
      });
      processing.value = false;
      return;
    }

    // Enregistrer le vidage AVEC magasin_id
    const { error: emptyingError } = await supabase
      .from("cash_emptying")
      .insert({
        amount: emptyingForm.value.amount,
        destination: emptyingForm.value.destination,
        notes: emptyingForm.value.notes || "",
        reason: emptyingForm.value.reason || "Vidage manuel depuis interface",
        emptied_by: currentUser.value?.id || null,
        date: todayString,
        created_at: currentTimestamp,
        magasin_id: magasinStore.magasinId,
      });

    if (emptyingError) throw emptyingError;

    toast.add({
      title: "Vidage réalisé avec succès",
      description: `${formatCurrency(
        emptyingForm.value.amount,
      )} transféré vers ${getDestinationLabel(emptyingForm.value.destination)}`,
      color: "success",
    });

    // Masquer le formulaire et réinitialiser
    showEmptyingForm.value = false;
    emptyingForm.value = {
      destination: "",
      amount: 0,
      notes: "",
      reason: "Vidage manuel depuis interface",
    };

    // Recharger les données pour refléter la mise à jour
    await loadCashSummary();
  } catch (error) {
    console.error("Erreur lors du vidage:", error);
    toast.add({
      title: "Erreur",
      description: "Impossible de finaliser le vidage",
      color: "error",
    });
  } finally {
    processing.value = false;
  }
}

// Utilitaires d'affichage
function getDifferenceColor(difference: number) {
  if (difference > 0) return "text-green-600 font-semibold";
  if (difference < 0) return "text-red-600 font-semibold";
  return "text-gray-600";
}

function getDestinationLabel(destination: string) {
  const option = destinationOptions.find((opt) => opt.value === destination);
  return option?.label || destination;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

// Configuration de la page
definePageMeta({
  middleware: ["auth", "roles"],
});
</script>

<style scoped>
/* Styles personnalisés si nécessaire */
</style>
