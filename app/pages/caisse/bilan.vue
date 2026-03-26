<script setup>
// Meta configuration - Accès admin uniquement
definePageMeta({
  middleware: ["auth", "roles"],
});

// SEO
useSeoMeta({
  title: "Bilan de Caisse - Administration",
  description:
    "Historique complet des opérations de caisse pour les administrateurs",
});

// Imports
const supabase = useSupabaseClient();
const toast = useToast();
const { userRoles, loadCurrentUser } = useCurrentUser();
const { formatCurrency } = useCashManagement();
const { isAdmin } = useRoles();
const magasinStore = useMagasinStore();

// États réactifs
const loading = ref(false);
const error = ref(null);
const accessLoading = ref(true);
const hasAccess = ref(false);

// Vérifier l'accès de manière asynchrone
const checkAccess = async () => {
  try {
    accessLoading.value = true;

    // Attendre que les rôles soient chargés
    await loadCurrentUser();

    // Vérifier si l'utilisateur est admin
    if (isAdmin(userRoles.value)) {
      hasAccess.value = true;
    } else {
      hasAccess.value = false;
      throw createError({
        statusCode: 403,
        statusMessage: "Accès réservé aux administrateurs",
      });
    }
  } catch (err) {
    console.error("Erreur lors de la vérification d'accès:", err);
    hasAccess.value = false;
    if (err.statusCode !== 403) {
      throw createError({
        statusCode: 403,
        statusMessage: "Impossible de vérifier les permissions",
      });
    } else {
      throw err;
    }
  } finally {
    accessLoading.value = false;
  }
};
const selectedPeriod = ref({ label: "7 derniers jours", value: "7days" });
const customDateRange = reactive({
  startDate: "",
  endDate: "",
});
const selectedUser = ref({ label: "Tous les utilisateurs", value: "all" });
const selectedOperationType = ref({
  label: "Toutes les opérations",
  value: "all",
});

// Nouveaux filtres avancés
const selectedTimeRange = ref({ label: "Toute la journée", value: "all" });
const selectedWeekday = ref({ label: "Tous les jours", value: "all" });
const amountFilter = reactive({
  min: "",
  max: "",
});
const selectedAccuracy = ref({ label: "Tous les comptages", value: "all" });
const searchQuery = ref("");
const sortBy = ref("date");
const sortOrder = ref("desc");

// Variables de pagination
const currentPage = ref(1);
const itemsPerPage = ref(10);

// Données
const cashHistory = ref([]);
const users = ref([]);
const statistics = ref({
  totalOperations: 0,
  totalCounts: 0,
  totalTransactions: 0,
  totalCashIn: 0,
  totalCashOut: 0,
  operationsByUser: {},
  operationsByType: {},
  // Nouvelles statistiques enrichies
  averageOperationsPerDay: 0,
  peakOperationDay: null,
  averageTransactionAmount: 0,
  largestTransaction: null,
  smallestTransaction: null,
  operationsByHour: {},
  operationsByWeekday: {},
  monthlyTrends: {},
  discrepanciesCount: 0,
  totalDiscrepancies: 0,
  averageDiscrepancy: 0,
  accuracyRate: 0,
  mostActiveUser: null,
  timeRangeStats: {
    morning: { count: 0, amount: 0 },
    afternoon: { count: 0, amount: 0 },
    evening: { count: 0, amount: 0 },
  },
});

const usersById = ref({});

// Options de période
const periodOptions = [
  { label: "Aujourd'hui", value: "today" },
  { label: "7 derniers jours", value: "7days" },
  { label: "30 derniers jours", value: "30days" },
  { label: "Ce mois", value: "month" },
  { label: "Période personnalisée", value: "custom" },
];

// Options de type d'opération
const operationTypeOptions = [
  { label: "Toutes les opérations", value: "all" },
  { label: "Comptages uniquement", value: "count" },
  { label: "Transactions uniquement", value: "transaction" },
  { label: "Entrées d'argent", value: "cash_in" },
  { label: "Sorties d'argent", value: "cash_out" },
];

// Options de période de la journée
const timeRangeOptions = [
  { label: "Toute la journée", value: "all" },
  { label: "Matin (6h-12h)", value: "morning" },
  { label: "Après-midi (12h-18h)", value: "afternoon" },
  { label: "Soir (18h-6h)", value: "evening" },
];

// Options de jour de la semaine
const weekdayOptions = [
  { label: "Tous les jours", value: "all" },
  { label: "Lundi", value: "Lundi" },
  { label: "Mardi", value: "Mardi" },
  { label: "Mercredi", value: "Mercredi" },
  { label: "Jeudi", value: "Jeudi" },
  { label: "Vendredi", value: "Vendredi" },
  { label: "Samedi", value: "Samedi" },
  { label: "Dimanche", value: "Dimanche" },
];

// Options de précision (pour les comptages)
const accuracyOptions = [
  { label: "Tous les comptages", value: "all" },
  { label: "Comptages exacts", value: "exact" },
  { label: "Avec écarts", value: "with_discrepancy" },
];

// Options de tri
const sortOptions = [
  { label: "Date (récent → ancien)", value: "date_desc" },
  { label: "Date (ancien → récent)", value: "date_asc" },
  { label: "Montant (élevé → faible)", value: "amount_desc" },
  { label: "Montant (faible → élevé)", value: "amount_asc" },
  { label: "Utilisateur (A → Z)", value: "user_asc" },
  { label: "Type d'opération", value: "type" },
];

// Computed property pour les options utilisateurs
const userOptions = computed(() => [
  { label: "Tous les utilisateurs", value: "all" },
  ...users.value.map((user) => ({
    label: user.name || user.email,
    value: user.id,
  })),
]);

// Computed properties pour la pagination
const totalPages = computed(() =>
  Math.ceil(filteredAndSortedHistory.value.length / itemsPerPage.value),
);

// Computed properties pour le filtrage et tri avancé
const filteredAndSortedHistory = computed(() => {
  let filtered = [...cashHistory.value];

  // Filtre par recherche textuelle
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (operation) =>
        operation.user?.name?.toLowerCase().includes(query) ||
        operation.user?.email?.toLowerCase().includes(query) ||
        operation.note?.toLowerCase().includes(query) ||
        operation.reason?.toLowerCase().includes(query) ||
        operation.details?.source?.toLowerCase().includes(query) ||
        operation.details?.recipient?.toLowerCase().includes(query),
    );
  }

  // Filtre par période de la journée
  const timeRangeValue =
    selectedTimeRange.value?.value || selectedTimeRange.value;
  if (timeRangeValue !== "all") {
    filtered = filtered.filter((operation) => {
      const hour = new Date(operation.date).getHours();
      switch (timeRangeValue) {
        case "morning":
          return hour >= 6 && hour < 12;
        case "afternoon":
          return hour >= 12 && hour < 18;
        case "evening":
          return hour < 6 || hour >= 18;
        default:
          return true;
      }
    });
  }

  // Filtre par jour de la semaine
  const weekdayValue = selectedWeekday.value?.value || selectedWeekday.value;
  if (weekdayValue !== "all") {
    filtered = filtered.filter((operation) => {
      const weekday = new Date(operation.date).getDay();
      const weekdayNames = [
        "Dimanche",
        "Lundi",
        "Mardi",
        "Mercredi",
        "Jeudi",
        "Vendredi",
        "Samedi",
      ];
      return weekdayNames[weekday] === weekdayValue;
    });
  }

  // Filtre par montant
  if (amountFilter.min || amountFilter.max) {
    filtered = filtered.filter((operation) => {
      const amount = operation.amount;
      const min = amountFilter.min ? parseFloat(amountFilter.min) : 0;
      const max = amountFilter.max ? parseFloat(amountFilter.max) : Infinity;
      return amount >= min && amount <= max;
    });
  }

  // Filtre par précision (comptages seulement)
  const accuracyValue = selectedAccuracy.value?.value || selectedAccuracy.value;
  if (accuracyValue !== "all") {
    filtered = filtered.filter((operation) => {
      if (operation.type !== "count") return true;

      switch (accuracyValue) {
        case "exact":
          return !operation.difference || Math.abs(operation.difference) === 0;
        case "with_discrepancy":
          return operation.difference && Math.abs(operation.difference) > 0;
        default:
          return true;
      }
    });
  }

  // Tri des résultats
  const [sortField, sortDirection] = (
    sortBy.value +
    "_" +
    sortOrder.value
  ).split("_");

  filtered.sort((a, b) => {
    let compareValue = 0;

    switch (sortField) {
      case "date":
        compareValue = new Date(a.date) - new Date(b.date);
        break;
      case "amount":
        compareValue = a.amount - b.amount;
        break;
      case "user": {
        const idA = a.userId || "";
        const idB = b.userId || "";
        compareValue = idA.localeCompare(idB);
        break;
      }
      case "type":
        compareValue = a.type.localeCompare(b.type);
        break;
    }

    return sortDirection === "desc" ? -compareValue : compareValue;
  });

  return filtered;
});

