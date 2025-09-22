<script setup>
// Meta configuration
import { useMagasinStore } from "../../composables/useMagasinStore";
import { useCurrentUser } from "../../composables/useCurrentUser";
import { useCompanySettings } from "../../composables/useCompanySettings";
import NotificationMenu from "../../components/NotificationMenu.vue";

const { companyId, isLoadingUser, loadCurrentUser } = useCurrentUser();
const { settings: companySettings, fetchCompanySettings } =
  useCompanySettings();

onMounted(async () => {
  if (isLoadingUser.value) {
    await loadCurrentUser();
  }
  if (companyId.value) await fetchCompanySettings(companyId.value);
});

definePageMeta({
  middleware: ["auth", "roles"],
});

// SEO
useSeoMeta({
  title: "Caisse - Ventes Journalières",
  description: "Gestion de la caisse et des ventes journalières",
});

// Imports
const supabase = useSupabaseClient();
const toast = useToast();
const cashManagement = useCashManagement();
const magasinStore = useMagasinStore();

// États
const loading = ref(true);
const error = ref(null);
const selectedDate = ref(new Date().toISOString().split("T")[0]);
const showPaymentModal = ref(false);
const selectedInvoice = ref(null);
const showCashCountModal = ref(false);
const showDailySummaryModal = ref(false);
const showReceiptModal = ref(false);
const selectedSale = ref(null);
const showRefundModal = ref(false);
const showCashOutModal = ref(false);
const showCashInModal = ref(false);
const showHistoryModal = ref(false);

// Données de la caisse
const dailySales = ref([]);
const cashTransactions = ref([]); // Nouvelles transactions de caisse
const cashHistory = ref({
  transactions: [],
  summary: {
    totalCashSales: 0,
    totalCashIn: 0,
    totalCashOut: 0,
    totalEmptied: 0,
  },
});

const historyFilter = ref({
  period: "today",
  startDate: "",
  endDate: "",
}); // Historique des vidages de caisse
const todayStats = ref({
  totalSales: 0,
  totalCash: 0,
  totalCard: 0,
  totalInvoices: 0,
  totalQuantity: 0,
  averageTicket: 0,
  cashOut: 0, // Sorties d'argent
  cashIn: 0, // Entrées d'argent
  openingBalance: 0, // Solde d'ouverture (argent du jour précédent)
  expectedCash: 0, // Argent théorique en caisse
});

// Récupérer les rôles de l'utilisateur actuel
const { userRoles } = useCurrentUser();

// État pour vérifier si un comptage a été fait pour la date sélectionnée
const selectedDateCashCount = ref(null);
const hasCountForDate = computed(() => selectedDateCashCount.value !== null);

// Données pour le comptage de caisse
const cashCount = reactive({
  500: 0,
  200: 0,
  100: 0,
  50: 0,
  20: 0,
  10: 0,
  5: 0,
  2: 0,
  1: 0,
  0.5: 0,
  0.2: 0,
  0.1: 0,
  0.05: 0,
  0.02: 0,
  0.01: 0,
});

const cashCountInfo = reactive({
  expectedAmount: 0,
  actualAmount: 0,
  difference: 0,
  note: "",
  openingBalance: 0, // Nouveau : solde d'ouverture
});

// Computed pour le total du comptage
const cashCountTotal = computed(() => {
  let total = 0;
  Object.entries(cashCount).forEach(([denomination, count]) => {
    total += parseFloat(denomination) * parseInt(count || 0);
  });
  return total;
});

// Computed pour la différence
const cashCountDifference = computed(() => {
  return cashCountTotal.value - cashCountInfo.expectedAmount;
});

// Données pour le remboursement
const refund = reactive({
  amount: 0,
  reason: "",
  method: "especes",
});

// Données pour l'impression de reçu
const receipt = reactive({
  saleId: null,
  customerCopy: true,
  merchantCopy: false,
});

// Données pour sortie d'argent
const cashOut = reactive({
  amount: 0,
  reason: "",
  recipient: "",
  note: "",
  magasinId: magasinStore.magasinId,
});

// Données pour entrée d'argent
const cashIn = reactive({
  amount: 0,
  source: "",
  reason: "", // fond de caisse, remboursement, etc.
  note: "",
  magasinId: magasinStore.magasinId,
});

// Données pour la nouvelle vente
const newSale = reactive({
  client_id: "",
  items: [],
  paymentMethod: "especes",
  note: "",
});

// Données pour le paiement
const payment = reactive({
  amount: 0,
  method: "especes",
  reference: "",
  note: "",
});

// Listes de données
const clients = ref([]);
const products = ref([]);
const availableProducts = ref([]);

// Configuration des méthodes de paiement
const paymentMethods = [
  {
    label: "Espèces",
    value: "especes",
    icon: "i-heroicons-banknotes",
    color: "green",
  },
  {
    label: "Carte",
    value: "carte",
    icon: "i-heroicons-credit-card",
    color: "blue",
  },
  {
    label: "Virement",
    value: "virement",
    icon: "i-heroicons-arrow-path",
    color: "purple",
  },
  {
    label: "Chèque",
    value: "cheque",
    icon: "i-heroicons-document-text",
    color: "orange",
  },
];

// Formats
const formatCurrency = (value) => {
  const currency = companySettings?.value?.currency;
  if (!currency || typeof currency !== "string") {
    // Fallback to EUR if currency is not defined
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  }
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
};

