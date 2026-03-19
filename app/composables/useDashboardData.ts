import { ref } from "vue";
import { useCurrentUser } from "./useCurrentUser";

interface Activity {
  type: string;
  icon: string;
  bgColor: string;
  iconColor: string;
  borderColor: string;
  title: string;
  description: string;
  time: string;
  timestamp: string;
}

interface StockAlert {
  product_name: string;
  stock: number;
  unit: string;
  level: string;
  color: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  icon: string;
  message: string;
}

interface SalesDataPoint {
  date: string;
  total: number;
  invoice_items?: {
    quantity: number;
  }[];
}

interface CompanySettings {
  low_stock_threshold: number;
  critical_stock_threshold: number;
}

export function useDashboardData() {
  const { companyId, magasinId, currentUser } = useCurrentUser();

  const supabase = useSupabaseClient();

  // États réactifs pour les données
  const totalProducts = ref(0);
  const totalClients = ref(0);
  const activeOrders = ref(0);
  const monthSales = ref(0);
  const recentActivities = ref<Activity[]>([]);
  const stockAlerts = ref<StockAlert[]>([]);
  const salesData = ref<SalesDataPoint[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Single onMounted hook to handle all initialization
  onMounted(() => {
    // Attendre que companyId ET magasinId soient tous les deux définis
    const tryInitialize = () => {
      if (!companyId.value || !magasinId.value) {
        return false;
      }

      // Vérification stricte : le magasin doit appartenir à la compagnie
      if (
        currentUser.value &&
        currentUser.value.company_id === companyId.value &&
        currentUser.value.magasin_id === magasinId.value
      ) {
        // Charger toutes les données en parallèle
        fetchTotalProducts();
        fetchTotalClients();
        fetchActiveOrders();
        fetchMonthSales();
        fetchRecentActivities();
        fetchStockAlerts();
        fetchSalesData();
        return true;
      } else if (currentUser.value) {
        error.value =
          "Le magasin sélectionné n'appartient pas à votre compagnie. Veuillez sélectionner un magasin valide.";
        totalProducts.value = 0;
        totalClients.value = 0;
        return false;
      }
      return false;
    };

    if (!tryInitialize()) {
      const stop = watch(
        [() => companyId.value, () => magasinId.value, () => currentUser.value],
        () => {
          if (tryInitialize()) {
            stop();
          }
        },
        { immediate: true }
      );
    }
  });

  // Fonction pour récupérer le nombre total de produits
  async function fetchTotalProducts() {
    try {
      if (!companyId.value) {
        totalProducts.value = 0;
        return;
      }
      const { count, error: prodError } = await supabase
        .from("products_carreaux")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId.value);

      if (prodError) {
        console.error("Error fetching products:", prodError);
        totalProducts.value = 0;
        return;
      }
      totalProducts.value = count || 0;
    } catch (err) {
      console.error("Erreur lors de la récupération des produits:", err);
      totalProducts.value = 0;
    }
  }

  // Fonction pour récupérer le nombre total de clients
  async function fetchTotalClients() {
    try {
      if (!magasinId.value) {
        totalClients.value = 0;
        return;
      }
      const { count, error: clientError } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("magasin_id", magasinId.value);

      if (clientError) {
        console.error("Error fetching clients:", clientError);
        totalClients.value = 0;
        return;
      }
      totalClients.value = count || 0;
    } catch (err) {
      console.error("Erreur lors de la récupération des clients:", err);
      totalClients.value = 0;
    }
  }

  // Fonction pour récupérer le nombre de commandes actives (factures non payées)
  async function fetchActiveOrders() {
    try {
      if (!magasinId.value) {
        activeOrders.value = 0;
        return;
      }
      const { count, error: orderError } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .neq("status", "paid")
        .eq("magasin_id", magasinId.value);

      if (orderError) {
        console.error("Error fetching orders:", orderError);
        activeOrders.value = 0;
        return;
      }
      activeOrders.value = count || 0;
    } catch (err) {
      console.error("Erreur lors de la récupération des commandes:", err);
      activeOrders.value = 0;
    }
  }

  // Fonction pour récupérer les ventes du mois
  async function fetchMonthSales() {
    try {
      if (!magasinId.value) {
        monthSales.value = 0;
        return;
      }
      const currentDate = new Date();
      const firstDayOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      const lastDayOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      );

      const { data, error: salesError } = await supabase
        .from("invoices")
        .select("total")
        .eq("status", "paid")
        .gte("date", firstDayOfMonth.toISOString().split("T")[0])
        .lte("date", lastDayOfMonth.toISOString().split("T")[0])
        .eq("magasin_id", magasinId.value);

      if (salesError) {
        console.error("Error fetching month sales:", salesError);
        monthSales.value = 0;
        return;
      }

      const totalSales =
        data?.reduce(
          (sum: number, invoice: { total: number }) =>
            sum + Number(invoice.total || 0),
          0
        ) || 0;
      monthSales.value = totalSales;
    } catch (err) {
      console.error("Erreur lors de la récupération des ventes:", err);
      monthSales.value = 0;
    }
  }

  // Fonction pour récupérer les données de ventes pour le graphique
  async function fetchSalesData(period: string = "month") {
    try {
      if (!magasinId.value) {
        salesData.value = [];
        return;
      }
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default: // month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const { data, error: salesError } = await supabase
        .from("invoices")
        .select(
          `
          date,
          total,
          status,
          invoice_items (
            quantity
          )
        `
        )
        .eq("status", "paid")
        .gte("date", startDate.toISOString().split("T")[0])
        .eq("magasin_id", magasinId.value)
        .order("date", { ascending: true });

      if (salesError) {
        console.error("Error fetching sales data:", salesError);
        salesData.value = [];
        return;
      }

      salesData.value = data || [];
    } catch (err) {
      console.error(
        "Erreur lors de la récupération des données de ventes:",
        err
      );
      salesData.value = [];
    }
  }

  // Fonction pour récupérer les activités récentes
  async function fetchRecentActivities() {
    try {
      if (!magasinId.value) {
        recentActivities.value = [];
        return;
      }
      // Récupérer les 10 dernières factures avec leurs clients
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select(
          `
          id,
          reference,
          total,
          status,
          date,
          created_at,
          clients (
            name
          )
        `
        )
        .eq("magasin_id", magasinId.value)
        .order("created_at", { ascending: false })
        .limit(10);

      if (invoicesError) {
        console.error("Error fetching invoices:", invoicesError);
      }

      // Récupérer les 5 derniers clients créés
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("name, created_at")
        .eq("magasin_id", magasinId.value)
        .order("created_at", { ascending: false })
        .limit(5);

      if (clientsError) {
        console.error("Error fetching clients:", clientsError);
      }

      // Récupérer les 5 derniers paiements
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select(
          `
          amount,
          payment_date,
          created_at,
          invoices (
            reference
          )
        `
        )
        .eq("magasin_id", magasinId.value)
        .order("created_at", { ascending: false })
        .limit(5);

      if (paymentsError) {
        console.error("Error fetching payments:", paymentsError);
      }

      // Combiner et formatter les activités
      const activities: Activity[] = [];

      // Ajouter les factures
      invoicesData?.forEach(
        (invoice: {
          created_at: string;
          status: string;
          reference: string;
          clients?: { name: string };
          total: number;
        }) => {
          const timeAgo = getTimeAgo(invoice.created_at);
          if (invoice.status === "paid") {
            activities.push({
              type: "invoice_paid",
              icon: "i-lucide-check-circle",
              bgColor: "bg-green-50",
              iconColor: "text-green-600",
              borderColor: "border-green-100",
              title: `Facture ${invoice.reference} livrée`,
              description: `Client: ${invoice.clients?.name || "N/A"} - ${Number(
                invoice.total || 0
              ).toLocaleString()}`,
              time: timeAgo,
              timestamp: invoice.created_at,
            });
          }
        }
      );

      // Ajouter les nouveaux clients
      clientsData?.forEach((client: { name: string; created_at: string }) => {
        const timeAgo = getTimeAgo(client.created_at);
        activities.push({
          type: "client_added",
          icon: "i-lucide-user-plus",
          bgColor: "bg-blue-50",
          iconColor: "text-blue-600",
          borderColor: "border-blue-100",
          title: "Nouveau client enregistré",
          description: client.name || "N/A",
          time: timeAgo,
          timestamp: client.created_at,
        });
      });

      // Ajouter les paiements
      paymentsData?.forEach(
        (payment: {
          created_at: string;
          amount: number;
          invoices?: { reference: string };
        }) => {
          const timeAgo = getTimeAgo(payment.created_at);
          activities.push({
            type: "payment_received",
            icon: "i-lucide-receipt",
            bgColor: "bg-purple-50",
            iconColor: "text-purple-600",
            borderColor: "border-purple-100",
            title: "Facture payée",
            description: `Facture ${payment.invoices?.reference || "N/A"} - ${Number(
              payment.amount || 0
            ).toLocaleString()}`,
            time: timeAgo,
            timestamp: payment.created_at,
          });
        }
      );

      // Trier par timestamp et prendre les 5 plus récents
      activities.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      recentActivities.value = activities.slice(0, 5);
    } catch (err) {
      console.error("Erreur lors de la récupération des activités:", err);
      recentActivities.value = [];
    }
  }

  // Fonction pour récupérer les alertes de stock
  const fetchStockAlerts = async () => {
    try {
      // Vérifier et attendre que companyId soit disponible
      if (!companyId.value) {
        stockAlerts.value = [];
        return;
      }

      const { data: companySettings, error: settingsError } = await supabase
        .from("company_settings")
        .select("low_stock_threshold, critical_stock_threshold")
        .eq("id", companyId.value)
        .single();

      if (settingsError) {
        console.error("Error fetching company settings:", settingsError);
      }

      const lowThreshold =
        (companySettings as unknown as CompanySettings)?.low_stock_threshold ||
        10;
      const criticalThreshold =
        (companySettings as unknown as CompanySettings)
          ?.critical_stock_threshold || 5;

      const { data: productsData, error: stockError } = await supabase
        .from("products_carreaux")
        .select("name, stock, unite")
        .eq("company_id", companyId.value)
        .lte("stock", lowThreshold)
        .order("stock", { ascending: true })
        .limit(10);

      if (stockError) {
        console.error("Error fetching stock alerts:", stockError);
        stockAlerts.value = [];
        return;
      }

      const alerts =
        productsData?.map(
          (product: { name: string; stock: number; unite?: string }) => {
            const isCritical = product.stock <= criticalThreshold;
            const isLow =
              product.stock <= lowThreshold &&
              product.stock > criticalThreshold;

            return {
              product_name: product.name,
              stock: product.stock,
              unit: product.unite || "unité",
              level: isCritical ? "critical" : isLow ? "low" : "warning",
              color: isCritical ? "red" : isLow ? "yellow" : "orange",
              bgColor: isCritical
                ? "bg-red-50"
                : isLow
                ? "bg-yellow-50"
                : "bg-orange-50",
              borderColor: isCritical
                ? "border-red-100"
                : isLow
                ? "border-yellow-100"
                : "border-orange-100",
              iconColor: isCritical
                ? "text-red-600"
                : isLow
                ? "text-yellow-600"
                : "text-orange-600",
              icon: isCritical
                ? "i-lucide-alert-circle"
                : isLow
                ? "i-lucide-alert-triangle"
                : "i-lucide-clock",
              message: isCritical
                ? `Stock critique: ${product.stock} ${
                    product.unite || "unités"
                  }`
                : isLow
                ? `Stock faible: ${product.stock} ${product.unite || "unités"}`
                : `À réapprovisionner: ${product.stock} ${
                    product.unite || "unités"
                  }`,
            };
          }
        ) || [];

      stockAlerts.value = alerts;
    } catch (err) {
      console.error(
        "Erreur lors de la récupération des alertes de stock:",
        err
      );
      stockAlerts.value = [];
    }
  };

  // Fonction utilitaire pour calculer le temps écoulé
  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - past.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 60) {
      return `Il y a ${diffInMinutes}min`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `Il y a ${hours}h`;
    } else if (diffInMinutes < 10080) {
      const days = Math.floor(diffInMinutes / 1440);
      return days === 1 ? "Hier" : `Il y a ${days} jours`;
    } else {
      return past.toLocaleDateString("fr-FR");
    }
  };

  // Fonction pour charger toutes les données
  const loadDashboardData = async () => {
    loading.value = true;
    error.value = null;

    try {
      await Promise.all([
        fetchTotalProducts(),
        fetchTotalClients(),
        fetchActiveOrders(),
        fetchMonthSales(),
        fetchRecentActivities(),
        fetchStockAlerts(),
        fetchSalesData("month"),
      ]);
    } catch (err) {
      console.error("Erreur lors du chargement des données du dashboard:", err);
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  };

  return {
    // États
    totalProducts,
    totalClients,
    activeOrders,
    monthSales,
    recentActivities,
    stockAlerts,
    salesData,
    loading,
    error,

    // Méthodes
    loadDashboardData,
    fetchSalesData,
  };
}