// Computed property pour la pagination mise à jour
const paginatedHistory = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredAndSortedHistory.value.slice(start, end);
});

// Statistiques des résultats filtrés
const filteredStats = computed(() => {
  const filtered = filteredAndSortedHistory.value;
  return {
    total: filtered.length,
    counts: filtered.filter((op) => op.type === "count").length,
    transactions: filtered.filter((op) => op.type !== "count").length,
    cashIn: filtered
      .filter((op) => op.type === "cash_in")
      .reduce((sum, op) => sum + op.amount, 0),
    cashOut: filtered
      .filter((op) => op.type === "cash_out")
      .reduce((sum, op) => sum + op.amount, 0),
    discrepancies: filtered.filter(
      (op) =>
        op.type === "count" && op.difference && Math.abs(op.difference) > 0,
    ).length,
  };
});

// Computed properties pour l'analyse avancée
const topPerformers = computed(() => {
  return Object.entries(statistics.value.operationsByUser)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([userId, stats]) => ({ userId, ...stats }));
});

// Calculer la période de dates
const getDateRange = () => {
  const today = new Date();
  let startDate, endDate;

  const periodValue = selectedPeriod.value?.value || selectedPeriod.value;

  switch (periodValue) {
    case "today":
      startDate = endDate = today.toISOString().split("T")[0];
      break;
    case "7days":
      startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      endDate = today.toISOString().split("T")[0];
      break;
    case "30days":
      startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      endDate = today.toISOString().split("T")[0];
      break;
    case "month":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      endDate = today.toISOString().split("T")[0];
      break;
    case "custom":
      startDate = customDateRange.startDate;
      endDate = customDateRange.endDate;
      break;
    default:
      startDate = endDate = today.toISOString().split("T")[0];
  }

  return { startDate, endDate };
};

// Charger la liste des utilisateurs
const loadUsers = async () => {
  try {
    const { data, error: usersError } = await supabase
      .from("users")
      .select("id, name, email")
      .order("name", { ascending: true });

    if (usersError) throw usersError;
    users.value = data || [];
  } catch (err) {
    console.error("Erreur lors du chargement des utilisateurs:", err);
  }
};

const loadUsersByIds = async (ids) => {
  const uniqueIds = Array.from(
    new Set(ids.filter((id) => typeof id === "string" && id.trim() !== "")),
  );

  if (!uniqueIds.length) {
    usersById.value = {};
    return;
  }

  const { data, error: usersError } = await supabase
    .from("users")
    .select("id, name, email")
    .in("id", uniqueIds);

  if (usersError) {
    console.warn("Impossible de charger les utilisateurs pour le mapping:", usersError);
    usersById.value = {};
    return;
  }

  usersById.value = (data || []).reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
  }, {});
};