const formatTime = (date) => {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

const formatDate = (date) => {
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
};

// Méthode de paiement helper
const getPaymentMethodInfo = (method) => {
  return paymentMethods.find((pm) => pm.value === method) || paymentMethods[0];
};

// Filtrer les paiements du jour sélectionné
const getPaymentsForSelectedDate = (payments) => {
  if (!payments || payments.length === 0) return [];

  const selectedDateStart = new Date(selectedDate.value + "T00:00:00");
  const selectedDateEnd = new Date(selectedDate.value + "T23:59:59");

  return payments.filter((payment) => {
    const paymentDate = new Date(payment.payment_date);
    return paymentDate >= selectedDateStart && paymentDate <= selectedDateEnd;
  });
};

// Obtenir le message de statut de paiement pour la date sélectionnée
const getPaymentStatusMessage = (sale) => {
  const dayPayments = getPaymentsForSelectedDate(sale.payments);
  const allPayments = sale.payments || [];

  if (dayPayments.length > 0) {
    return null; // Il y a des paiements ce jour, on les affiche
  }

  if (allPayments.length === 0) {
    return "Facture non payée";
  }

  // Il y a des paiements mais pas ce jour
  return `Aucun paiement le ${formatDate(selectedDate.value)}`;
};

// Total du panier (non utilisé mais conservé pour éviter les erreurs)
const _cartTotal = computed(() => {
  return newSale.items.reduce((total, item) => {
    return total + item.quantity * item.price;
  }, 0);
});

// Montant total du comptage de caisse (deprecated - utiliser cashCountTotal à la place)
const _totalCashCounted = computed(() => {
  return cashCountTotal.value;
});

// Calculer la différence de caisse
watch(cashCountTotal, (newValue) => {
  cashCountInfo.actualAmount = newValue;
  cashCountInfo.difference = newValue - cashCountInfo.expectedAmount;
});

// Détails du Z de caisse
const dailySummary = computed(() => ({
  openingDate: selectedDate.value,
  closingDate: new Date().toISOString().split("T")[0],
  totalTransactions: dailySales.value.length,
  totalSales: todayStats.value.totalSales,
  totalCash: todayStats.value.totalCash,
  totalCard: todayStats.value.totalCard,
  totalRefunds: 0, // À calculer depuis les remboursements
  netSales: todayStats.value.totalSales,
  averageTicket: todayStats.value.averageTicket,
  taxAmount: todayStats.value.totalSales * 0.2, // Exemple 20% TVA
}));

// Charger les données de base
const loadBaseData = async () => {
  try {
    // recuperer id magasin sélectionné
    if (
      !magasinStore.magasinId ||
      typeof magasinStore.magasinId !== "string" ||
      magasinStore.magasinId.trim() === ""
    ) {
      error.value =
        "Aucun magasin sélectionné ou identifiant magasin invalide.";
      return;
    }

    // Charger les clients
    const { data: clientsData, error: clientsError } = await supabase
      .from("clients")
      .select("id, name, email, phone, magasin_id")
      .eq("magasin_id", magasinStore.magasinId)
      .order("name", { ascending: true });

    if (clientsError) throw clientsError;
    clients.value = clientsData || [];

    // Charger les produits avec stock > 0
    const { data: productsData, error: productsError } = await supabase
      .from("products_carreaux")
      .select("*")
      .gt("stock", 0)
      .order("name", { ascending: true });

    if (productsError) throw productsError;
    products.value = productsData || [];
    availableProducts.value = productsData || [];
  } catch (err) {
    console.error("Erreur lors du chargement des données de base:", err);
    error.value = err.message;
  }
};

// Charger les ventes du jour
const loadDailySales = async () => {
  try {
    loading.value = true;
    error.value = null;

    if (
      !magasinStore.magasinId ||
      typeof magasinStore.magasinId !== "string" ||
      magasinStore.magasinId.trim() === ""
    ) {
      error.value =
        "Aucun magasin sélectionné ou identifiant magasin invalide.";
      loading.value = false;
      return;
    }

    const startOfDay = new Date(selectedDate.value + "T00:00:00");
    const endOfDay = new Date(selectedDate.value + "T23:59:59");

    // Récupérer toutes les factures avec leurs paiements
    // On filtre ensuite côté client pour ne montrer que celles pertinentes pour le jour
    const { data: allInvoicesData, error: allInvoicesError } = await supabase
      .from("invoices")
      .select(
        `
        *,
        clients(id, name, email, phone, magasin_id),
        invoice_items(
          id, quantity, price, external_reference, external_description, is_external,
          products_carreaux(id, name, reference)
        ),
        payments(id, amount, payment_method, payment_date, reference, note)
      `
      )
      .eq("magasin_id", magasinStore.magasinId)
      .order("created_at", { ascending: false });

    if (allInvoicesError) throw allInvoicesError;

    // Filtrer les factures qui ont soit:
    // 1. Des paiements pour le jour sélectionné
    // 2. Ou qui sont non payées (pour permettre les paiements en retard)
    const relevantInvoices = (allInvoicesData || []).filter((invoice) => {
      // Vérifier s'il y a des paiements pour le jour sélectionné
      const hasDayPayments = invoice.payments?.some((payment) => {
        const paymentDate = new Date(payment.payment_date);
        return paymentDate >= startOfDay && paymentDate <= endOfDay;
      });

      // Inclure si: a des paiements du jour OU est impayée/partiellement payée
      return hasDayPayments || invoice.status !== "paid";
    });

    dailySales.value = relevantInvoices;
    calculateDayStats();
    await loadSelectedDateCashCount(); // Charger le comptage de la date sélectionnée
  } catch (err) {
    error.value = err.message;
    toast.add({
      title: "Erreur",
      description: error.value,
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
  } finally {
    loading.value = false;
  }
};

// Calculer les statistiques du jour
const calculateDayStats = async () => {
  const selectedDateStart = new Date(selectedDate.value + "T00:00:00");
  const selectedDateEnd = new Date(selectedDate.value + "T23:59:59");

  const stats = {
    totalSales: 0,
    totalCash: 0,
    totalCard: 0,
    totalInvoices: 0, // Compter seulement les factures avec paiements du jour
    totalQuantity: 0,
    averageTicket: 0,
    cashOut: 0,
    cashIn: 0,
    openingBalance: 0,
    expectedCash: 0,
  };

  dailySales.value.forEach((sale) => {
    // Vérifier que la facture a des paiements pour le jour sélectionné
    const dayPayments =
      sale.payments?.filter((payment) => {
        const paymentDate = new Date(payment.payment_date);
        return (
          paymentDate >= selectedDateStart && paymentDate <= selectedDateEnd
        );
      }) || [];

    if (dayPayments.length > 0) {
      stats.totalInvoices += 1; // Compter la facture si elle a des paiements du jour

      // Calculer le total des paiements du jour pour cette facture
      const dailyPaymentTotal = dayPayments.reduce((sum, payment) => {
        return sum + (parseFloat(payment.amount) || 0);
      }, 0);

      stats.totalSales += dailyPaymentTotal;

      // Quantités vendues (tous types d'articles confondus)
      // Note: Les quantités sont basées sur la facture entière, pas proportionnelles au paiement
      if (sale.invoice_items) {
        sale.invoice_items.forEach((item) => {
          stats.totalQuantity += parseInt(item.quantity) || 0;
        });
      }

      // Répartition par méthode de paiement (seulement les paiements du jour)
      dayPayments.forEach((payment) => {
        const amount = parseFloat(payment.amount) || 0;
        if (payment.payment_method === "especes") {
          stats.totalCash += amount;
        } else if (payment.payment_method === "carte") {
          stats.totalCard += amount;
        }
      });
    }
  });

  // Charger les transactions de caisse du jour (entrées/sorties)
  await loadCashTransactions(stats);

  stats.averageTicket =
    stats.totalInvoices > 0 ? stats.totalSales / stats.totalInvoices : 0;

  // Calculer l'argent théorique en caisse
  stats.expectedCash =
    stats.openingBalance + stats.totalCash + stats.cashIn - stats.cashOut;

  todayStats.value = stats;
};

// Charger les transactions de caisse du jour
const loadCashTransactions = async (stats) => {
  try {
    const startOfDay = new Date(selectedDate.value + "T00:00:00");
    const endOfDay = new Date(selectedDate.value + "T23:59:59");

    // Essayer de charger depuis une table cash_transactions si elle existe
    // Sinon, simuler avec des valeurs par défaut
    try {
      const { data: transactionsData, error: transactionsError } =
        await supabase
          .from("cash_transactions")
          .select("*")
          .eq("magasin_id", magasinStore.magasinId)
          .gte("created_at", startOfDay.toISOString())
          .lte("created_at", endOfDay.toISOString())
          .order("created_at", { ascending: false });

      if (transactionsError) throw transactionsError;

      cashTransactions.value = transactionsData || [];

      // Calculer les totaux
      cashTransactions.value.forEach((transaction) => {
        if (transaction.type === "out") {
          stats.cashOut += parseFloat(transaction.amount) || 0;
        } else if (transaction.type === "in") {
          stats.cashIn += parseFloat(transaction.amount) || 0;
        }
      });
    } catch {
      // Si la table n'existe pas, utiliser des valeurs simulées
      console.log("Table cash_transactions non trouvée, simulation activée");
      cashTransactions.value = [];
      stats.cashOut = 0;
      stats.cashIn = 0;
    }

    // Charger le solde d'ouverture (argent du jour précédent)
    await loadOpeningBalance(stats);
  } catch (err) {
    console.error("Erreur lors du chargement des transactions de caisse:", err);
  }
};

// Charger le solde d'ouverture
const loadOpeningBalance = async (stats) => {
  try {
    const selectedDateObj = new Date(selectedDate.value);
    const previousDay = new Date(selectedDateObj);
    previousDay.setDate(previousDay.getDate() - 1);
    const previousDayString = previousDay.toISOString().split("T")[0];

    // Essayer de charger le solde de fermeture du jour précédent
    try {
      const { data: closingData, error: closingError } = await supabase
        .from("daily_closings")
        .select("closing_balance")
        .eq("date", previousDayString)
        .single();

      if (closingError && closingError.code !== "PGRST116") throw closingError;
      // Si aucune ligne n'est retournée, PGRST116, on met à 0
      if (!closingData || closingError?.code === "PGRST116") {
        stats.openingBalance = 0;
        console.log("Aucun solde de fermeture trouvé pour le jour précédent");
      } else {
        stats.openingBalance = parseFloat(closingData.closing_balance) || 0;
      }
    } catch (err) {
      stats.openingBalance = 0;
      console.log(
        "Aucun solde de fermeture trouvé pour le jour précédent",
        err
      );
    }
  } catch (err) {
    console.error("Erreur lors du chargement du solde d'ouverture:", err);
  }
};

// Charger le comptage de la date sélectionnée
const loadSelectedDateCashCount = async () => {
  try {
    // Chercher spécifiquement UN comptage pour cette date
    const { data: countData, error: countError } = await supabase
      .from("cash_counts")
      .select("*")
      .eq("date", selectedDate.value)
      .eq("magasin_id", magasinStore.magasinId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (countError) throw countError;

    // Vérifier s'il y a plusieurs comptages (problème de données)
    const { count: totalCounts } = await supabase
      .from("cash_counts")
      .select("*", { count: "exact", head: true })
      .eq("date", selectedDate.value)
      .eq("magasin_id", magasinStore.magasinId);

    if (totalCounts && totalCounts > 1) {
      console.warn(
        `⚠️ Attention: ${totalCounts} comptages trouvés pour ${selectedDate.value}. Utilisation du plus récent.`
      );
      toast.add({
        title: "Attention",
        description: `${totalCounts} comptages trouvés pour cette date. Utilisation du plus récent.`,
        icon: "i-heroicons-exclamation-triangle",
        color: "orange",
      });
    }

    selectedDateCashCount.value =
      countData && countData.length > 0 ? countData[0] : null;

    // Si un comptage existe, pré-remplir le formulaire
    if (selectedDateCashCount.value) {
      cashCountInfo.expectedAmount =
        selectedDateCashCount.value.expected_amount || 0;
      cashCountInfo.actualAmount =
        selectedDateCashCount.value.actual_amount || 0;
      cashCountInfo.difference = selectedDateCashCount.value.difference || 0;
      cashCountInfo.note = selectedDateCashCount.value.note || "";

      // Pré-remplir les billets et pièces
      if (selectedDateCashCount.value.bills_detail) {
        Object.entries(selectedDateCashCount.value.bills_detail).forEach(
          ([denom, count]) => {
            if (cashCount[denom] !== undefined) {
              cashCount[denom] = count || 0;
            }
          }
        );
      }

      if (selectedDateCashCount.value.coins_detail) {
        Object.entries(selectedDateCashCount.value.coins_detail).forEach(
          ([denom, count]) => {
            if (cashCount[denom] !== undefined) {
              cashCount[denom] = count || 0;
            }
          }
        );
      }
    }
  } catch (err) {
    console.error(
      "Erreur lors du chargement du comptage de la date sélectionnée:",
      err
    );
  }
};

watch(() => magasinStore.magasinId);

// Réinitialiser le formulaire de nouvelle vente (non utilisé mais conservé)
const _resetNewSaleForm = () => {
  newSale.client_id = "";
  newSale.items = [];
  newSale.paymentMethod = "especes";
  newSale.note = "";
};

// Ouvrir le modal de paiement
const openPaymentModal = (invoice) => {
  selectedInvoice.value = invoice;
  payment.amount = invoice.total;
  payment.method = "especes";
  payment.reference = "";
  payment.note = "";
  showPaymentModal.value = true;
};

// Enregistrer un paiement
const processPayment = async () => {
  if (!selectedInvoice.value || payment.amount <= 0) {
    toast.add({
      title: "Erreur",
      description: "Montant invalide",
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
    return;
  }

  try {
    // Utiliser la date sélectionnée ou la date actuelle si on est au jour actuel
    const paymentDate =
      selectedDate.value === new Date().toISOString().split("T")[0]
        ? new Date().toISOString() // Heure actuelle si c'est aujourd'hui
        : new Date(
            selectedDate.value + "T" + new Date().toTimeString().split(" ")[0]
          ).toISOString(); // Date sélectionnée avec heure actuelle

    // Créer l'entrée de paiement
    const { error: paymentError } = await supabase.from("payments").insert({
      invoice_id: selectedInvoice.value.id,
      amount: payment.amount,
      payment_method: payment.method,
      payment_date: paymentDate,
      reference: payment.reference || null,
      note: payment.note || null,
      magasinStore: magasinStore.magasinId,
    });

    if (paymentError) throw paymentError;

    // Mettre à jour le statut de la facture
    const { error: invoiceError } = await supabase
      .from("invoices")
      .update({ status: "paid" })
      .eq("id", selectedInvoice.value.id);

    if (invoiceError) throw invoiceError;

    toast.add({
      title: "Paiement enregistré",
      description: `Paiement de ${formatCurrency(payment.amount)} enregistré`,
      icon: "i-heroicons-check-circle",
      color: "green",
    });

    showPaymentModal.value = false;
    selectedInvoice.value = null;
    loadDailySales();
  } catch (err) {
    toast.add({
      title: "Erreur",
      description: err.message || "Impossible d'enregistrer le paiement",
      icon: "i-heroicons-x-circle",
      color: "red",
    });
  }
};

// Filtrer les produits (non utilisé mais conservé)
const _filterProducts = (query) => {
  if (!query) {
    availableProducts.value = products.value;
    return;
  }

  availableProducts.value = products.value.filter(
    (product) =>
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      (product.reference &&
        product.reference.toLowerCase().includes(query.toLowerCase()))
  );
};

// Ouvrir le modal de sortie d'argent
const openCashOutModal = () => {
  // Vérifier si un comptage a été fait pour cette date
  if (hasCountForDate.value) {
    toast.add({
      title: "Action bloquée",
      description:
        "Impossible de faire des sorties après le comptage journalier",
      icon: "i-heroicons-lock-closed",
      color: "orange",
    });
    return;
  }

  cashOut.amount = 0;
  cashOut.reason = "";
  cashOut.recipient = "";
  cashOut.note = "";
  showCashOutModal.value = true;
};

// Traiter une sortie d'argent
const processCashOut = async () => {
  if (cashOut.amount <= 0 || !cashOut.reason.trim()) {
    toast.add({
      title: "Erreur",
      description: "Montant et raison obligatoires",
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
    return;
  }

  try {
    const success = await cashManagement.processCashOut({
      amount: cashOut.amount,
      reason: cashOut.reason,
      note: `${
        cashOut.recipient ? `Destinataire: ${cashOut.recipient}. ` : ""
      }${cashOut.note || ""}`,
      magasin_id: magasinStore.magasinId,
    });

    if (success) {
      showCashOutModal.value = false;
      // Réinitialiser le formulaire
      cashOut.amount = 0;
      cashOut.reason = "";
      cashOut.recipient = "";
      cashOut.note = "";
      // Recharger les données
      await loadDailySales();
    }
  } catch (err) {
    console.error("Erreur lors de l'enregistrement de la sortie:", err);
    toast.add({
      title: "Erreur",
      description: "Impossible d'enregistrer la sortie d'argent",
      icon: "i-heroicons-x-circle",
      color: "red",
    });
  }
};

// Ouvrir le modal d'entrée d'argent
const openCashInModal = () => {
  // Vérifier si un comptage a été fait pour cette date
  if (hasCountForDate.value) {
    toast.add({
      title: "Action bloquée",
      description:
        "Impossible de faire des entrées après le comptage journalier",
      icon: "i-heroicons-lock-closed",
      color: "orange",
    });
    return;
  }

  cashIn.amount = 0;
  cashIn.source = "";
  cashIn.reason = "fond_de_caisse";
  cashIn.note = "";
  showCashInModal.value = true;
};

// Traiter une entrée d'argent
const processCashIn = async () => {
  if (cashIn.amount <= 0 || !cashIn.reason.trim()) {
    toast.add({
      title: "Erreur",
      description: "Montant et raison obligatoires",
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
    return;
  }

  try {
    const success = await cashManagement.processCashIn({
      amount: cashIn.amount,
      reason: cashIn.reason,
      note: `${cashIn.source ? `Source: ${cashIn.source}. ` : ""}${
        cashIn.note || ""
      }`,
      magasin_id: magasinStore.magasinId,
    });

    if (success) {
      showCashInModal.value = false;
      // Réinitialiser le formulaire
      cashIn.amount = 0;
      cashIn.reason = "";
      cashIn.source = "";
      cashIn.note = "";
      // Recharger les données
      await loadDailySales();
    }
  } catch (err) {
    console.error("Erreur lors de l'entrée d'argent:", err);
    toast.add({
      title: "Erreur",
      description: "Impossible d'enregistrer l'entrée",
      color: "red",
    });
  }
};

// Ouvrir le modal d'historique
const openHistoryModal = async () => {
  await loadCashHistory();
  showHistoryModal.value = true;
};

// Charger l'historique des vidages de caisse
const loadCashHistory = async () => {
  try {
    const period = historyFilter.value.period;
    let startDate, endDate;

    // Calculer les dates selon la période sélectionnée à partir de la date sélectionnée
    const selectedDateObj = new Date(selectedDate.value);
    const selectedDateStr = selectedDateObj.toISOString().split("T")[0];

    switch (period) {
      case "today":
        startDate = selectedDateStr;
        endDate = selectedDateStr;
        break;
      case "7days":
        startDate = new Date(
          selectedDateObj.getTime() - 6 * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .split("T")[0];
        endDate = selectedDateStr;
        break;
      case "30days":
        startDate = new Date(
          selectedDateObj.getTime() - 29 * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .split("T")[0];
        endDate = selectedDateStr;
        break;
      case "month":
        startDate = new Date(
          selectedDateObj.getFullYear(),
          selectedDateObj.getMonth(),
          1
        )
          .toISOString()
          .split("T")[0];
        endDate = selectedDateStr;
        break;
      case "custom":
        startDate = historyFilter.value.startDate;
        endDate = historyFilter.value.endDate;
        break;
      default:
        startDate = selectedDateStr;
        endDate = selectedDateStr;
    }

    // Initialiser l'historique
    cashHistory.value = {
      transactions: [],
      summary: {
        totalCashSales: 0,
        totalCashIn: 0,
        totalCashOut: 0,
        totalEmptied: 0,
      },
    };

    // Charger les comptages de caisse
    try {
      const { data: countsData, error: countsError } = await supabase
        .from("cash_counts")
        .select("*")
        .eq("magasin_id", magasinStore.magasinId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("created_at", { ascending: false });

      if (countsError) throw countsError;

      if (countsData) {
        countsData.forEach((count) => {
          cashHistory.value.transactions.push({
            id: count.id,
            type: "count",
            amount: count.actual_amount,
            date: count.created_at,
            note: `Comptage caisse - ${
              count.note || "Différence: " + formatCurrency(count.difference)
            }`,
            difference: count.difference,
            magasin_id: count.magasin_id,
          });
        });
      }
    } catch (error) {
      console.warn("Erreur lors du chargement des comptages:", error);
    }

    // Charger les transactions de caisse (entrées/sorties)
    try {
      const { data: transactions } = await supabase
        .from("cash_transactions")
        .select("*")
        .eq("magasin_id", magasinStore.magasinId)
        .gte("created_at", startDate + "T00:00:00")
        .lte("created_at", endDate + "T23:59:59")
        .order("created_at", { ascending: false });

      if (transactions) {
        transactions.forEach((transaction) => {
          cashHistory.value.transactions.push({
            id: transaction.id,
            type: transaction.type,
            amount: Math.abs(transaction.amount),
            date: transaction.created_at,
            note: transaction.note || transaction.reason,
            destination: transaction.recipient,
            magasin_id: transaction.magasin_id,
          });

          if (transaction.type === "in") {
            cashHistory.value.summary.totalCashIn += Math.abs(
              transaction.amount
            );
          } else if (transaction.type === "out") {
            cashHistory.value.summary.totalCashOut += Math.abs(
              transaction.amount
            );
          }
        });
      }
    } catch (error) {
      console.warn("Erreur lors du chargement des transactions:", error);
    }

    // Charger les ventes en espèces
    try {
      const { data: sales } = await supabase
        .from("payments")
        .select("*")
        .eq("payment_method", "especes")
        .eq("magasin_id", magasinStore.magasinId)
        .gte("payment_date", startDate + "T00:00:00")
        .lte("payment_date", endDate + "T23:59:59")
        .order("payment_date", { ascending: false });

      if (sales) {
        sales.forEach((sale) => {
          cashHistory.value.transactions.push({
            id: sale.id,
            type: "sale",
            amount: sale.amount,
            date: sale.payment_date,
            note: `Vente #${sale.invoice_id} - ${
              sale.note || "Paiement espèces"
            }`,
            magasin_id: sale.magasin_id,
          });
          cashHistory.value.summary.totalCashSales += sale.amount;
        });
      }
    } catch (error) {
      console.warn("Erreur lors du chargement des ventes:", error);
    }

    // Charger les vidages de caisse si la table existe
    try {
      const { data: historyData, error: historyError } = await supabase
        .from("cash_emptying")
        .select("*")
        .eq("magasin_id", magasinStore.magasinId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("created_at", { ascending: false });

      if (historyError) throw historyError;

      if (historyData) {
        historyData.forEach((empty) => {
          cashHistory.value.transactions.push({
            id: empty.id,
            type: "empty",
            amount: empty.amount,
            date: empty.created_at,
            note: `Vidage: ${empty.reason || "Vidage de caisse"} - ${
              empty.note || ""
            }`,
            destination: empty.destination,
            magasin_id: empty.magasin_id,
          });
          cashHistory.value.summary.totalEmptied += empty.amount;
        });
      }
    } catch (error) {
      console.warn("Table cash_emptying non disponible:", error);
    }

    // Trier les transactions par date (plus récent en premier)
    cashHistory.value.transactions.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    // Ajouter des données de démonstration si aucune transaction réelle n'est trouvée
    if (cashHistory.value.transactions.length === 0 && period === "today") {
      // Utiliser la date sélectionnée pour la démonstration
      const selectedDateForDemo = new Date(selectedDate.value + "T12:00:00");

      cashHistory.value.transactions = [
        {
          id: "demo-1",
          type: "count",
          amount: cashCountTotal.value || 150,
          date: selectedDateForDemo.toISOString(),
          note: `Comptage de caisse du ${formatDate(selectedDate.value)}`,
          difference: cashCountDifference.value || 0,
        },
      ];
    }
  } catch (error) {
    console.error("Erreur lors du chargement de l'historique:", error);
    toast.add({
      title: "Erreur",
      description: "Impossible de charger l'historique",
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
  }
};

// Fonctions d'aide pour l'affichage de l'historique
const getTransactionIcon = (type) => {
  switch (type) {
    case "sale":
      return "i-heroicons-currency-euro";
    case "in":
    case "cash_in":
      return "i-heroicons-arrow-up-circle";
    case "out":
    case "cash_out":
      return "i-heroicons-arrow-down-circle";
    case "empty":
      return "i-heroicons-archive-box";
    case "count":
      return "i-heroicons-calculator";
    default:
      return "i-heroicons-question-mark-circle";
  }
};

const getTransactionColor = (type) => {
  switch (type) {
    case "sale":
      return "text-blue-500";
    case "in":
    case "cash_in":
      return "text-green-500";
    case "out":
    case "cash_out":
      return "text-red-500";
    case "empty":
      return "text-amber-500";
    case "count":
      return "text-purple-500";
    default:
      return "text-gray-500";
  }
};

const getTransactionTitle = (transaction) => {
  switch (transaction.type) {
    case "sale":
      return transaction.note || "Vente en espèces";
    case "in":
    case "cash_in":
      return `Entrée: ${transaction.note || "Ajout caisse"}`;
    case "out":
    case "cash_out":
      return `Sortie: ${transaction.note || "Retrait caisse"}`;
    case "empty":
      return `Vidage: ${
        transaction.reason || transaction.note || "Vidage de caisse"
      }`;
    case "count":
      return `Comptage: ${transaction.note || "Comptage de caisse"}`;
    default:
      return "Transaction";
  }
};

const getTransactionAmountClass = (type) => {
  switch (type) {
    case "sale":
    case "in":
    case "cash_in":
      return "text-green-600";
    case "out":
    case "cash_out":
    case "empty":
      return "text-red-600";
    case "count":
      return "text-purple-600";
    default:
      return "text-gray-600";
  }
};

const getTransactionAmountSign = (type) => {
  switch (type) {
    case "sale":
    case "in":
    case "cash_in":
      return "+";
    case "out":
    case "cash_out":
    case "empty":
      return "-";
    case "count":
      return "="; // Pour indiquer que c'est un comptage
    default:
      return "";
  }
};

// Formater la date et l'heure pour l'affichage
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

// Ouvrir le modal de comptage de caisse
const openCashCountModal = () => {
  // Si un comptage existe déjà, charger ses données pour modification
  if (selectedDateCashCount.value) {
    // Charger les données existantes
    cashCountInfo.expectedAmount =
      selectedDateCashCount.value.expected_amount || 0;
    cashCountInfo.actualAmount = selectedDateCashCount.value.actual_amount || 0;
    cashCountInfo.difference = selectedDateCashCount.value.difference || 0;
    cashCountInfo.note = selectedDateCashCount.value.note || "";

    // Réinitialiser d'abord tous les compteurs
    Object.keys(cashCount).forEach((denom) => {
      cashCount[denom] = 0;
    });

    // Charger les billets et pièces existants
    if (selectedDateCashCount.value.bills_detail) {
      Object.entries(selectedDateCashCount.value.bills_detail).forEach(
        ([denom, count]) => {
          if (cashCount[denom] !== undefined) {
            cashCount[denom] = count || 0;
          }
        }
      );
    }

    if (selectedDateCashCount.value.coins_detail) {
      Object.entries(selectedDateCashCount.value.coins_detail).forEach(
        ([denom, count]) => {
          if (cashCount[denom] !== undefined) {
            cashCount[denom] = count || 0;
          }
        }
      );
    }
  } else {
    // Nouveau comptage : réinitialiser tous les compteurs
    Object.keys(cashCount).forEach((denom) => {
      cashCount[denom] = 0;
    });

    // Initialiser les montants
    cashCountInfo.expectedAmount = todayStats.value.expectedCash;
    cashCountInfo.actualAmount = 0;
    cashCountInfo.difference = 0;
    cashCountInfo.note = "";
  }

  showCashCountModal.value = true;
};

// Calculer le total du comptage
const calculateTotal = () => {
  let total = 0;
  Object.entries(cashCount).forEach(([denomination, count]) => {
    total += parseFloat(denomination) * parseInt(count || 0);
  });
  cashCountInfo.actualAmount = total;
  cashCountInfo.difference = total - cashCountInfo.expectedAmount;
  return total;
};

// Enregistrer le comptage de caisse
const saveCashCount = async () => {
  try {
    // Calculer les billets et pièces séparés
    const bills = {};
    const coins = {};

    Object.entries(cashCount).forEach(([denomination, count]) => {
      const denom = parseFloat(denomination);
      if (denom >= 5) {
        bills[denomination] = count || 0;
      } else {
        coins[denomination] = count || 0;
      }
    });

    let success;

    // Si un comptage existe déjà pour cette date, le mettre à jour

    if (selectedDateCashCount.value) {
      const { data, error: updateError } = await supabase
        .from("cash_counts")
        .update({
          expected_amount: cashCountInfo.expectedAmount,
          actual_amount: cashCountTotal.value,
          difference: cashCountDifference.value,
          bills_detail: bills,
          coins_detail: coins,
          note: cashCountInfo.note || "",
          updated_at: new Date().toISOString(),
          magasin_id: magasinStore.magasinId,
        })
        .eq("id", selectedDateCashCount.value.id)
        .eq("magasin_id", magasinStore.magasinId)
        .select()
        .single();

      if (updateError) throw updateError;
      success = data;
      selectedDateCashCount.value = data; // Mettre à jour la référence locale

      toast.add({
        title: "Comptage mis à jour",
        description: `Comptage de ${formatCurrency(
          cashCountTotal.value
        )} mis à jour avec succès`,
        icon: "i-heroicons-check-circle",
        color: "green",
      });
    } else {
      // Nouveau comptage avec vérification stricte
      try {
        success = await cashManagement.saveCashCount({
          expectedAmount: cashCountInfo.expectedAmount,
          actualAmount: cashCountTotal.value,
          difference: cashCountDifference.value,
          bills: bills,
          coins: coins,
          note: cashCountInfo.note || "",
          date: selectedDate.value, // Passer la date sélectionnée
          magasin_id: magasinStore.magasinId,
        });

        toast.add({
          title: "Comptage enregistré",
          description: `Comptage de ${formatCurrency(
            cashCountTotal.value
          )} enregistré avec succès`,
          icon: "i-heroicons-check-circle",
          color: "green",
        });
      } catch (saveError) {
        // Si erreur de contrainte (comptage déjà existant), recharger et réessayer en mode update
        if (
          saveError.message?.includes("existe déjà") ||
          saveError.message?.includes("duplicate")
        ) {
          console.log(
            "Comptage détecté après tentative de création, rechargement..."
          );
          await loadSelectedDateCashCount();

          if (selectedDateCashCount.value) {
            // Réessayer en mode mise à jour
            const { data, error: retryError } = await supabase
              .from("cash_counts")
              .update({
                expected_amount: cashCountInfo.expectedAmount,
                actual_amount: cashCountTotal.value,
                difference: cashCountDifference.value,
                bills_detail: bills,
                coins_detail: coins,
                note: cashCountInfo.note || "",
                updated_at: new Date().toISOString(),
                magasin_id: magasinStore.magasinId,
              })
              .eq("id", selectedDateCashCount.value.id)
              .eq("magasin_id", magasinStore.magasinId)
              .select()
              .single();

            if (retryError) throw retryError;
            success = data;

            toast.add({
              title: "Comptage synchronisé",
              description: "Le comptage a été synchronisé et mis à jour",
              icon: "i-heroicons-arrow-path",
              color: "blue",
            });
          } else {
            throw new Error("Impossible de synchroniser le comptage");
          }
        } else {
          throw saveError;
        }
      }

      // Recharger le comptage de la date sélectionnée pour avoir la référence mise à jour
      await loadSelectedDateCashCount();
    }

    if (success) {
      showCashCountModal.value = false;
      // Recharger toutes les données
      await loadDailySales();
    }
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du comptage:", error);
    toast.add({
      title: "Erreur",
      description: error.message || "Impossible d'enregistrer le comptage",
      icon: "i-heroicons-x-circle",
      color: "red",
    });

    // Forcer le rechargement des données pour éviter les incohérences
    await loadSelectedDateCashCount();
  }
};

// Ouvrir le modal de résumé journalier
const openDailySummaryModal = () => {
  showDailySummaryModal.value = true;
};

// Exporter le rapport de caisse
const exportCashReport = () => {
  const report = {
    date: selectedDate.value,
    summary: dailySummary.value,
    sales: dailySales.value,
    timestamp: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rapport-caisse-${selectedDate.value}.json`;
  link.click();
  URL.revokeObjectURL(url);

  toast.add({
    title: "Rapport exporté",
    description: "Le rapport de caisse a été téléchargé",
    icon: "i-heroicons-document-arrow-down",
    color: "green",
  });
};

// Exporter l'historique de caisse
const exportCashHistory = () => {
  const report = {
    period: historyFilter.value.period,
    startDate: historyFilter.value.startDate,
    endDate: historyFilter.value.endDate,
    summary: cashHistory.value.summary,
    transactions: cashHistory.value.transactions,
    exportDate: new Date().toISOString(),
    totalTransactions: cashHistory.value.transactions.length,
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `historique-caisse-${historyFilter.value.period}-${
    new Date().toISOString().split("T")[0]
  }.json`;
  link.click();
  URL.revokeObjectURL(url);

  toast.add({
    title: "Historique exporté",
    description: "L'historique de caisse a été téléchargé",
    icon: "i-heroicons-document-arrow-down",
    color: "green",
  });
};

// Ouvrir le modal de remboursement
const openRefundModal = (sale) => {
  selectedSale.value = sale;
  refund.amount = sale.total;
  refund.reason = "";
  refund.method = "especes";
  showRefundModal.value = true;
};

// Traiter le remboursement
const processRefund = async () => {
  if (!selectedSale.value || refund.amount <= 0) {
    toast.add({
      title: "Erreur",
      description: "Montant invalide pour le remboursement",
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
    return;
  }

  try {
    // Créer une entrée de remboursement (vous pouvez créer une table refunds)
    toast.add({
      title: "Remboursement traité",
      description: `Remboursement de ${formatCurrency(refund.amount)} effectué`,
      icon: "i-heroicons-check-circle",
      color: "green",
    });

    showRefundModal.value = false;
    selectedSale.value = null;
    loadDailySales();
  } catch {
    toast.add({
      title: "Erreur",
      description: "Impossible de traiter le remboursement",
      icon: "i-heroicons-x-circle",
      color: "red",
    });
  }
};

// Imprimer un reçu
const printReceipt = (sale) => {
  selectedSale.value = sale;
  showReceiptModal.value = true;
};

// Générer le contenu du reçu
const generateReceiptContent = (sale) => {
  const itemsText =
    sale.invoice_items
      ?.map((item) => {
        const productName = item.is_external
          ? item.external_description || "Produit externe"
          : item.products_carreaux?.name || "Produit";

        const productRef = item.is_external
          ? item.external_reference || "EXT"
          : item.products_carreaux?.reference || "";

        const refText = productRef ? ` (${productRef})` : "";
        const externalTag = item.is_external ? " [EXTERNE]" : "";

        return `${productName}${refText}${externalTag} x${
          item.quantity
        } - ${formatCurrency(item.price * item.quantity)}`;
      })
      .join("\n") || "Aucun article";

  return `
REÇU DE CAISSE
================
Date: ${formatDate(sale.created_at)}
Heure: ${formatTime(sale.created_at)}
N° Facture: ${sale.reference}

Client: ${sale.clients?.name}
Email: ${sale.clients?.email}

Articles:
${itemsText}

TOTAL: ${formatCurrency(sale.total)}

Paiement: ${
    sale.payments
      ?.map(
        (p) =>
          `${getPaymentMethodInfo(p.payment_method).label} - ${formatCurrency(
            p.amount
          )}`
      )
      .join(", ") || "Aucun paiement"
  }

${
  sale.invoice_items?.some((item) => item.is_external)
    ? "* Facture contenant des produits externes\n"
    : ""
}Merci de votre visite !
================
  `.trim();
};

// Imprimer le reçu
const executeReceiptPrint = () => {
  if (!selectedSale.value) return;

  const content = generateReceiptContent(selectedSale.value);
  const printWindow = window.open("", "_blank");

  printWindow.document.write(`
    <html>
      <head>
        <title>Reçu de caisse</title>
        <style>
          body { font-family: monospace; font-size: 12px; margin: 20px; }
          .receipt { width: 300px; margin: 0 auto; }
          pre { white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <pre>${content}</pre>
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.print();
  printWindow.close();
  showReceiptModal.value = false;

  toast.add({
    title: "Reçu imprimé",
    description: "Le reçu a été envoyé à l'imprimante",
    icon: "i-heroicons-printer",
    color: "green",
  });
};

// Watcher pour recharger les données quand la date change
// Watcher pour recharger les données quand la date ou le magasin change
watch([selectedDate, () => magasinStore.magasinId], () => {
  loadBaseData();
  loadDailySales();
  // Recharger l'historique si le modal est ouvert
  if (showHistoryModal.value) {
    loadCashHistory();
  }
});

// Initialisation
onMounted(async () => {
  await loadBaseData();
  await loadDailySales();
});
</script>

<template>
  <div>
    <NotificationMenu :has-count-for-date="hasCountForDate" />
    <div class="container mx-auto px-4 py-2">
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
        <UButton label="Retour" to="/" />
      </div>

      <!-- Contenu normal -->
      <div v-else>
        <div
          class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4"
        >
          <div>
            <h1 class="text-3xl font-bold text-gray-800">Caisse</h1>
            <p class="text-gray-600 mt-1">Gestion des ventes journalières</p>
          </div>

          <div class="flex flex-col sm:flex-row gap-3">
            <!-- Sélecteur de date -->
            <UInput
              v-model="selectedDate"
              type="date"
              size="sm"
              icon="i-heroicons-calendar-days"
              class="w-full sm:w-auto"
            />

            <!-- Actions de caisse -->
            <div class="flex flex-wrap gap-2">
              <!-- Entrée d'argent -->
              <UButton
                icon="i-heroicons-arrow-up-circle"
                color="green"
                variant="outline"
                size="sm"
                :disabled="hasCountForDate"
                class="flex-1 sm:flex-none"
                @click="openCashInModal"
              >
                <span class="hidden sm:inline">Entrée</span>
              </UButton>

              <!-- Sortie d'argent -->
              <UButton
                icon="i-heroicons-arrow-down-circle"
                color="red"
                variant="outline"
                size="sm"
                :disabled="hasCountForDate"
                class="flex-1 sm:flex-none"
                @click="openCashOutModal"
              >
                <span class="hidden sm:inline">Sortie</span>
              </UButton>

              <!-- Historique -->
              <UButton
                icon="i-heroicons-clock"
                color="gray"
                variant="outline"
                size="sm"
                class="flex-1 sm:flex-none"
                @click="openHistoryModal"
              >
                <span class="hidden sm:inline">Historique</span>
              </UButton>

              <!-- Comptage de caisse -->
              <UButton
                icon="i-heroicons-calculator"
                color="orange"
                variant="outline"
                size="sm"
                class="flex-1 sm:flex-none"
                :disabled="hasCountForDate"
                @click="openCashCountModal"
              >
                <span class="hidden sm:inline">{{
                  hasCountForDate ? "Modifier Comptage" : "Comptage"
                }}</span>
              </UButton>

              <!-- Résumé journalier (Z) -->
              <UButton
                icon="i-heroicons-document-chart-bar"
                color="purple"
                variant="outline"
                size="sm"
                class="flex-1 sm:flex-none"
                @click="openDailySummaryModal"
              >
                <span class="hidden sm:inline">Rapport Z</span>
              </UButton>

              <!-- Export -->
              <UButton
                icon="i-heroicons-arrow-down-tray"
                color="gray"
                variant="outline"
                size="sm"
                class="flex-1 sm:flex-none"
                @click="exportCashReport"
              >
                <span class="hidden sm:inline">Exporter</span>
              </UButton>

              <!-- Actualiser -->
              <UButton
                :disabled="loading"
                icon="i-lucide-refresh-cw"
                :class="{ 'animate-spin': loading }"
                color="gray"
                variant="outline"
                size="sm"
                class="flex-1 sm:flex-none"
                @click="loadDailySales"
              />
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
        <div
          v-if="error"
          class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded"
        >
          <p>{{ error }}</p>
        </div>

        <div v-if="!loading && !error">
          <!-- Statistiques du jour -->
          <div
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4 lg:gap-6 mb-6 lg:mb-8"
          >
            <!-- Chiffre d'affaires -->
            <div
              class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 lg:p-6 rounded-lg shadow-lg"
            >
              <div class="flex items-center justify-between">
                <div class="min-w-0 flex-1">
                  <h3
                    class="text-blue-100 text-xs lg:text-sm font-medium truncate"
                  >
                    Chiffre d'Affaires
                  </h3>
                  <p class="text-xl lg:text-2xl font-bold truncate">
                    {{ formatCurrency(todayStats.totalSales) }}
                  </p>
                  <p class="text-blue-200 text-xs lg:text-sm truncate">
                    {{ todayStats.totalInvoices }} vente{{
                      todayStats.totalInvoices > 1 ? "s" : ""
                    }}
                  </p>
                </div>
                <UIcon
                  name="i-heroicons-currency-euro"
                  class="w-6 h-6 lg:w-8 lg:h-8 text-blue-200 flex-shrink-0"
                />
              </div>
            </div>

            <!-- Espèces Ventes -->
            <div
              class="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 lg:p-6 rounded-lg shadow-lg"
            >
              <div class="flex items-center justify-between">
                <div class="min-w-0 flex-1">
                  <h3
                    class="text-green-100 text-xs lg:text-sm font-medium truncate"
                  >
                    Espèces Ventes
                  </h3>
                  <p class="text-xl lg:text-2xl font-bold truncate">
                    {{ formatCurrency(todayStats.totalCash) }}
                  </p>
                  <p class="text-green-200 text-xs lg:text-sm truncate">
                    {{
                      Math.round(
                        (todayStats.totalCash / todayStats.totalSales) * 100
                      ) || 0
                    }}% du CA
                  </p>
                </div>
                <UIcon
                  name="i-heroicons-banknotes"
                  class="w-6 h-6 lg:w-8 lg:h-8 text-green-200 flex-shrink-0"
                />
              </div>
            </div>

            <!-- Entrées d'Argent -->
            <div
              class="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-4 lg:p-6 rounded-lg shadow-lg"
            >
              <div class="flex items-center justify-between">
                <div class="min-w-0 flex-1">
                  <h3
                    class="text-emerald-100 text-xs lg:text-sm font-medium truncate"
                  >
                    Entrées
                  </h3>
                  <p class="text-xl lg:text-2xl font-bold truncate">
                    {{ formatCurrency(todayStats.cashIn) }}
                  </p>
                  <p class="text-emerald-200 text-xs lg:text-sm truncate">
                    Ajouts caisse
                  </p>
                </div>
                <UIcon
                  name="i-heroicons-arrow-up-circle"
                  class="w-6 h-6 lg:w-8 lg:h-8 text-emerald-200 flex-shrink-0"
                />
              </div>
            </div>

            <!-- Sorties d'Argent -->
            <div
              class="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 lg:p-6 rounded-lg shadow-lg"
            >
              <div class="flex items-center justify-between">
                <div class="min-w-0 flex-1">
                  <h3
                    class="text-red-100 text-xs lg:text-sm font-medium truncate"
                  >
                    Sorties
                  </h3>
                  <p class="text-xl lg:text-2xl font-bold truncate">
                    {{ formatCurrency(todayStats.cashOut) }}
                  </p>
                  <p class="text-red-200 text-xs lg:text-sm truncate">
                    Retraits caisse
                  </p>
                </div>
                <UIcon
                  name="i-heroicons-arrow-down-circle"
                  class="w-6 h-6 lg:w-8 lg:h-8 text-red-200 flex-shrink-0"
                />
              </div>
            </div>

            <!-- Argent Théorique en Caisse -->
            <div
              class="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 lg:p-6 rounded-lg shadow-lg relative"
            >
              <!-- Indicateur de comptage fait -->
              <div
                v-if="hasCountForDate"
                class="absolute top-1 right-1 lg:top-2 lg:right-2 bg-green-400 text-green-800 px-1 lg:px-2 py-1 rounded-full text-xs font-medium"
              >
                ✓ Compté
              </div>

              <div class="flex items-center justify-between">
                <div class="min-w-0 flex-1 pr-2">
                  <h3
                    class="text-purple-100 text-xs lg:text-sm font-medium truncate"
                  >
                    {{
                      hasCountForDate ? "Caisse Comptée" : "Caisse Théorique"
                    }}
                  </h3>
                  <p class="text-xl lg:text-2xl font-bold truncate">
                    {{
                      hasCountForDate && selectedDateCashCount
                        ? formatCurrency(selectedDateCashCount.actual_amount)
                        : formatCurrency(todayStats.expectedCash)
                    }}
                  </p>
                  <p class="text-purple-200 text-xs lg:text-sm truncate">
                    {{ hasCountForDate ? "Comptage effectué" : "À compter" }}
                  </p>
                </div>
                <UIcon
                  name="i-heroicons-calculator"
                  class="w-6 h-6 lg:w-8 lg:h-8 text-purple-200 flex-shrink-0"
                />
              </div>
            </div>
          </div>

          <!-- Encaissement -->
          <div class="bg-white rounded-lg shadow-md">
            <div class="p-6 border-b border-gray-200">
              <h3
                class="text-lg font-semibold text-gray-800 flex items-center gap-2"
              >
                <UIcon
                  name="i-heroicons-list-bullet"
                  class="w-5 h-5 text-blue-500"
                />
                Encaissement du {{ formatDate(selectedDate) }}
              </h3>
            </div>

            <div v-if="dailySales.length">
              <!-- Vue desktop/tablette -->
              <div class="hidden md:block overflow-x-auto">
                <table class="min-w-full">
                  <thead class="bg-gray-50">
                    <tr>
                      <th
                        class="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                      >
                        Heure
                      </th>
                      <th
                        class="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                      >
                        N° Facture
                      </th>
                      <th
                        class="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                      >
                        Client
                      </th>
                      <th
                        class="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                      >
                        Articles
                      </th>
                      <th
                        class="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"
                      >
                        Total
                      </th>
                      <th
                        class="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                      >
                        Statut
                      </th>
                      <th
                        class="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                      >
                        Paiement
                      </th>
                      <th
                        class="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr
                      v-for="sale in dailySales"
                      :key="sale.id"
                      class="hover:bg-gray-50"
                    >
                      <td class="px-4 lg:px-6 py-4 text-sm text-gray-500">
                        {{ formatTime(sale.created_at) }}
                      </td>
                      <td
                        class="px-4 lg:px-6 py-4 text-sm font-medium text-gray-900"
                      >
                        #{{ sale.reference || sale.id }}
                      </td>
                      <td class="px-4 lg:px-6 py-4 text-sm text-gray-500">
                        <div>
                          <p class="font-medium">{{ sale.clients?.name }}</p>
                          <p
                            class="text-xs text-gray-400 flex items-center gap-1"
                          >
                            {{ sale.clients?.email }}
                            <UBadge
                              v-if="
                                sale.is_external ||
                                sale.invoice_items?.some(
                                  (item) => item.is_external
                                )
                              "
                              color="purple"
                              variant="soft"
                              size="xs"
                            >
                              Prod. externes
                            </UBadge>
                          </p>
                        </div>
                      </td>
                      <td
                        class="px-4 lg:px-6 py-4 text-sm text-center text-gray-500"
                      >
                        <div class="flex items-center justify-center gap-1">
                          <span>{{ sale.invoice_items?.length || 0 }}</span>
                          <div
                            v-if="
                              sale.invoice_items?.some(
                                (item) => item.is_external
                              )
                            "
                            class="flex flex-col"
                          >
                            <span class="text-xs text-purple-600">
                              ({{
                                sale.invoice_items?.filter(
                                  (item) => item.is_external
                                ).length
                              }}
                              ext.)
                            </span>
                          </div>
                        </div>
                      </td>
                      <td
                        class="px-4 lg:px-6 py-4 text-sm text-right font-semibold text-gray-900"
                      >
                        {{ formatCurrency(sale.total) }}
                      </td>
                      <td class="px-4 lg:px-6 py-4 text-center">
                        <UBadge
                          :color="
                            sale.status === 'paid'
                              ? 'green'
                              : sale.status === 'pending'
                              ? 'orange'
                              : 'red'
                          "
                          variant="soft"
                          size="xs"
                        >
                          {{
                            sale.status === "paid"
                              ? "Payé"
                              : sale.status === "pending"
                              ? "En attente"
                              : "Brouillon"
                          }}
                        </UBadge>
                      </td>
                      <td class="px-4 lg:px-6 py-4 text-center">
                        <div
                          v-if="
                            getPaymentsForSelectedDate(sale.payments).length
                          "
                          class="flex flex-col gap-1"
                        >
                          <div
                            v-for="salePayment in getPaymentsForSelectedDate(
                              sale.payments
                            )"
                            :key="salePayment.id"
                            class="flex items-center justify-center gap-1"
                          >
                            <UIcon
                              :name="
                                getPaymentMethodInfo(salePayment.payment_method)
                                  .icon
                              "
                              class="w-3 h-3"
                              :class="`text-${
                                getPaymentMethodInfo(salePayment.payment_method)
                                  .color
                              }-500`"
                            />
                            <span class="text-xs">{{
                              formatCurrency(salePayment.amount)
                            }}</span>
                          </div>
                        </div>
                        <span
                          v-else
                          class="text-xs"
                          :class="{
                            'text-gray-400':
                              getPaymentStatusMessage(sale) ===
                              `Aucun paiement le ${formatDate(selectedDate)}`,
                            'text-orange-500':
                              getPaymentStatusMessage(sale) ===
                              'Facture non payée',
                          }"
                        >
                          {{ getPaymentStatusMessage(sale) }}
                        </span>
                      </td>
                      <td class="px-4 lg:px-6 py-4 text-center">
                        <div class="flex items-center justify-center gap-1">
                          <UButton
                            v-if="sale.status !== 'paid'"
                            size="xs"
                            color="green"
                            variant="soft"
                            icon="i-heroicons-currency-euro"
                            @click="openPaymentModal(sale)"
                          />
                          <UButton
                            size="xs"
                            color="blue"
                            variant="soft"
                            icon="i-heroicons-printer"
                            @click="printReceipt(sale)"
                          />
                          <UButton
                            v-if="sale.status === 'paid'"
                            size="xs"
                            color="red"
                            variant="soft"
                            icon="i-heroicons-arrow-uturn-left"
                            @click="openRefundModal(sale)"
                          />
                          <NuxtLink
                            :to="`/facture/${sale.id}`"
                            class="inline-flex"
                          >
                            <UButton
                              size="xs"
                              color="gray"
                              variant="soft"
                              icon="i-heroicons-eye"
                            />
                          </NuxtLink>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Vue mobile -->
              <div class="md:hidden space-y-4">
                <div
                  v-for="sale in dailySales"
                  :key="sale.id"
                  class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                >
                  <div class="flex items-start justify-between mb-3">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-sm font-medium text-gray-900">
                          #{{ sale.reference || sale.id }}
                        </span>
                        <UBadge
                          :color="
                            sale.status === 'paid'
                              ? 'green'
                              : sale.status === 'pending'
                              ? 'orange'
                              : 'red'
                          "
                          variant="soft"
                          size="xs"
                        >
                          {{
                            sale.status === "paid"
                              ? "Payé"
                              : sale.status === "pending"
                              ? "En attente"
                              : "Brouillon"
                          }}
                        </UBadge>
                      </div>
                      <p class="text-sm text-gray-600">
                        {{ sale.clients?.name }}
                      </p>
                      <p class="text-xs text-gray-400">
                        {{ formatTime(sale.created_at) }}
                      </p>
                    </div>
                    <div class="text-right">
                      <p class="text-lg font-semibold text-gray-900">
                        {{ formatCurrency(sale.total) }}
                      </p>
                      <p class="text-xs text-gray-500">
                        {{ sale.invoice_items?.length || 0 }} article(s)
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <div
                        v-if="getPaymentsForSelectedDate(sale.payments).length"
                        class="flex flex-wrap gap-1"
                      >
                        <div
                          v-for="salePayment in getPaymentsForSelectedDate(
                            sale.payments
                          )"
                          :key="salePayment.id"
                          class="flex items-center gap-1"
                        >
                          <UIcon
                            :name="
                              getPaymentMethodInfo(salePayment.payment_method)
                                .icon
                            "
                            class="w-3 h-3"
                            :class="`text-${
                              getPaymentMethodInfo(salePayment.payment_method)
                                .color
                            }-500`"
                          />
                          <span class="text-xs text-gray-600">{{
                            formatCurrency(salePayment.amount)
                          }}</span>
                        </div>
                      </div>
                      <span
                        v-else
                        class="text-xs"
                        :class="{
                          'text-gray-400':
                            getPaymentStatusMessage(sale) ===
                            `Aucun paiement le ${formatDate(selectedDate)}`,
                          'text-orange-500':
                            getPaymentStatusMessage(sale) ===
                            'Facture non payée',
                        }"
                      >
                        {{ getPaymentStatusMessage(sale) }}
                      </span>
                    </div>

                    <div class="flex items-center gap-1">
                      <UButton
                        v-if="sale.status !== 'paid'"
                        size="xs"
                        color="green"
                        variant="soft"
                        icon="i-heroicons-currency-euro"
                        @click="openPaymentModal(sale)"
                      />
                      <UButton
                        size="xs"
                        color="blue"
                        variant="soft"
                        icon="i-heroicons-printer"
                        @click="printReceipt(sale)"
                      />
                      <UButton
                        v-if="sale.status === 'paid'"
                        size="xs"
                        color="red"
                        variant="soft"
                        icon="i-heroicons-arrow-uturn-left"
                        @click="openRefundModal(sale)"
                      />
                      <NuxtLink :to="`/facture/${sale.id}`" class="inline-flex">
                        <UButton
                          size="xs"
                          color="gray"
                          variant="soft"
                          icon="i-heroicons-eye"
                        />
                      </NuxtLink>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="p-8 text-center text-gray-500">
              <UIcon
                name="i-heroicons-shopping-cart"
                class="w-12 h-12 mx-auto mb-4 text-gray-300"
              />
              <p class="text-lg">Aucune vente pour cette date</p>
              <p class="text-sm">
                Consultez les autres dates ou vérifiez les données
              </p>
            </div>
          </div>
        </div>

        <!-- Modal Paiement -->
        <UModal
          v-model:open="showPaymentModal"
          title="Enregistrer un paiement"
          :ui="{ wrapper: 'sm:max-w-md w-full mx-2 sm:mx-auto' }"
        >
          <template #body>
            <div v-if="selectedInvoice" class="space-y-4">
              <!-- Info facture -->
              <div class="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <p class="text-sm text-gray-600">
                  Facture:
                  <span class="font-medium"
                    >#{{ selectedInvoice.reference }}</span
                  >
                </p>
                <p class="text-sm text-gray-600">
                  Client:
                  <span class="font-medium">{{
                    selectedInvoice.clients?.name
                  }}</span>
                </p>
                <p class="text-lg font-semibold">
                  Total: {{ formatCurrency(selectedInvoice.total) }}
                </p>
              </div>

              <!-- Date de paiement -->
              <div class="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div class="flex items-center gap-2">
                  <Icon
                    name="i-heroicons-calendar-days"
                    class="w-4 h-4 text-blue-600"
                  />
                  <span class="text-sm font-medium text-blue-800">
                    Date de paiement : {{ formatDate(selectedDate) }}
                  </span>
                </div>
                <p class="text-xs text-blue-600 mt-1">
                  Le paiement sera enregistré pour cette date
                </p>
              </div>

              <!-- Montant -->
              <UInput
                v-model.number="payment.amount"
                type="number"
                step="0.01"
                min="0"
                :max="selectedInvoice.total"
                label="Montant"
                placeholder="0.00"
              />

              <!-- Méthode de paiement -->
              <div>
                <label class="block text-sm font-medium mb-2"
                  >Méthode de paiement</label
                >
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    v-for="method in paymentMethods"
                    :key="method.value"
                    :class="[
                      'p-2 border rounded-lg text-sm flex items-center justify-center gap-2 transition-colors',
                      payment.method === method.value
                        ? 'border-' +
                          method.color +
                          '-500 bg-' +
                          method.color +
                          '-50 text-' +
                          method.color +
                          '-700'
                        : 'border-gray-200 hover:border-gray-300',
                    ]"
                    @click="payment.method = method.value"
                  >
                    <UIcon :name="method.icon" class="w-4 h-4" />
                    {{ method.label }}
                  </button>
                </div>
              </div>

              <!-- Référence -->
              <UInput
                v-model="payment.reference"
                label="Référence (optionnel)"
                placeholder="N° de transaction, chèque..."
              />

              <!-- Note -->
              <UTextarea
                v-model="payment.note"
                label="Note (optionnel)"
                placeholder="Commentaire sur le paiement..."
                rows="2"
              />
            </div>
          </template>

          <template #footer="{ close }">
            <div class="flex flex-col sm:flex-row justify-end gap-3">
              <UButton
                color="gray"
                variant="outline"
                class="w-full sm:w-auto"
                @click="close"
              >
                Annuler
              </UButton>
              <UButton
                :disabled="payment.amount <= 0"
                class="w-full sm:w-auto"
                @click="processPayment"
              >
                Enregistrer le paiement
              </UButton>
            </div>
          </template>
        </UModal>

        <!-- Modal Comptage de Caisse -->
        <UModal
          v-model:open="showCashCountModal"
          title="Comptage de Caisse"
          :ui="{ wrapper: 'sm:max-w-4xl w-full mx-2 sm:mx-auto' }"
        >
          <template #body>
            <div class="space-y-6">
              <!-- Montants attendus -->
              <div class="bg-blue-50 p-3 sm:p-4 rounded-lg">
                <h4 class="font-medium text-blue-900 mb-2">
                  Montants théoriques
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span class="text-blue-700">Solde d'ouverture:</span>
                    <span class="font-semibold ml-2">{{
                      formatCurrency(todayStats.openingBalance)
                    }}</span>
                  </div>
                  <div>
                    <span class="text-blue-700">Ventes espèces:</span>
                    <span class="font-semibold ml-2">{{
                      formatCurrency(todayStats.totalCash)
                    }}</span>
                  </div>
                  <div>
                    <span class="text-blue-700">Entrées d'argent:</span>
                    <span class="font-semibold ml-2">{{
                      formatCurrency(todayStats.cashIn)
                    }}</span>
                  </div>
                  <div>
                    <span class="text-blue-700">Sorties d'argent:</span>
                    <span class="font-semibold ml-2 text-red-600"
                      >-{{ formatCurrency(todayStats.cashOut) }}</span
                    >
                  </div>
                </div>
                <div class="mt-3 pt-3 border-t border-blue-200">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span class="text-blue-700">Espèces théoriques:</span>
                      <span class="font-semibold ml-2">{{
                        formatCurrency(cashCountInfo.expectedAmount)
                      }}</span>
                    </div>
                    <div>
                      <span class="text-blue-700">Montant compté:</span>
                      <span class="font-semibold ml-2">{{
                        formatCurrency(cashCountTotal)
                      }}</span>
                    </div>
                  </div>
                  <div class="mt-2 pt-2 border-t border-blue-200">
                    <span class="text-blue-700">Différence:</span>
                    <span
                      class="font-semibold ml-2"
                      :class="
                        cashCountDifference === 0
                          ? 'text-green-600'
                          : cashCountDifference > 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      "
                    >
                      {{ formatCurrency(cashCountDifference) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Détail par billet/pièce -->
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Billets -->
                <div>
                  <h4 class="font-medium text-gray-900 mb-4">Billets</h4>
                  <div class="space-y-3">
                    <div
                      v-for="denomination in [500, 200, 100, 50, 20, 10, 5]"
                      :key="denomination"
                      class="grid grid-cols-3 gap-2 sm:gap-3 items-center"
                    >
                      <div
                        class="bg-green-100 px-2 sm:px-3 py-2 rounded text-center"
                      >
                        <span class="font-medium text-green-800 text-sm"
                          >{{ denomination
                          }}{{ companySettings?.currency }}</span
                        >
                      </div>
                      <UInput
                        v-model.number="cashCount[denomination]"
                        type="number"
                        min="0"
                        placeholder="0"
                        size="sm"
                        class="text-center"
                        @input="calculateTotal"
                      />
                      <span class="text-right font-medium text-sm">
                        {{
                          formatCurrency(
                            denomination * (cashCount[denomination] || 0)
                          )
                        }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Pièces -->
                <div>
                  <h4 class="font-medium text-gray-900 mb-4">Pièces</h4>
                  <div class="space-y-3">
                    <div
                      v-for="denomination in [
                        2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01,
                      ]"
                      :key="denomination"
                      class="grid grid-cols-3 gap-2 sm:gap-3 items-center"
                    >
                      <div
                        class="bg-amber-100 px-2 sm:px-3 py-2 rounded text-center"
                      >
                        <span class="font-medium text-amber-800 text-sm">{{
                          formatCurrency(denomination)
                        }}</span>
                      </div>
                      <UInput
                        v-model.number="cashCount[denomination]"
                        type="number"
                        min="0"
                        placeholder="0"
                        size="sm"
                        class="text-center"
                        @input="calculateTotal"
                      />
                      <span class="text-right font-medium text-sm">
                        {{
                          formatCurrency(
                            denomination * (cashCount[denomination] || 0)
                          )
                        }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Résumé du comptage -->
              <div class="border-t pt-6">
                <div class="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div class="text-center">
                      <div class="text-gray-600">Théorique</div>
                      <div class="text-xl font-bold text-blue-600">
                        {{ formatCurrency(cashCountInfo.expectedAmount) }}
                      </div>
                    </div>
                    <div class="text-center">
                      <div class="text-gray-600">Compté</div>
                      <div class="text-xl font-bold text-green-600">
                        {{ formatCurrency(cashCountTotal) }}
                      </div>
                    </div>
                    <div class="text-center">
                      <div class="text-gray-600">Écart</div>
                      <div
                        class="text-xl font-bold"
                        :class="{
                          'text-green-600': cashCountDifference >= 0,
                          'text-red-600': cashCountDifference < 0,
                        }"
                      >
                        {{ formatCurrency(cashCountDifference) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Note -->
              <UTextarea
                v-model="cashCountInfo.note"
                label="Note (optionnel)"
                placeholder="Commentaire sur le comptage..."
                rows="3"
              />
            </div>
          </template>

          <template #footer="{ close }">
            <div class="flex flex-col sm:flex-row justify-end gap-3">
              <UButton
                color="gray"
                variant="outline"
                class="w-full sm:w-auto"
                @click="close"
              >
                Annuler
              </UButton>
              <UButton
                :color="cashCountDifference === 0 ? 'green' : 'orange'"
                class="w-full sm:w-auto"
                @click="saveCashCount"
              >
                Enregistrer le comptage
              </UButton>
            </div>
          </template>
        </UModal>

        <!-- Modal Résumé Journalier (Z) -->
        <UModal
          v-model:open="showDailySummaryModal"
          title="Rapport Z - Résumé Journalier"
          :ui="{ wrapper: 'sm:max-w-lg w-full mx-2 sm:mx-auto' }"
        >
          <template #body>
            <div class="space-y-4">
              <!-- En-tête -->
              <div class="text-center border-b pb-4">
                <h4 class="font-bold">RAPPORT Z</h4>
                <p class="text-sm text-gray-600">
                  {{ formatDate(selectedDate) }}
                </p>
              </div>

              <!-- Résumé des ventes -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-sm">Nombre de transactions:</span>
                    <span class="font-semibold text-sm">{{
                      dailySummary.totalTransactions
                    }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm">Total des ventes:</span>
                    <span class="font-semibold text-sm">{{
                      formatCurrency(dailySummary.totalSales)
                    }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm">Panier moyen:</span>
                    <span class="font-semibold text-sm">{{
                      formatCurrency(dailySummary.averageTicket)
                    }}</span>
                  </div>
                </div>

                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-sm">Espèces:</span>
                    <span class="font-semibold text-sm">{{
                      formatCurrency(dailySummary.totalCash)
                    }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm">Cartes:</span>
                    <span class="font-semibold text-sm">{{
                      formatCurrency(dailySummary.totalCard)
                    }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm">TVA (20%):</span>
                    <span class="font-semibold text-sm">{{
                      formatCurrency(dailySummary.taxAmount)
                    }}</span>
                  </div>
                </div>
              </div>

              <!-- Total -->
              <div class="border-t pt-4">
                <div class="flex justify-between text-lg font-bold">
                  <span>TOTAL NET:</span>
                  <span>{{ formatCurrency(dailySummary.netSales) }}</span>
                </div>
              </div>
            </div>
          </template>

          <template #footer="{ close }">
            <div class="flex flex-col sm:flex-row justify-end gap-3">
              <UButton
                color="gray"
                variant="outline"
                class="w-full sm:w-auto"
                @click="close"
              >
                Fermer
              </UButton>
              <UButton
                icon="i-heroicons-printer"
                class="w-full sm:w-auto"
                @click="window.print()"
              >
                Imprimer
              </UButton>
            </div>
          </template>
        </UModal>

        <!-- Modal Remboursement -->
        <UModal
          v-model:open="showRefundModal"
          title="Remboursement"
          :ui="{ wrapper: 'sm:max-w-md w-full mx-2 sm:mx-auto' }"
        >
          <template #body>
            <div v-if="selectedSale" class="space-y-4">
              <!-- Info vente -->
              <div class="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <p class="text-sm text-gray-600">
                  Vente:
                  <span class="font-medium">#{{ selectedSale.reference }}</span>
                </p>
                <p class="text-sm text-gray-600">
                  Client:
                  <span class="font-medium">{{
                    selectedSale.clients?.name
                  }}</span>
                </p>
                <p class="text-lg font-semibold">
                  Total: {{ formatCurrency(selectedSale.total) }}
                </p>
              </div>

              <!-- Montant à rembourser -->
              <UInput
                v-model.number="refund.amount"
                type="number"
                step="0.01"
                min="0"
                :max="selectedSale.total"
                label="Montant à rembourser"
                placeholder="0.00"
              />

              <!-- Méthode de remboursement -->
              <div>
                <label class="block text-sm font-medium mb-2"
                  >Méthode de remboursement</label
                >
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    v-for="method in paymentMethods"
                    :key="method.value"
                    :class="[
                      'p-2 border rounded-lg text-sm flex items-center justify-center gap-2 transition-colors',
                      refund.method === method.value
                        ? 'border-' +
                          method.color +
                          '-500 bg-' +
                          method.color +
                          '-50 text-' +
                          method.color +
                          '-700'
                        : 'border-gray-200 hover:border-gray-300',
                    ]"
                    @click="refund.method = method.value"
                  >
                    <UIcon :name="method.icon" class="w-4 h-4" />
                    {{ method.label }}
                  </button>
                </div>
              </div>

              <!-- Raison -->
              <UTextarea
                v-model="refund.reason"
                label="Raison du remboursement"
                placeholder="Motif du remboursement..."
                rows="3"
                required
              />
            </div>
          </template>

          <template #footer="{ close }">
            <div class="flex flex-col sm:flex-row justify-end gap-3">
              <UButton
                color="gray"
                variant="outline"
                class="w-full sm:w-auto"
                @click="close"
              >
                Annuler
              </UButton>
              <UButton
                :disabled="refund.amount <= 0 || !refund.reason"
                color="red"
                class="w-full sm:w-auto"
                @click="processRefund"
              >
                Traiter le remboursement
              </UButton>
            </div>
          </template>
        </UModal>

        <!-- Modal Impression Reçu -->
        <UModal
          v-model:open="showReceiptModal"
          title="Impression de reçu"
          :ui="{ wrapper: 'sm:max-w-lg w-full mx-2 sm:mx-auto' }"
        >
          <template #body>
            <div v-if="selectedSale" class="space-y-4">
              <!-- Aperçu du reçu -->
              <div
                class="bg-gray-50 p-3 sm:p-4 rounded-lg font-mono text-xs sm:text-sm overflow-x-auto"
              >
                <pre class="whitespace-pre-wrap">{{
                  generateReceiptContent(selectedSale)
                }}</pre>
              </div>

              <!-- Options d'impression -->
              <div class="space-y-2">
                <UCheckbox
                  v-model="receipt.customerCopy"
                  label="Copie client"
                />
                <UCheckbox
                  v-model="receipt.merchantCopy"
                  label="Copie commerçant"
                />
              </div>
            </div>
          </template>

          <template #footer="{ close }">
            <div class="flex flex-col sm:flex-row justify-end gap-3">
              <UButton
                color="gray"
                variant="outline"
                class="w-full sm:w-auto"
                @click="close"
              >
                Annuler
              </UButton>
              <UButton
                icon="i-heroicons-printer"
                class="w-full sm:w-auto"
                @click="executeReceiptPrint"
              >
                Imprimer
              </UButton>
            </div>
          </template>
        </UModal>

        <!-- Modal Entrée d'Argent -->
        <UModal
          v-model:open="showCashInModal"
          title="Entrée d'argent en caisse"
          :ui="{ wrapper: 'sm:max-w-md w-full mx-2 sm:mx-auto' }"
        >
          <template #body>
            <div class="space-y-4">
              <!-- Montant -->
              <UInput
                v-model.number="cashIn.amount"
                type="number"
                step="0.01"
                min="0"
                label="Montant"
                placeholder="0.00"
                required
              />

              <!-- Raison -->
              <div>
                <label class="block text-sm font-medium mb-2">Raison</label>
                <select
                  v-model="cashIn.reason"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fond_de_caisse">Fond de caisse</option>
                  <option value="remboursement">Remboursement</option>
                  <option value="complement">Complément de caisse</option>
                  <option value="vente_externe">Vente externe</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <!-- Source -->
              <UInput
                v-model="cashIn.source"
                label="Source (optionnel)"
                placeholder="D'où vient cet argent..."
              />

              <!-- Note -->
              <UTextarea
                v-model="cashIn.note"
                label="Note (optionnel)"
                placeholder="Commentaire sur cette entrée..."
                rows="3"
              />
            </div>
          </template>

          <template #footer="{ close }">
            <div class="flex flex-col sm:flex-row justify-end gap-3">
              <UButton
                color="gray"
                variant="outline"
                class="w-full sm:w-auto"
                @click="close"
              >
                Annuler
              </UButton>
              <UButton
                :disabled="cashIn.amount <= 0 || !cashIn.reason"
                color="green"
                class="w-full sm:w-auto"
                @click="processCashIn"
              >
                Ajouter à la caisse
              </UButton>
            </div>
          </template>
        </UModal>

        <!-- Modal Sortie d'Argent -->
        <UModal
          v-model:open="showCashOutModal"
          title="Sortie d'argent de la caisse"
          :ui="{ wrapper: 'sm:max-w-md w-full mx-2 sm:mx-auto' }"
        >
          <template #body>
            <div class="space-y-4">
              <!-- Montant -->
              <UInput
                v-model.number="cashOut.amount"
                type="number"
                step="0.01"
                min="0"
                label="Montant"
                placeholder="0.00"
                required
              />

              <!-- Raison -->
              <UInput
                v-model="cashOut.reason"
                label="Raison"
                placeholder="Achat matériel, frais, remboursement..."
                required
              />

              <!-- Destinataire -->
              <UInput
                v-model="cashOut.recipient"
                label="Destinataire (optionnel)"
                placeholder="À qui ou pour quoi..."
              />

              <!-- Note -->
              <UTextarea
                v-model="cashOut.note"
                label="Note (optionnel)"
                placeholder="Commentaire sur cette sortie..."
                rows="3"
              />
            </div>
          </template>

          <template #footer="{ close }">
            <div class="flex flex-col sm:flex-row justify-end gap-3">
              <UButton
                color="gray"
                variant="outline"
                class="w-full sm:w-auto"
                @click="close"
              >
                Annuler
              </UButton>
              <UButton
                :disabled="cashOut.amount <= 0 || !cashOut.reason"
                color="red"
                class="w-full sm:w-auto"
                @click="processCashOut"
              >
                Retirer de la caisse
              </UButton>
            </div>
          </template>
        </UModal>

        <!-- Modal de Comptage -->
        <UModal
          v-model:open="showCashCountModal"
          title="Comptage de Caisse"
          :ui="{ wrapper: 'max-w-3xl' }"
        >
          <template #body>
            <div class="space-y-6">
              <!-- Détail par billet/pièce -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Billets -->
                <div>
                  <h4 class="font-medium text-gray-900 mb-4">Billets</h4>
                  <div class="space-y-3">
                    <div
                      v-for="denomination in [500, 200, 100, 50, 20, 10, 5]"
                      :key="denomination"
                      class="grid grid-cols-3 gap-3 items-center"
                    >
                      <div class="bg-green-100 px-3 py-2 rounded text-center">
                        <span class="font-medium text-green-800">{{
                          formatCurrency(denomination)
                        }}</span>
                      </div>
                      <UInput
                        v-model="cashCount[denomination]"
                        type="number"
                        min="0"
                        placeholder="0"
                        size="sm"
                        class="text-center"
                        @input="calculateTotal"
                      />
                      <span class="text-right font-medium">
                        {{
                          formatCurrency(
                            denomination * (cashCount[denomination] || 0)
                          )
                        }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Pièces -->
                <div>
                  <h4 class="font-medium text-gray-900 mb-4">Pièces</h4>
                  <div class="space-y-3">
                    <div
                      v-for="denomination in [
                        2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01,
                      ]"
                      :key="denomination"
                      class="grid grid-cols-3 gap-3 items-center"
                    >
                      <div class="bg-amber-100 px-3 py-2 rounded text-center">
                        <span class="font-medium text-amber-800">{{
                          formatCurrency(denomination)
                        }}</span>
                      </div>
                      <UInput
                        v-model="cashCount[denomination]"
                        type="number"
                        min="0"
                        placeholder="0"
                        size="sm"
                        class="text-center"
                        @input="calculateTotal"
                      />
                      <span class="text-right font-medium">
                        {{
                          formatCurrency(
                            denomination * (cashCount[denomination] || 0)
                          )
                        }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Résumé du comptage -->
              <div class="border-t pt-6">
                <div class="bg-gray-50 p-4 rounded-lg">
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div class="text-center">
                      <div class="text-gray-600">Théorique</div>
                      <div class="text-xl font-bold text-blue-600">
                        {{ formatCurrency(cashCountInfo.expectedAmount) }}
                      </div>
                    </div>
                    <div class="text-center">
                      <div class="text-gray-600">Compté</div>
                      <div class="text-xl font-bold text-green-600">
                        {{ formatCurrency(cashCountTotal) }}
                      </div>
                    </div>
                    <div class="text-center">
                      <div class="text-gray-600">Écart</div>
                      <div
                        class="text-xl font-bold"
                        :class="{
                          'text-green-600': cashCountDifference >= 0,
                          'text-red-600': cashCountDifference < 0,
                        }"
                      >
                        {{ formatCurrency(cashCountDifference) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template #footer="{ close }">
            <div class="flex justify-end gap-3">
              <UButton variant="outline" @click="close"> Annuler </UButton>
              <UButton @click="saveCashCount">
                Enregistrer le Comptage
              </UButton>
            </div>
          </template>
        </UModal>

        <!-- Modal de Vidage de Caisse -->
        <UModal
          v-model:open="showCashEmptyModal"
          title="Vidage de Caisse"
          description="Retirer de l'argent de la caisse"
          :ui="{ wrapper: 'max-w-xl' }"
        >
          <template #body>
            <div class="space-y-6">
              <div
                class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6"
              >
                <div class="flex items-center mb-2">
                  <UIcon
                    name="i-heroicons-information-circle"
                    class="w-5 h-5 text-amber-500 mr-2"
                  />
                  <span class="font-medium text-amber-800"
                    >Espèces à Vider</span
                  >
                </div>
                <div class="text-2xl font-bold text-amber-900">
                  {{ formatCurrency(todayStats.cumulatedCash) }}
                </div>
                <div class="text-sm text-amber-700 mt-1">
                  {{
                    todayStats.lastEmptyDate
                      ? `Cumulées depuis ${formatDate(
                          todayStats.lastEmptyDate
                        )}`
                      : "Cumulées depuis le début"
                  }}
                </div>
              </div>

              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Montant à retirer
                  </label>
                  <UInput
                    v-model="cashEmpty.amount"
                    type="number"
                    step="0.01"
                    min="0"
                    :max="todayStats.cumulatedCash"
                    placeholder="0.00"
                    class="w-full"
                  />
                  <div class="flex justify-between mt-1">
                    <UButton
                      size="xs"
                      variant="outline"
                      @click="cashEmpty.amount = todayStats.cumulatedCash"
                    >
                      Tout vider
                    </UButton>
                    <span class="text-sm text-gray-500">
                      Max: {{ formatCurrency(todayStats.cumulatedCash) }}
                    </span>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Motif du vidage
                  </label>
                  <USelect
                    v-model="cashEmpty.reason"
                    :options="[
                      { label: 'Dépôt en banque', value: 'bank_deposit' },
                      {
                        label: 'Sécurité - Trop d\'espèces',
                        value: 'security',
                      },
                      { label: 'Remise en coffre', value: 'safe_deposit' },
                      { label: 'Fin de journée', value: 'end_of_day' },
                      { label: 'Autre', value: 'other' },
                    ]"
                    option-attribute="label"
                    value-attribute="value"
                    placeholder="Sélectionner un motif"
                    class="w-full"
                  />
                </div>

                <div v-if="cashEmpty.reason === 'other'">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Motif personnalisé
                  </label>
                  <UInput
                    v-model="cashEmpty.customReason"
                    placeholder="Préciser le motif"
                    class="w-full"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Destination
                  </label>
                  <USelect
                    v-model="cashEmpty.destination"
                    :options="[
                      { label: 'Banque', value: 'bank' },
                      { label: 'Coffre-fort', value: 'safe' },
                      { label: 'Caisse centrale', value: 'central_cash' },
                      { label: 'Responsable', value: 'manager' },
                      { label: 'Autre', value: 'other' },
                    ]"
                    option-attribute="label"
                    value-attribute="value"
                    placeholder="Où va l'argent ?"
                    class="w-full"
                  />
                </div>

                <div v-if="cashEmpty.destination === 'other'">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Destination personnalisée
                  </label>
                  <UInput
                    v-model="cashEmpty.customDestination"
                    placeholder="Préciser la destination"
                    class="w-full"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optionnel)
                  </label>
                  <UTextarea
                    v-model="cashEmpty.note"
                    placeholder="Remarques, numéro de référence, etc."
                    class="w-full"
                  />
                </div>
              </div>
            </div>
          </template>

          <template #footer="{ close }">
            <div class="flex justify-end gap-3">
              <UButton variant="outline" @click="close"> Annuler </UButton>
              <UButton
                :disabled="
                  !cashEmpty.amount ||
                  !cashEmpty.reason ||
                  !cashEmpty.destination
                "
                color="red"
                @click="processCashEmpty"
              >
                Confirmer le Vidage
              </UButton>
            </div>
          </template>
        </UModal>

        <!-- Modal Historique de Caisse -->
        <UModal
          v-model:open="showHistoryModal"
          title="Historique de la Caisse"
          description="Consulter l'historique des transactions de caisse"
          :ui="{ wrapper: 'max-w-4xl' }"
        >
          <template #body>
            <div class="space-y-6">
              <!-- Filtres -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div v-if="historyFilter.period === 'custom'">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Date de début
                  </label>
                  <UInput v-model="historyFilter.startDate" type="date" />
                </div>

                <div v-if="historyFilter.period === 'custom'">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin
                  </label>
                  <UInput v-model="historyFilter.endDate" type="date" />
                </div>
              </div>

              <!-- Résumé -->
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-blue-50 p-4 rounded-lg">
                  <div class="text-sm text-blue-600">Total Ventes Espèces</div>
                  <div class="text-xl font-bold text-blue-900">
                    {{ formatCurrency(cashHistory.summary.totalCashSales) }}
                  </div>
                </div>
                <div class="bg-green-50 p-4 rounded-lg">
                  <div class="text-sm text-green-600">Entrées</div>
                  <div class="text-xl font-bold text-green-900">
                    {{ formatCurrency(cashHistory.summary.totalCashIn) }}
                  </div>
                </div>
                <div class="bg-red-50 p-4 rounded-lg">
                  <div class="text-sm text-red-600">Sorties</div>
                  <div class="text-xl font-bold text-red-900">
                    {{ formatCurrency(cashHistory.summary.totalCashOut) }}
                  </div>
                </div>
                <div class="bg-amber-50 p-4 rounded-lg">
                  <div class="text-sm text-amber-600">Vidages</div>
                  <div class="text-xl font-bold text-amber-900">
                    {{ formatCurrency(cashHistory.summary.totalEmptied) }}
                  </div>
                </div>
              </div>

              <!-- Liste des transactions -->
              <div class="max-h-96 overflow-y-auto">
                <div
                  v-if="cashHistory.transactions.length === 0"
                  class="text-center py-8 text-gray-500"
                >
                  Aucune transaction trouvée pour cette période
                </div>

                <div v-else class="space-y-2">
                  <div
                    v-for="transaction in cashHistory.transactions"
                    :key="`${transaction.type}-${transaction.id}-${transaction.date}`"
                    class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div class="flex items-center space-x-3">
                      <UIcon
                        :name="getTransactionIcon(transaction.type)"
                        :class="getTransactionColor(transaction.type)"
                        class="w-5 h-5"
                      />
                      <div>
                        <div class="font-medium">
                          {{ getTransactionTitle(transaction) }}
                        </div>
                        <div class="text-sm text-gray-500">
                          {{ formatDateTime(transaction.date) }}
                        </div>
                        <div
                          v-if="transaction.note"
                          class="text-xs text-gray-400"
                        >
                          {{ transaction.note }}
                        </div>
                      </div>
                    </div>

                    <div class="text-right">
                      <div
                        :class="getTransactionAmountClass(transaction.type)"
                        class="font-medium"
                      >
                        {{ getTransactionAmountSign(transaction.type)
                        }}{{ formatCurrency(Math.abs(transaction.amount)) }}
                      </div>
                      <div
                        v-if="transaction.type === 'empty'"
                        class="text-xs text-gray-500"
                      >
                        {{ transaction.destination }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template #footer="{ close }">
            <div class="flex justify-end gap-3">
              <UButton color="gray" variant="outline" @click="close">
                Fermer
              </UButton>
              <UButton
                icon="i-heroicons-arrow-down-tray"
                variant="outline"
                @click="exportCashHistory"
              >
                Exporter
              </UButton>
            </div>
          </template>
        </UModal>
      </div>
    </div>
  </div>
</template>
