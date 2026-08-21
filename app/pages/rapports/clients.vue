<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useMagasinStore } from "../../composables/useMagasinStore";
import { useCurrentUser } from "../../composables/useCurrentUser";
import { useCompanySettings } from "../../composables/useCompanySettings";

definePageMeta({ middleware: ["auth"] });

const supabase = useSupabaseClient() as any;
const toast = useToast();
const magasinStore = useMagasinStore();
const { settings: companySettings, fetchCompanySettings } = useCompanySettings();
const { companyId, isLoadingUser, loadCurrentUser } = useCurrentUser();

const loading = ref(true);
const error = ref<string | null>(null);
const selectedPeriod = ref("month");
const searchQuery = ref("");

interface ClientRow {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  created_at?: string;
}

interface InvoiceRow {
  id: string;
  client_id: string;
  total: number;
  date: string;
  status: string;
  clients?: { name: string };
}

const clients = ref<ClientRow[]>([]);
const invoices = ref<InvoiceRow[]>([]);

const periods = [
  { label: "Tout", value: "all" },
  { label: "Ce mois", value: "month" },
  { label: "Ce trimestre", value: "quarter" },
  { label: "Cette année", value: "year" },
];

function getDateRange(period: string) {
  const now = new Date();
  let startDate: Date | null = null;
  const endDate = new Date();
  switch (period) {
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), q, 1);
      break;
    }
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return { startDate: null, endDate: null };
  }
  return {
    startDate: startDate?.toISOString() || null,
    endDate: endDate.toISOString(),
  };
}

function formatCurrency(value: number) {
  const currency = (companySettings.value as any)?.currency || "EUR";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(value || 0);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR");
}

const fetchData = async () => {
  loading.value = true;
  error.value = null;
  try {
    if (!magasinStore.magasinId) throw new Error("Aucun magasin sélectionné");

    const { data: clientsData, error: clientsError } = await supabase
      .from("clients")
      .select("id, name, email, phone, created_at")
      .eq("magasin_id", magasinStore.magasinId)
      .order("name");

    if (clientsError) throw clientsError;
    clients.value = clientsData || [];

    let query = supabase
      .from("invoices")
      .select("id, client_id, total, date, status, clients(name)")
      .eq("magasin_id", magasinStore.magasinId);

    if (selectedPeriod.value !== "all") {
      const { startDate, endDate } = getDateRange(selectedPeriod.value);
      if (startDate && endDate) {
        query = query.gte("date", startDate).lte("date", endDate);
      }
    }

    const { data: invoicesData, error: invError } = await query;
    if (invError) throw invError;
    invoices.value = invoicesData || [];
  } catch (err: any) {
    error.value = err.message || "Erreur chargement";
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  if (isLoadingUser.value) await loadCurrentUser();
  if (companyId.value) await fetchCompanySettings(companyId.value);
  await fetchData();
});

watch([selectedPeriod, () => magasinStore.magasinId], () => {
  fetchData();
});

interface ClientStats {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  totalCA: number;
  nbCommandes: number;
  lastOrderDate: string | null;
  avgBasket: number;
}

const clientStats = computed<ClientStats[]>(() => {
  const map = new Map<string, ClientStats>();

  for (const c of clients.value) {
    map.set(c.id, {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      totalCA: 0,
      nbCommandes: 0,
      lastOrderDate: null,
      avgBasket: 0,
    });
  }

  for (const inv of invoices.value) {
    const stat = map.get(inv.client_id);
    if (stat) {
      stat.totalCA += Number(inv.total) || 0;
      stat.nbCommandes += 1;
      if (!stat.lastOrderDate || new Date(inv.date) > new Date(stat.lastOrderDate)) {
        stat.lastOrderDate = inv.date;
      }
    }
  }

  for (const s of map.values()) {
    s.avgBasket = s.nbCommandes > 0 ? s.totalCA / s.nbCommandes : 0;
  }

  return Array.from(map.values()).sort((a, b) => b.totalCA - a.totalCA);
});

const filteredStats = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return clientStats.value;
  return clientStats.value.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q))
  );
});

const topClients = computed(() => filteredStats.value.slice(0, 10));
const inactiveClients = computed(() => {
  const now = new Date();
  const threshold = new Date();
  threshold.setDate(now.getDate() - 90); // 90 jours sans commande
  return filteredStats.value.filter((c) => {
    if (!c.lastOrderDate) return true;
    return new Date(c.lastOrderDate) < threshold;
  });
});

const totalCA = computed(() =>
  clientStats.value.reduce((sum, c) => sum + c.totalCA, 0)
);

function exportCsv() {
  const header = ["Nom", "Email", "Téléphone", "CA Total", "Nb Commandes", "Panier moyen", "Dernière commande"];
  const rows = filteredStats.value.map((c) => [
    c.name,
    c.email,
    c.phone || "",
    c.totalCA,
    c.nbCommandes,
    c.avgBasket.toFixed(2),
    c.lastOrderDate ? formatDate(c.lastOrderDate) : "Jamais",
  ]);

  const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rapport_clients_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.add({ title: "Export CSV", description: "Fichier téléchargé", color: "success" });
}
</script>