// Charger l'historique des opérations de caisse
const loadCashHistory = async () => {
  try {
    loading.value = true;
    error.value = null;

    const { startDate, endDate } = getDateRange();

    if (!startDate || !endDate) {
      toast.add({
        title: "Erreur",
        description: "Veuillez sélectionner une période valide",
        color: "red",
      });
      return;
    }

    const operations = [];
    const stats = {
      totalOperations: 0,
      totalCounts: 0,
      totalTransactions: 0,
      totalCashIn: 0,
      totalCashOut: 0,
      operationsByUser: {},
      operationsByType: {},
      averageOperationsPerDay: 0,
      peakOperationDay: null,
      averageTransactionAmount: 0,
      largestTransaction: null,
      smallestTransaction: null,
      operationsByHour: {},
      operationsByWeekday: {},
      monthlyTrends: {},
      discrepanciesCount: 0,
      totalDiscrepancies: 0,
      averageDiscrepancy: 0,
      accuracyRate: 0,
      mostActiveUser: null,
      timeRangeStats: {
        morning: { count: 0, amount: 0 },
        afternoon: { count: 0, amount: 0 },
        evening: { count: 0, amount: 0 },
      },
    };

    // Vérifier la présence du magasin_id
    const magasinId = magasinStore.magasinId;
    if (
      !magasinId ||
      typeof magasinId !== "string" ||
      magasinId.trim() === ""
    ) {
      error.value =
        "Aucun magasin sélectionné. Impossible de charger les opérations.";
      toast.add({
        title: "Erreur",
        description: "Veuillez sélectionner un magasin valide.",
        color: "red",
      });
      loading.value = false;
      return;
    }

    // Charger les comptages de caisse
    const selectedOpType =
      selectedOperationType.value?.value || selectedOperationType.value;
    const selectedUserId = selectedUser.value?.value || selectedUser.value;
    let countsData = [];
    let transactionsData = [];

    if (selectedOpType === "all" || selectedOpType === "count") {
      // Filtrer les cash_counts par magasin et récupérer l'utilisateur
      const { data: countsResult, error: countsError } = await supabase
        .from("cash_counts")
        .select("*")
        .eq("magasin_id", magasinId);

      if (countsError) throw countsError;

      countsData = countsResult || [];
    }

    if (
      selectedOpType === "all" ||
      selectedOpType === "transaction" ||
      selectedOpType === "cash_in" ||
      selectedOpType === "cash_out"
    ) {
      // Filtrer les cash_transactions par magasin et récupérer l'utilisateur
      const { data: transactionsResult, error: transactionsError } =
        await supabase
          .from("cash_transactions")
          .select("*")
          .eq("magasin_id", magasinId);

      if (transactionsError) throw transactionsError;

      transactionsData = transactionsResult || [];
    }

    await loadUsersByIds([
      ...countsData.map((count) => count.counted_by),
      ...transactionsData.map((transaction) => transaction.created_by),
    ]);

    countsData.forEach((count) => {
      if (
        (selectedUserId === "all" || selectedUserId === count.counted_by) &&
        count.magasin_id === magasinId
      ) {
        operations.push({
          id: count.id,
          type: "count",
          date: count.created_at,
          amount: count.actual_amount,
          expectedAmount: count.expected_amount,
          difference: count.difference,
          note: count.note,
          magasin_id: count.magasin_id,
          user: usersById.value[count.counted_by] || {
            id: count.counted_by,
            name: "",
            email: "",
          },
          userId: count.counted_by,
          details: {
            bills: count.bills_detail,
            coins: count.coins_detail,
            countType: count.count_type,
            countDate: count.date,
          },
        });
        stats.totalCounts++;
      }
    });

    transactionsData.forEach((transaction) => {
      const isMatchingType =
        selectedOpType === "all" ||
        selectedOpType === "transaction" ||
        (selectedOpType === "cash_in" && transaction.type === "in") ||
        (selectedOpType === "cash_out" && transaction.type === "out");

      if (
        isMatchingType &&
        (selectedUserId === "all" || selectedUserId === transaction.created_by) &&
        transaction.magasin_id === magasinId
      ) {
        operations.push({
          id: transaction.id,
          type: transaction.type === "in" ? "cash_in" : "cash_out",
          date: transaction.created_at,
          amount: Math.abs(transaction.amount),
          note: transaction.note,
          reason: transaction.reason,
          magasin_id: transaction.magasin_id,
          user: usersById.value[transaction.created_by] || {
            id: transaction.created_by,
            name: "",
            email: "",
          },
          userId: transaction.created_by,
          details: {
            source: transaction.source,
            recipient: transaction.recipient,
            transactionType: transaction.type,
          },
        });

        stats.totalTransactions++;
        if (transaction.type === "in") {
          stats.totalCashIn += Math.abs(transaction.amount);
        } else {
          stats.totalCashOut += Math.abs(transaction.amount);
        }
      }
    });

    // Trier toutes les opérations par date (plus récent en premier)
    operations.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculer les statistiques par utilisateur et par type
    operations.forEach((operation) => {
      const userName = operation.user?.name || "Utilisateur inconnu";
      const userId = operation.userId || "unknown";
      const operationDate = new Date(operation.date);
      const hour = operationDate.getHours();
      const weekday = operationDate.getDay();

      // Statistiques par utilisateur
      if (!stats.operationsByUser[userId]) {
        stats.operationsByUser[userId] = {
          name: userName,
          email: operation.user?.email,
          counts: 0,
          transactions: 0,
          cashIn: 0,
          cashOut: 0,
          total: 0,
          lastOperation: operation.date,
          averageAmount: 0,
          discrepancies: 0,
        };
      }

      const userStats = stats.operationsByUser[userId];
      userStats.total++;
      userStats.lastOperation = operation.date;

      if (operation.type === "count") {
        userStats.counts++;
        if (operation.difference && Math.abs(operation.difference) > 0) {
          userStats.discrepancies++;
          stats.discrepanciesCount++;
          stats.totalDiscrepancies += Math.abs(operation.difference);
        }
      } else if (operation.type === "cash_in") {
        userStats.transactions++;
        userStats.cashIn += operation.amount;
      } else if (operation.type === "cash_out") {
        userStats.transactions++;
        userStats.cashOut += operation.amount;
      }

      // Statistiques par type
      if (!stats.operationsByType[operation.type]) {
        stats.operationsByType[operation.type] = 0;
      }
      stats.operationsByType[operation.type]++;

      // Statistiques par heure
      if (!stats.operationsByHour[hour]) {
        stats.operationsByHour[hour] = 0;
      }
      stats.operationsByHour[hour]++;

      // Statistiques par jour de la semaine
      const weekdayNames = [
        "Dimanche",
        "Lundi",
        "Mardi",
        "Mercredi",
        "Jeudi",
        "Vendredi",
        "Samedi",
      ];
      const weekdayName = weekdayNames[weekday];
      if (!stats.operationsByWeekday[weekdayName]) {
        stats.operationsByWeekday[weekdayName] = 0;
      }
      stats.operationsByWeekday[weekdayName]++;

      // Statistiques par période de la journée
      if (hour >= 6 && hour < 12) {
        stats.timeRangeStats.morning.count++;
        if (operation.type !== "count")
          stats.timeRangeStats.morning.amount += operation.amount;
      } else if (hour >= 12 && hour < 18) {
        stats.timeRangeStats.afternoon.count++;
        if (operation.type !== "count")
          stats.timeRangeStats.afternoon.amount += operation.amount;
      } else {
        stats.timeRangeStats.evening.count++;
        if (operation.type !== "count")
          stats.timeRangeStats.evening.amount += operation.amount;
      }
    });

    // Calculer les moyennes et statistiques avancées
    const dateRange = getDateRange();
    const daysDiff =
      Math.ceil(
        (new Date(dateRange.endDate) - new Date(dateRange.startDate)) /
          (1000 * 60 * 60 * 24),
      ) + 1;
    stats.averageOperationsPerDay = operations.length / daysDiff;

    // Transaction la plus importante et la plus petite
    const transactions = operations.filter((op) => op.type !== "count");
    if (transactions.length > 0) {
      transactions.sort((a, b) => b.amount - a.amount);
      stats.largestTransaction = transactions[0];
      stats.smallestTransaction = transactions[transactions.length - 1];
      stats.averageTransactionAmount =
        transactions.reduce((sum, t) => sum + t.amount, 0) /
        transactions.length;
    }

    // Jour avec le plus d'opérations
    const operationsByDate = {};
    operations.forEach((operation) => {
      const date = new Date(operation.date).toDateString();
      operationsByDate[date] = (operationsByDate[date] || 0) + 1;
    });

    const peakDay = Object.entries(operationsByDate).sort(
      (a, b) => b[1] - a[1],
    )[0];
    if (peakDay) {
      stats.peakOperationDay = {
        date: peakDay[0],
        count: peakDay[1],
      };
    }

    // Utilisateur le plus actif
    const mostActive = Object.entries(stats.operationsByUser).sort(
      (a, b) => b[1].total - a[1].total,
    )[0];
    if (mostActive) {
      stats.mostActiveUser = {
        userId: mostActive[0],
        ...mostActive[1],
      };
    }

    // Calcul du taux de précision
    const totalCounts = stats.totalCounts;
    if (totalCounts > 0) {
      stats.averageDiscrepancy =
        stats.totalDiscrepancies / stats.discrepanciesCount || 0;
      stats.accuracyRate =
        ((totalCounts - stats.discrepanciesCount) / totalCounts) * 100;
    }

    // Calcul des moyennes par utilisateur
    Object.values(stats.operationsByUser).forEach((userStats) => {
      const totalAmount = userStats.cashIn + userStats.cashOut;
      const totalTransactions = userStats.transactions;
      userStats.averageAmount =
        totalTransactions > 0 ? totalAmount / totalTransactions : 0;
    });

    stats.totalOperations = operations.length;

    cashHistory.value = operations;
    statistics.value = stats;
  } catch (err) {
    console.error("Erreur lors du chargement de l'historique:", err);
    error.value = err.message;
    toast.add({
      title: "Erreur",
      description: "Impossible de charger l'historique des opérations",
      color: "red",
    });
  } finally {
    loading.value = false;
  }
};

// Obtenir l'icône selon le type d'opération
const getOperationIcon = (type) => {
  switch (type) {
    case "count":
      return "i-heroicons-calculator";
    case "cash_in":
      return "i-heroicons-arrow-up-circle";
    case "cash_out":
      return "i-heroicons-arrow-down-circle";
    default:
      return "i-heroicons-question-mark-circle";
  }
};

// Obtenir la couleur selon le type d'opération
const getOperationColor = (type) => {
  switch (type) {
    case "count":
      return "purple";
    case "cash_in":
      return "green";
    case "cash_out":
      return "red";
    default:
      return "gray";
  }
};

// Obtenir le libellé du type d'opération
const getOperationLabel = (type) => {
  switch (type) {
    case "count":
      return "Comptage";
    case "cash_in":
      return "Entrée d'argent";
    case "cash_out":
      return "Sortie d'argent";
    default:
      return "Opération";
  }
};

// Formater la date et l'heure
const formatDateTime = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
};

// Obtenir le nombre de jours dans la période sélectionnée
const getPeriodDays = () => {
  const { startDate, endDate } = getDateRange();
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
};

// Obtenir les statistiques de performance
const getPerformanceMetrics = () => {
  const totalDays = getPeriodDays();
  const avgPerDay = statistics.value.totalOperations / totalDays;

  return {
    operationsPerDay: avgPerDay.toFixed(1),
    transactionsPerDay: (
      statistics.value.totalTransactions / totalDays
    ).toFixed(1),
    countsPerDay: (statistics.value.totalCounts / totalDays).toFixed(1),
  };
};