<template>
  <div class="w-full max-w-7xl mx-auto px-3 md:px-4 py-6">
    <div class="flex flex-col md:flex-row justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Rapport Clients</h1>
        <p class="text-gray-500 text-sm mt-1">Analyse de la fidélisation et du chiffre d'affaires par client</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <USelect v-model="selectedPeriod" :items="periods" class="w-40" />
        <UButton icon="i-heroicons-arrow-down-tray" variant="outline" @click="exportCsv">Export CSV</UButton>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <template v-else>
      <!-- KPIs -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div class="bg-white rounded-xl border p-5 shadow-sm">
          <p class="text-xs uppercase text-gray-500 font-semibold">CA Total Clients</p>
          <p class="text-2xl font-bold mt-1">{{ formatCurrency(totalCA) }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ clientStats.length }} clients</p>
        </div>
        <div class="bg-white rounded-xl border p-5 shadow-sm">
          <p class="text-xs uppercase text-gray-500 font-semibold">Top client</p>
          <p class="text-lg font-bold mt-1 truncate">{{ topClients[0]?.name || "—" }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ topClients[0] ? formatCurrency(topClients[0].totalCA) : "Aucun" }}</p>
        </div>
        <div class="bg-white rounded-xl border p-5 shadow-sm">
          <p class="text-xs uppercase text-gray-500 font-semibold">Clients inactifs (90j)</p>
          <p class="text-2xl font-bold mt-1" :class="inactiveClients.length > 0 ? 'text-amber-600' : 'text-gray-900'">{{ inactiveClients.length }}</p>
          <p class="text-xs text-gray-400 mt-1">Sans commande récente</p>
        </div>
      </div>

      <!-- Search -->
      <div class="bg-white rounded-xl border shadow-sm p-4 mb-6">
        <UInput v-model="searchQuery" placeholder="Rechercher un client (nom, email, téléphone)..." icon="i-heroicons-magnifying-glass" class="w-full" />
      </div>

      <!-- Top 10 -->
      <div class="bg-white rounded-xl border shadow-sm p-4 md:p-6 mb-6">
        <h2 class="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <UIcon name="heroicons:trophy-20-solid" class="w-5 h-5 text-amber-500" />
          Top 10 clients par CA
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b text-left text-gray-500">
                <th class="pb-2">#</th>
                <th class="pb-2">Client</th>
                <th class="pb-2">Email</th>
                <th class="pb-2 text-right">CA Total</th>
                <th class="pb-2 text-right">Commandes</th>
                <th class="pb-2 text-right">Panier moyen</th>
                <th class="pb-2">Dernière commande</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(c, idx) in topClients" :key="c.id" class="border-b last:border-0 hover:bg-gray-50">
                <td class="py-2 font-medium">{{ idx + 1 }}</td>
                <td class="py-2 font-medium">{{ c.name }}</td>
                <td class="py-2 text-gray-600 truncate max-w-[150px]">{{ c.email }}</td>
                <td class="py-2 text-right font-semibold">{{ formatCurrency(c.totalCA) }}</td>
                <td class="py-2 text-right">{{ c.nbCommandes }}</td>
                <td class="py-2 text-right">{{ formatCurrency(c.avgBasket) }}</td>
                <td class="py-2 text-gray-500">{{ c.lastOrderDate ? formatDate(c.lastOrderDate) : "—" }}</td>
              </tr>
              <tr v-if="topClients.length === 0">
                <td colspan="7" class="py-8 text-center text-gray-400">Aucun client trouvé</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- All clients -->
      <div class="bg-white rounded-xl border shadow-sm p-4 md:p-6">
        <h2 class="font-bold text-gray-900 mb-4">Tous les clients ({{ filteredStats.length }})</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b text-left text-gray-500">
                <th class="pb-2">Client</th>
                <th class="pb-2">Contact</th>
                <th class="pb-2 text-right">CA</th>
                <th class="pb-2 text-right">Cmd</th>
                <th class="pb-2">Dernière</th>
                <th class="pb-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in filteredStats" :key="c.id" class="border-b last:border-0 hover:bg-gray-50">
                <td class="py-2 font-medium">{{ c.name }}</td>
                <td class="py-2">
                  <div class="text-xs text-gray-600">{{ c.email }}</div>
                  <div class="text-xs text-gray-400">{{ c.phone || "" }}</div>
                </td>
                <td class="py-2 text-right font-medium">{{ formatCurrency(c.totalCA) }}</td>
                <td class="py-2 text-right">{{ c.nbCommandes }}</td>
                <td class="py-2 text-xs text-gray-500">{{ c.lastOrderDate ? formatDate(c.lastOrderDate) : "Jamais" }}</td>
                <td class="py-2">
                  <UBadge v-if="c.nbCommandes === 0" color="neutral" variant="soft" size="xs">Inactif</UBadge>
                  <UBadge v-else-if="c.lastOrderDate && new Date(c.lastOrderDate) < new Date(Date.now() - 90*24*60*60*1000)" color="warning" variant="soft" size="xs">À relancer</UBadge>
                  <UBadge v-else color="success" variant="soft" size="xs">Actif</UBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <UAlert v-if="error" color="error" variant="soft" :title="error" class="mt-6" />
  </div>
</template>