// Réinitialiser tous les filtres
const resetAllFilters = () => {
  selectedPeriod.value = { label: "7 derniers jours", value: "7days" };
  customDateRange.startDate = "";
  customDateRange.endDate = "";
  selectedUser.value = { label: "Tous les utilisateurs", value: "all" };
  selectedOperationType.value = {
    label: "Toutes les opérations",
    value: "all",
  };
  selectedTimeRange.value = { label: "Toute la journée", value: "all" };
  selectedWeekday.value = { label: "Tous les jours", value: "all" };
  amountFilter.min = "";
  amountFilter.max = "";
  selectedAccuracy.value = { label: "Tous les comptages", value: "all" };
  searchQuery.value = "";
  sortBy.value = "date";
  sortOrder.value = "desc";
  currentPage.value = 1;
  loadCashHistory();
};

// Fonction pour appliquer le tri
const applySorting = (sortValue) => {
  const [field, order] = sortValue.split("_");
  sortBy.value = field;
  sortOrder.value = order || "desc";
  currentPage.value = 1; // Reset pagination
};

// Exporter l'historique
const exportHistory = () => {
  const { startDate, endDate } = getDateRange();

  const report = {
    title: "Bilan de Caisse - Historique des Opérations",
    period: selectedPeriod.value,
    startDate,
    endDate,
    filters: {
      user: selectedUser.value?.label || "Tous",
      operationType: selectedOperationType.value?.label || "Toutes",
    },
    statistics: statistics.value,
    operations: cashHistory.value,
    exportDate: new Date().toISOString(),
    exportedBy: userRoles.value,
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bilan-caisse-${selectedPeriod.value}-${
    new Date().toISOString().split("T")[0]
  }.json`;
  link.click();
  URL.revokeObjectURL(url);

  toast.add({
    title: "Export réussi",
    description: "L'historique a été exporté avec succès",
    color: "green",
  });
};

// Watchers pour recharger les données
watch([selectedPeriod, selectedUser, selectedOperationType], () => {
  currentPage.value = 1; // Reset pagination
  loadCashHistory();
});

// Watchers pour les filtres locaux (ne nécessitent pas de rechargement)
watch(
  [
    selectedTimeRange,
    selectedWeekday,
    selectedAccuracy,
    searchQuery,
    sortBy,
    sortOrder,
  ],
  () => {
    currentPage.value = 1; // Reset pagination when filters change
  },
);

watch(
  [amountFilter],
  () => {
    currentPage.value = 1; // Reset pagination when amount filter changes
  },
  { deep: true },
);

watch([itemsPerPage], () => {
  currentPage.value = 1; // Reset pagination when changing items per page
});

watch(
  [customDateRange],
  () => {
    const periodValue = selectedPeriod.value?.value || selectedPeriod.value;
    if (
      periodValue === "custom" &&
      customDateRange.startDate &&
      customDateRange.endDate
    ) {
      currentPage.value = 1; // Reset pagination
      loadCashHistory();
    }
  },
  { deep: true },
);

// Initialisation
onMounted(async () => {
  await checkAccess();
  if (hasAccess.value) {
    await loadUsers();
    await loadCashHistory();
  }
});
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Loading de vérification d'accès -->
    <div v-if="accessLoading" class="flex justify-center items-center py-12">
      <div class="text-center">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"
        />
        <p class="text-gray-600">Vérification des permissions...</p>
      </div>
    </div>

    <!-- Accès refusé -->
    <div v-else-if="!hasAccess" class="text-center py-12">
      <UIcon
        name="i-heroicons-shield-exclamation"
        class="w-16 h-16 text-red-500 mx-auto mb-4"
      />
      <h2 class="text-xl font-bold text-red-600 mb-2">Accès refusé</h2>
      <p class="text-gray-600 mb-4">
        Cette page est réservée aux administrateurs.
      </p>
      <UButton label="Retour à l'accueil" to="/" color="blue" />
    </div>

    <!-- Contenu principal (visible uniquement si accès autorisé) -->
    <div v-else>
      <!-- Header -->
      <div
        class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4"
      >
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Bilan de Caisse</h1>
          <p class="text-gray-600 mt-1">
            Historique complet des opérations de caisse
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <UButton
            icon="i-heroicons-arrow-path"
            color="gray"
            variant="outline"
            :loading="loading"
            @click="loadCashHistory"
          >
            Actualiser
          </UButton>

          <UButton
            icon="i-heroicons-document-arrow-down"
            color="blue"
            variant="outline"
            :disabled="cashHistory.length === 0"
            @click="exportHistory"
          >
            Exporter
          </UButton>
        </div>
      </div>

      <!-- Filtres redesignés -->
      <div class="bg-white rounded-xl shadow-lg border border-gray-100 mb-8">
        <!-- En-tête des filtres -->
        <div
          class="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-xl"
        >
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          >
            <div class="flex items-center gap-3">
              <div class="p-2 bg-blue-100 rounded-lg">
                <UIcon
                  name="i-heroicons-funnel"
                  class="w-5 h-5 text-blue-600"
                />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-800">
                  Filtres de recherche
                </h3>
                <p class="text-sm text-gray-500">
                  Affinez votre recherche avec les critères ci-dessous
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <!-- Badge de résultats filtrés -->
              <UBadge
                v-if="filteredStats.total !== statistics.totalOperations"
                color="blue"
                variant="subtle"
                class="px-3 py-1"
              >
                <UIcon name="i-heroicons-funnel" class="w-4 h-4 mr-1" />
                {{ filteredStats.total }} /
                {{ statistics.totalOperations }} résultats
              </UBadge>

              <!-- Bouton de réinitialisation -->
              <UButton
                icon="i-heroicons-x-mark"
                color="gray"
                variant="ghost"
                size="sm"
                class="hover:bg-gray-100"
                @click="resetAllFilters"
              >
                Réinitialiser
              </UButton>
            </div>
          </div>
        </div>

        <div class="p-6">
          <!-- Section 1: Filtres principaux -->
          <div class="mb-8">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-1 h-6 bg-blue-500 rounded-full" />
              <h4 class="font-semibold text-gray-800 text-base">
                Critères principaux
              </h4>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <!-- Période -->
              <div class="space-y-2">
                <UFormGroup label="📅 Période d'analyse">
                  <UInputMenu
                    v-model="selectedPeriod"
                    :items="periodOptions"
                    placeholder="Choisir une période"
                    icon="i-heroicons-calendar-days"
                    class="w-full"
                  />
                </UFormGroup>
              </div>

              <!-- Utilisateur -->
              <div class="space-y-2">
                <UFormGroup label="👤 Utilisateur">
                  <UInputMenu
                    v-model="selectedUser"
                    :items="userOptions"
                    placeholder="Tous les utilisateurs"
                    icon="i-heroicons-user"
                    class="w-full"
                  />
                </UFormGroup>
              </div>

              <!-- Type d'opération -->
              <div class="space-y-2">
                <UFormGroup label="📋 Type d'opération">
                  <UInputMenu
                    v-model="selectedOperationType"
                    :items="operationTypeOptions"
                    placeholder="Tous les types"
                    icon="i-heroicons-list-bullet"
                    class="w-full"
                  />
                </UFormGroup>
              </div>

              <!-- Recherche textuelle -->
              <div class="space-y-2">
                <UFormGroup label="🔍 Recherche libre">
                  <UInput
                    v-model="searchQuery"
                    placeholder="Nom, email, note..."
                    icon="i-heroicons-magnifying-glass"
                    class="w-full"
                  />
                </UFormGroup>
              </div>
            </div>

            <!-- Dates personnalisées -->
            <div
              v-if="(selectedPeriod?.value || selectedPeriod) === 'custom'"
              class="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200"
            >
              <div class="flex items-center gap-2 mb-3">
                <UIcon
                  name="i-heroicons-calendar-days"
                  class="w-4 h-4 text-blue-600"
                />
                <span class="text-sm font-medium text-blue-800"
                  >Période personnalisée</span
                >
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <UFormGroup label="Date de début">
                  <UInput
                    v-model="customDateRange.startDate"
                    type="date"
                    icon="i-heroicons-play"
                  />
                </UFormGroup>
                <UFormGroup label="Date de fin">
                  <UInput
                    v-model="customDateRange.endDate"
                    type="date"
                    icon="i-heroicons-stop"
                  />
                </UFormGroup>
              </div>
            </div>
          </div>

          <!-- Section 2: Filtres avancés -->
          <div class="mb-8">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-1 h-6 bg-purple-500 rounded-full" />
              <h4 class="font-semibold text-gray-800 text-base">
                Filtres avancés
              </h4>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <!-- Période de la journée -->
              <div class="space-y-2">
                <UFormGroup label="🌅 Moment de la journée">
                  <UInputMenu
                    v-model="selectedTimeRange"
                    :items="timeRangeOptions"
                    placeholder="Toute la journée"
                    icon="i-heroicons-clock"
                    class="w-full"
                  />
                </UFormGroup>
              </div>

              <!-- Jour de la semaine -->
              <div class="space-y-2">
                <UFormGroup label="📅 Jour de la semaine">
                  <UInputMenu
                    v-model="selectedWeekday"
                    :items="weekdayOptions"
                    placeholder="Tous les jours"
                    icon="i-heroicons-calendar"
                    class="w-full"
                  />
                </UFormGroup>
              </div>

              <!-- Précision des comptages -->
              <div class="space-y-2">
                <UFormGroup label="🎯 Précision comptages">
                  <UInputMenu
                    v-model="selectedAccuracy"
                    :items="accuracyOptions"
                    placeholder="Tous les comptages"
                    icon="i-heroicons-target"
                    class="w-full"
                  />
                </UFormGroup>
              </div>

              <!-- Tri -->
              <div class="space-y-2">
                <UFormGroup label="🔀 Ordre de tri">
                  <UInputMenu
                    :model-value="sortBy + '_' + sortOrder"
                    :items="sortOptions"
                    placeholder="Date récente"
                    icon="i-heroicons-bars-arrow-down"
                    class="w-full"
                    @update:model-value="applySorting"
                  />
                </UFormGroup>
              </div>
            </div>
          </div>

          <!-- Section 3: Filtres par montant -->
          <div class="mb-6">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-1 h-6 bg-green-500 rounded-full" />
              <h4 class="font-semibold text-gray-800 text-base">
                Fourchette de montants
              </h4>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <UFormGroup label="💰 Montant minimum">
                  <UInput
                    v-model="amountFilter.min"
                    type="number"
                    placeholder="0,00 €"
                    step="0.01"
                    icon="i-heroicons-arrow-up"
                    class="w-full"
                  />
                </UFormGroup>
              </div>

              <div class="space-y-2">
                <UFormGroup label="💸 Montant maximum">
                  <UInput
                    v-model="amountFilter.max"
                    type="number"
                    placeholder="Illimité"
                    step="0.01"
                    icon="i-heroicons-arrow-down"
                    class="w-full"
                  />
                </UFormGroup>
              </div>
            </div>
          </div>

          <!-- Résumé des filtres actifs -->
          <div
            v-if="filteredStats.total !== statistics.totalOperations"
            class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5"
          >
            <div class="flex items-center gap-2 mb-3">
              <UIcon name="i-heroicons-funnel" class="w-5 h-5 text-blue-600" />
              <h4 class="font-semibold text-blue-800">Résultats filtrés</h4>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div class="bg-white rounded-lg p-3 text-center shadow-sm">
                <div class="text-2xl font-bold text-blue-600">
                  {{ filteredStats.total }}
                </div>
                <div class="text-xs text-gray-600 uppercase tracking-wide">
                  Total
                </div>
              </div>

              <div class="bg-white rounded-lg p-3 text-center shadow-sm">
                <div class="text-2xl font-bold text-purple-600">
                  {{ filteredStats.counts }}
                </div>
                <div class="text-xs text-gray-600 uppercase tracking-wide">
                  Comptages
                </div>
              </div>

              <div class="bg-white rounded-lg p-3 text-center shadow-sm">
                <div class="text-2xl font-bold text-gray-600">
                  {{ filteredStats.transactions }}
                </div>
                <div class="text-xs text-gray-600 uppercase tracking-wide">
                  Transactions
                </div>
              </div>

              <div class="bg-white rounded-lg p-3 text-center shadow-sm">
                <div class="text-lg font-bold text-green-600">
                  {{ formatCurrency(filteredStats.cashIn) }}
                </div>
                <div class="text-xs text-gray-600 uppercase tracking-wide">
                  Entrées
                </div>
              </div>

              <div class="bg-white rounded-lg p-3 text-center shadow-sm">
                <div class="text-lg font-bold text-red-600">
                  {{ formatCurrency(filteredStats.cashOut) }}
                </div>
                <div class="text-xs text-gray-600 uppercase tracking-wide">
                  Sorties
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"
        />
      </div>

      <!-- Erreur -->
      <UAlert
        v-if="error"
        icon="i-heroicons-exclamation-triangle"
        color="red"
        variant="solid"
        :title="error"
        class="mb-6"
      />

      <div v-if="!loading && !error">
        <!-- Statistiques principales redesignées -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <!-- Total opérations -->
          <div
            class="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <UIcon
                    name="i-heroicons-chart-bar"
                    class="w-5 h-5 text-blue-200"
                  />
                  <h3
                    class="text-blue-100 text-sm font-medium uppercase tracking-wide"
                  >
                    Total Opérations
                  </h3>
                </div>
                <p class="text-3xl font-bold mb-1">
                  {{ statistics.totalOperations }}
                </p>
                <p class="text-blue-200 text-sm">
                  {{ getPerformanceMetrics().operationsPerDay }}/jour en moyenne
                </p>
              </div>
              <div class="bg-blue-400/20 p-3 rounded-lg">
                <UIcon
                  name="i-heroicons-chart-bar"
                  class="w-8 h-8 text-blue-100"
                />
              </div>
            </div>
          </div>

          <!-- Total entrées -->
          <div
            class="bg-gradient-to-br from-emerald-500 via-green-600 to-green-700 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <UIcon
                    name="i-heroicons-arrow-up-circle"
                    class="w-5 h-5 text-green-200"
                  />
                  <h3
                    class="text-green-100 text-sm font-medium uppercase tracking-wide"
                  >
                    Entrées d'argent
                  </h3>
                </div>
                <p class="text-3xl font-bold mb-1">
                  {{ formatCurrency(statistics.totalCashIn) }}
                </p>
                <p class="text-green-200 text-sm">
                  {{ formatCurrency(statistics.averageTransactionAmount || 0) }}
                  en moyenne
                </p>
              </div>
              <div class="bg-green-400/20 p-3 rounded-lg">
                <UIcon
                  name="i-heroicons-arrow-up-circle"
                  class="w-8 h-8 text-green-100"
                />
              </div>
            </div>
          </div>

          <!-- Total sorties -->
          <div
            class="bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <UIcon
                    name="i-heroicons-arrow-down-circle"
                    class="w-5 h-5 text-red-200"
                  />
                  <h3
                    class="text-red-100 text-sm font-medium uppercase tracking-wide"
                  >
                    Sorties d'argent
                  </h3>
                </div>
                <p class="text-3xl font-bold mb-1">
                  {{ formatCurrency(statistics.totalCashOut) }}
                </p>
                <p class="text-red-200 text-sm">
                  {{ getPerformanceMetrics().transactionsPerDay }}/jour en
                  moyenne
                </p>
              </div>
              <div class="bg-red-400/20 p-3 rounded-lg">
                <UIcon
                  name="i-heroicons-arrow-down-circle"
                  class="w-8 h-8 text-red-100"
                />
              </div>
            </div>
          </div>

          <!-- Solde net -->
          <div
            class="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <UIcon
                    name="i-heroicons-scale"
                    class="w-5 h-5 text-purple-200"
                  />
                  <h3
                    class="text-purple-100 text-sm font-medium uppercase tracking-wide"
                  >
                    Solde Net
                  </h3>
                </div>
                <p class="text-3xl font-bold mb-1">
                  {{
                    formatCurrency(
                      statistics.totalCashIn - statistics.totalCashOut,
                    )
                  }}
                </p>
                <p class="text-purple-200 text-sm">
                  Différence entrées - sorties
                </p>
              </div>
              <div class="bg-purple-400/20 p-3 rounded-lg">
                <UIcon
                  name="i-heroicons-scale"
                  class="w-8 h-8 text-purple-100"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Statistiques avancées redesignées -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <!-- Précision des comptages -->
          <div
            class="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300 group"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <UIcon
                    name="i-heroicons-target"
                    class="w-5 h-5 text-orange-500"
                  />
                  <h3
                    class="text-gray-600 text-sm font-medium uppercase tracking-wide"
                  >
                    Taux de Précision
                  </h3>
                </div>
                <p class="text-2xl font-bold text-orange-600 mb-1">
                  {{ (statistics.accuracyRate || 0).toFixed(1) }}%
                </p>
                <p class="text-gray-500 text-sm">
                  {{ statistics.discrepanciesCount || 0 }} écart{{
                    (statistics.discrepanciesCount || 0) > 1 ? "s" : ""
                  }}
                </p>
              </div>
              <div
                class="p-3 rounded-lg bg-orange-50 group-hover:bg-orange-100 transition-colors"
              >
                <UIcon
                  name="i-heroicons-target"
                  class="w-8 h-8 text-orange-500"
                />
              </div>
            </div>
          </div>

          <!-- Jour de pointe -->
          <div
            class="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300 group"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <UIcon
                    name="i-heroicons-trending-up"
                    class="w-5 h-5 text-indigo-500"
                  />
                  <h3
                    class="text-gray-600 text-sm font-medium uppercase tracking-wide"
                  >
                    Jour de Pointe
                  </h3>
                </div>
                <p class="text-2xl font-bold text-indigo-600 mb-1">
                  {{ statistics.peakOperationDay?.count || 0 }} ops
                </p>
                <p
                  v-if="statistics.peakOperationDay"
                  class="text-gray-500 text-sm"
                >
                  {{
                    new Date(
                      statistics.peakOperationDay.date,
                    ).toLocaleDateString("fr-FR")
                  }}
                </p>
              </div>
              <div
                class="p-3 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 transition-colors"
              >
                <UIcon
                  name="i-heroicons-trending-up"
                  class="w-8 h-8 text-indigo-500"
                />
              </div>
            </div>
          </div>

          <!-- Plus grosse transaction -->
          <div
            class="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300 group"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <UIcon
                    name="i-heroicons-banknotes"
                    class="w-5 h-5 text-emerald-500"
                  />
                  <h3
                    class="text-gray-600 text-sm font-medium uppercase tracking-wide"
                  >
                    Plus Grosse Transaction
                  </h3>
                </div>
                <p class="text-xl font-bold text-emerald-600 mb-1">
                  {{
                    formatCurrency(statistics.largestTransaction?.amount || 0)
                  }}
                </p>
                <p
                  v-if="statistics.largestTransaction"
                  class="text-gray-500 text-sm"
                >
                  {{ getOperationLabel(statistics.largestTransaction.type) }}
                </p>
              </div>
              <div
                class="p-3 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 transition-colors"
              >
                <UIcon
                  name="i-heroicons-banknotes"
                  class="w-8 h-8 text-emerald-500"
                />
              </div>
            </div>
          </div>

          <!-- Utilisateur le plus actif -->
          <div
            class="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300 group"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <UIcon
                    name="i-heroicons-user-circle"
                    class="w-5 h-5 text-pink-500"
                  />
                  <h3
                    class="text-gray-600 text-sm font-medium uppercase tracking-wide"
                  >
                    Plus Actif
                  </h3>
                </div>
                <p class="text-sm font-bold text-pink-600 truncate mb-1">
                  {{ statistics.mostActiveUser?.name || "N/A" }}
                </p>
                <p class="text-gray-500 text-sm">
                  {{ statistics.mostActiveUser?.total || 0 }} opération{{
                    (statistics.mostActiveUser?.total || 0) > 1 ? "s" : ""
                  }}
                </p>
              </div>
              <div
                class="p-3 rounded-lg bg-pink-50 group-hover:bg-pink-100 transition-colors"
              >
                <UIcon
                  name="i-heroicons-user-circle"
                  class="w-8 h-8 text-pink-500"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Analyse par période de la journée redesignée -->
        <div class="bg-white rounded-xl shadow-lg border border-gray-100 mb-8">
          <div
            class="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-xl"
          >
            <div class="flex items-center gap-3">
              <div class="p-2 bg-yellow-100 rounded-lg">
                <UIcon name="i-heroicons-sun" class="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-800">
                  Répartition par période de la journée
                </h3>
                <p class="text-sm text-gray-500">
                  Analyse des opérations selon les tranches horaires
                </p>
              </div>
            </div>
          </div>

          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div
                class="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-6 text-center hover:shadow-md transition-all duration-300"
              >
                <div
                  class="bg-yellow-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center"
                >
                  <UIcon
                    name="i-heroicons-sun"
                    class="w-8 h-8 text-yellow-600"
                  />
                </div>
                <h4 class="font-semibold text-gray-800 mb-2">Matin</h4>
                <p class="text-xs text-gray-500 mb-3">6h00 - 12h00</p>
                <p class="text-3xl font-bold text-yellow-600 mb-2">
                  {{ statistics.timeRangeStats?.morning?.count || 0 }}
                </p>
                <p class="text-sm text-gray-600 font-medium">
                  {{
                    formatCurrency(
                      statistics.timeRangeStats?.morning?.amount || 0,
                    )
                  }}
                </p>
              </div>

              <div
                class="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6 text-center hover:shadow-md transition-all duration-300"
              >
                <div
                  class="bg-orange-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center"
                >
                  <UIcon
                    name="i-heroicons-sun"
                    class="w-8 h-8 text-orange-600"
                  />
                </div>
                <h4 class="font-semibold text-gray-800 mb-2">Après-midi</h4>
                <p class="text-xs text-gray-500 mb-3">12h00 - 18h00</p>
                <p class="text-3xl font-bold text-orange-600 mb-2">
                  {{ statistics.timeRangeStats?.afternoon?.count || 0 }}
                </p>
                <p class="text-sm text-gray-600 font-medium">
                  {{
                    formatCurrency(
                      statistics.timeRangeStats?.afternoon?.amount || 0,
                    )
                  }}
                </p>
              </div>

              <div
                class="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-6 text-center hover:shadow-md transition-all duration-300"
              >
                <div
                  class="bg-indigo-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center"
                >
                  <UIcon
                    name="i-heroicons-moon"
                    class="w-8 h-8 text-indigo-600"
                  />
                </div>
                <h4 class="font-semibold text-gray-800 mb-2">Soir</h4>
                <p class="text-xs text-gray-500 mb-3">18h00 - 6h00</p>
                <p class="text-3xl font-bold text-indigo-600 mb-2">
                  {{ statistics.timeRangeStats?.evening?.count || 0 }}
                </p>
                <p class="text-sm text-gray-600 font-medium">
                  {{
                    formatCurrency(
                      statistics.timeRangeStats?.evening?.amount || 0,
                    )
                  }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Analyse par jour de la semaine redesignée -->
        <div class="bg-white rounded-xl shadow-lg border border-gray-100 mb-8">
          <div
            class="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-xl"
          >
            <div class="flex items-center gap-3">
              <div class="p-2 bg-blue-100 rounded-lg">
                <UIcon
                  name="i-heroicons-calendar"
                  class="w-5 h-5 text-blue-600"
                />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-800">
                  Répartition par jour de la semaine
                </h3>
                <p class="text-sm text-gray-500">
                  Activité selon les jours de la semaine
                </p>
              </div>
            </div>
          </div>

          <div class="p-6">
            <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
              <div
                v-for="(count, day) in statistics.operationsByWeekday"
                :key="day"
                class="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 text-center hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                <h5 class="font-semibold text-gray-800 text-sm mb-2">
                  {{ day }}
                </h5>
                <p class="text-2xl font-bold text-blue-600 mb-3">{{ count }}</p>

                <!-- Barre de progression -->
                <div class="w-full bg-blue-200 rounded-full h-2">
                  <div
                    class="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-500"
                    :style="{
                      width: `${
                        Object.values(statistics.operationsByWeekday || {})
                          .length > 0
                          ? Math.max(
                              5,
                              (count /
                                Math.max(
                                  ...Object.values(
                                    statistics.operationsByWeekday || {},
                                  ),
                                )) *
                                100,
                            )
                          : 0
                      }%`,
                    }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top performers redesigné -->
        <div class="bg-white rounded-xl shadow-lg border border-gray-100 mb-8">
          <div
            class="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-xl"
          >
            <div class="flex items-center gap-3">
              <div class="p-2 bg-emerald-100 rounded-lg">
                <UIcon
                  name="i-heroicons-trophy"
                  class="w-5 h-5 text-emerald-600"
                />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-800">
                  🏆 Top 5 utilisateurs les plus actifs
                </h3>
                <p class="text-sm text-gray-500">
                  Classement par nombre d'opérations
                </p>
              </div>
            </div>
          </div>

          <div class="p-6">
            <div class="space-y-4">
              <div
                v-for="(user, index) in topPerformers"
                :key="user.userId"
                class="flex items-center justify-between p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
              >
                <div class="flex items-center gap-4">
                  <div class="flex-shrink-0">
                    <div
                      class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
                      :class="
                        index === 0
                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                          : index === 1
                            ? 'bg-gradient-to-r from-gray-400 to-gray-600'
                            : index === 2
                              ? 'bg-gradient-to-r from-amber-600 to-orange-600'
                              : 'bg-gradient-to-r from-emerald-400 to-teal-600'
                      "
                    >
                      {{ index + 1 }}
                    </div>
                  </div>

                  <!-- Badge position -->
                  <div v-if="index < 3" class="text-3xl">
                    {{ index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉" }}
                  </div>

                  <div>
                    <div class="font-bold text-gray-900 text-lg">
                      {{ user.name }}
                    </div>
                    <div class="text-sm text-gray-600">{{ user.email }}</div>
                    <div
                      class="flex items-center gap-2 text-xs text-gray-500 mt-1"
                    >
                      <UIcon name="i-heroicons-clock" class="w-3 h-3" />
                      Dernière activité:
                      {{
                        new Date(user.lastOperation).toLocaleDateString("fr-FR")
                      }}
                    </div>
                  </div>
                </div>

                <div class="text-right">
                  <div class="text-3xl font-bold text-emerald-600 mb-1">
                    {{ user.total }}
                  </div>
                  <div class="flex gap-2 mb-2">
                    <span
                      class="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
                    >
                      {{ user.counts }}C
                    </span>
                    <span
                      class="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                    >
                      {{ user.transactions }}T
                    </span>
                  </div>
                  <div
                    class="text-lg font-bold px-3 py-1 rounded-lg"
                    :class="
                      user.cashIn - user.cashOut >= 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    "
                  >
                    {{ formatCurrency(user.cashIn - user.cashOut) }}
                  </div>
                  <div
                    v-if="user.discrepancies > 0"
                    class="text-xs text-orange-600 mt-1 font-medium"
                  >
                    ⚠️ {{ user.discrepancies }} écart{{
                      user.discrepancies > 1 ? "s" : ""
                    }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Statistiques par utilisateur -->
        <div
          v-if="Object.keys(statistics.operationsByUser).length > 0"
          class="bg-white rounded-lg shadow-md mb-6"
        >
          <div class="p-6 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-800">
              Statistiques par utilisateur
            </h3>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Utilisateur
                  </th>
                  <th
                    class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                  >
                    Total
                  </th>
                  <th
                    class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                  >
                    Comptages
                  </th>
                  <th
                    class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                  >
                    Transactions
                  </th>
                  <th
                    class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"
                  >
                    Entrées
                  </th>
                  <th
                    class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"
                  >
                    Sorties
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr
                  v-for="(userStats, userId) in statistics.operationsByUser"
                  :key="userId"
                >
                  <td class="px-6 py-4">
                    <div>
                      <div class="font-medium text-gray-900">
                        {{ userStats.name }}
                      </div>
                      <div class="text-sm text-gray-500">
                        {{ userStats.email }}
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <UBadge color="blue" variant="soft">{{
                      userStats.total
                    }}</UBadge>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <UBadge color="purple" variant="soft">{{
                      userStats.counts
                    }}</UBadge>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <UBadge color="gray" variant="soft">{{
                      userStats.transactions
                    }}</UBadge>
                  </td>
                  <td class="px-6 py-5 text-right">
                    <div
                      class="inline-flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg font-semibold"
                    >
                      <UIcon
                        name="i-heroicons-arrow-trending-up"
                        class="w-4 h-4"
                      />
                      {{ formatCurrency(userStats.cashIn) }}
                    </div>
                  </td>
                  <td class="px-6 py-5 text-right">
                    <div
                      class="inline-flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg font-semibold"
                    >
                      <UIcon
                        name="i-heroicons-arrow-trending-down"
                        class="w-4 h-4"
                      />
                      {{ formatCurrency(userStats.cashOut) }}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Historique des opérations redesigné -->
        <div class="bg-white rounded-xl shadow-lg border border-gray-100">
          <div
            class="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-xl"
          >
            <div class="flex items-center gap-3">
              <div class="p-2 bg-slate-100 rounded-lg">
                <UIcon
                  name="i-heroicons-clock"
                  class="w-5 h-5 text-slate-600"
                />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-800">
                  📝 Historique des opérations
                </h3>
                <p class="text-sm text-gray-500">
                  Journal détaillé de toutes les activités
                </p>
              </div>
            </div>
          </div>

          <div
            v-if="cashHistory.length === 0"
            class="p-12 text-center text-gray-500"
          >
            <div
              class="bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center"
            >
              <UIcon name="i-heroicons-inbox" class="w-10 h-10 text-gray-400" />
            </div>
            <h4 class="text-lg font-medium text-gray-600 mb-2">
              Aucune opération
            </h4>
            <p class="text-sm">
              Aucune opération trouvée pour les critères sélectionnés
            </p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="min-w-full">
              <thead class="bg-gradient-to-r from-slate-50 to-gray-50">
                <tr>
                  <th
                    class="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                  >
                    📅 Date/Heure
                  </th>
                  <th
                    class="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                  >
                    🏷️ Type
                  </th>
                  <th
                    class="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                  >
                    👤 Utilisateur
                  </th>
                  <th
                    class="px-6 py-4 text-right text-sm font-semibold text-gray-700"
                  >
                    💰 Montant
                  </th>
                  <th
                    class="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                  >
                    📋 Détails
                  </th>
                  <th
                    class="px-6 py-4 text-left text-sm font-semibold text-gray-700"
                  >
                    📝 Note
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr
                  v-for="operation in paginatedHistory"
                  :key="operation.id"
                  class="hover:bg-gradient-to-r hover:from-slate-25 hover:to-gray-25 transition-all duration-200"
                >
                  <td class="px-6 py-5 text-sm text-gray-600 font-medium">
                    {{ formatDateTime(operation.date) }}
                  </td>

                  <td class="px-6 py-5">
                    <div class="flex items-center gap-3">
                      <div
                        class="p-2 rounded-lg"
                        :class="`bg-${getOperationColor(operation.type)}-100`"
                      >
                        <UIcon
                          :name="getOperationIcon(operation.type)"
                          :class="`w-4 h-4 text-${getOperationColor(
                            operation.type,
                          )}-600`"
                        />
                      </div>
                      <UBadge
                        :color="getOperationColor(operation.type)"
                        variant="soft"
                        size="sm"
                        class="font-semibold"
                      >
                        {{ getOperationLabel(operation.type) }}
                      </UBadge>
                    </div>
                  </td>

                  <td class="px-6 py-5">
                    <div v-if="operation.user" class="flex items-center gap-3">
                      <div
                        class="w-8 h-8 bg-gradient-to-br from-slate-400 to-gray-500 rounded-full flex items-center justify-center text-white font-bold text-xs"
                      >
                        {{
                          operation.user.name?.charAt(0)?.toUpperCase() || "?"
                        }}
                      </div>
                      <div>
                        <div class="font-semibold text-gray-900 text-sm">
                          {{ operation.user.name }}
                        </div>
                        <div class="text-xs text-gray-500">
                          {{ operation.user.email }}
                        </div>
                      </div>
                    </div>
                    <div v-else class="flex items-center gap-3">
                      <div
                        class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center"
                      >
                        <UIcon
                          name="i-heroicons-user"
                          class="w-4 h-4 text-gray-500"
                        />
                      </div>
                      <span class="text-sm text-gray-400 italic"
                        >Utilisateur inconnu</span
                      >
                    </div>
                  </td>

                  <td class="px-6 py-5 text-right">
                    <div
                      class="inline-flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm"
                      :class="
                        getOperationColor(operation.type) === 'green'
                          ? 'text-green-600'
                          : getOperationColor(operation.type) === 'red'
                            ? 'text-red-600'
                            : 'text-purple-600'
                      "
                    >
                      {{ formatCurrency(operation.amount) }}
                    </div>
                    <div
                      v-if="
                        operation.type === 'count' && operation.difference !== 0
                      "
                      class="text-sm"
                      :class="
                        operation.difference > 0
                          ? 'text-green-500'
                          : 'text-red-500'
                      "
                    >
                      Diff: {{ formatCurrency(operation.difference) }}
                    </div>
                  </td>

                  <td class="px-6 py-4 text-sm text-gray-600">
                    <div v-if="operation.type === 'count'">
                      <div>
                        Date comptage:
                        {{
                          new Date(
                            operation.details.countDate,
                          ).toLocaleDateString("fr-FR")
                        }}
                      </div>
                      <div v-if="operation.expectedAmount">
                        Attendu: {{ formatCurrency(operation.expectedAmount) }}
                      </div>
                    </div>
                    <div v-else>
                      <div v-if="operation.reason">{{ operation.reason }}</div>
                      <div
                        v-if="operation.details.source"
                        class="text-xs text-gray-500"
                      >
                        Source: {{ operation.details.source }}
                      </div>
                      <div
                        v-if="operation.details.recipient"
                        class="text-xs text-gray-500"
                      >
                        Destinataire: {{ operation.details.recipient }}
                      </div>
                    </div>
                  </td>

                  <td class="px-6 py-5">
                    <div v-if="operation.type === 'count'" class="space-y-1">
                      <div
                        class="flex items-center gap-2 text-sm text-gray-600"
                      >
                        <UIcon
                          name="i-heroicons-calendar"
                          class="w-4 h-4 text-gray-400"
                        />
                        {{
                          new Date(
                            operation.details.countDate,
                          ).toLocaleDateString("fr-FR")
                        }}
                      </div>
                      <div
                        v-if="operation.expectedAmount"
                        class="text-xs text-gray-500"
                      >
                        💰 Attendu:
                        {{ formatCurrency(operation.expectedAmount) }}
                      </div>
                    </div>
                    <div v-else class="space-y-1">
                      <div
                        v-if="operation.reason"
                        class="text-sm text-gray-600"
                      >
                        {{ operation.reason }}
                      </div>
                      <div
                        v-if="operation.details.source"
                        class="flex items-center gap-1 text-xs text-gray-500"
                      >
                        <UIcon
                          name="i-heroicons-arrow-up-right"
                          class="w-3 h-3"
                        />
                        {{ operation.details.source }}
                      </div>
                      <div
                        v-if="operation.details.recipient"
                        class="flex items-center gap-1 text-xs text-gray-500"
                      >
                        <UIcon
                          name="i-heroicons-arrow-down-right"
                          class="w-3 h-3"
                        />
                        {{ operation.details.recipient }}
                      </div>
                    </div>
                  </td>

                  <td class="px-6 py-5">
                    <div
                      v-if="operation.note"
                      class="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 max-w-xs"
                    >
                      💬 {{ operation.note }}
                    </div>
                    <div v-else class="text-xs text-gray-400 italic">-</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination moderne et intuitive -->
          <div
            v-if="totalPages > 1"
            class="px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-slate-50 to-gray-50 rounded-b-xl"
          >
            <div
              class="flex flex-col sm:flex-row justify-between items-center gap-4"
            >
              <!-- Informations de pagination -->
              <div class="text-sm text-gray-600 font-medium">
                📊 Affichage de
                <span class="font-bold text-slate-700">{{
                  (currentPage - 1) * itemsPerPage + 1
                }}</span>
                à
                <span class="font-bold text-slate-700">{{
                  Math.min(currentPage * itemsPerPage, cashHistory.length)
                }}</span>
                sur
                <span class="font-bold text-slate-700">{{
                  cashHistory.length
                }}</span>
                opérations
              </div>

              <!-- Contrôles de pagination -->
              <div class="flex items-center gap-3">
                <!-- Options par page -->
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-500 font-medium"
                    >📄 Par page:</span
                  >
                  <USelect
                    v-model="itemsPerPage"
                    :options="[
                      { label: '5', value: 5 },
                      { label: '10', value: 10 },
                      { label: '25', value: 25 },
                      { label: '50', value: 50 },
                    ]"
                    option-attribute="label"
                    value-attribute="value"
                    size="sm"
                    class="w-20"
                  />
                </div>

                <div class="h-6 w-px bg-gray-300" />

                <!-- Navigation -->
                <div class="flex items-center gap-1">
                  <!-- Première page -->
                  <UButton
                    icon="i-heroicons-chevron-double-left"
                    size="sm"
                    color="slate"
                    variant="soft"
                    :disabled="currentPage === 1"
                    class="hover:shadow-sm transition-shadow"
                    @click="currentPage = 1"
                  />

                  <!-- Page précédente -->
                  <UButton
                    icon="i-heroicons-chevron-left"
                    size="sm"
                    color="slate"
                    variant="soft"
                    :disabled="currentPage === 1"
                    class="hover:shadow-sm transition-shadow"
                    @click="currentPage--"
                  />

                  <!-- Page actuelle -->
                  <div
                    class="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 min-w-[2.5rem] text-center"
                  >
                    {{ currentPage }}
                  </div>

                  <!-- Page suivante -->
                  <UButton
                    icon="i-heroicons-chevron-right"
                    size="sm"
                    color="slate"
                    variant="soft"
                    :disabled="currentPage === totalPages"
                    class="hover:shadow-sm transition-shadow"
                    @click="currentPage++"
                  />

                  <!-- Dernière page -->
                  <UButton
                    icon="i-heroicons-chevron-double-right"
                    size="sm"
                    color="slate"
                    variant="soft"
                    :disabled="currentPage === totalPages"
                    class="hover:shadow-sm transition-shadow"
                    @click="currentPage = totalPages"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 1400px;
}
</style>
