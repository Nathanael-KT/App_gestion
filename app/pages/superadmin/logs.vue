<template>
  <div class="w-full max-w-7xl mx-auto px-3 md:px-4 py-6">
    <div class="flex flex-col md:flex-row justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <UIcon name="heroicons:document-text-20-solid" class="w-7 h-7 text-blue-600" />
          Logs Système & Audit Trail
        </h1>
        <p class="text-gray-500 text-sm mt-1">Journal d'activité global pour super administrateur</p>
      </div>
      <div class="flex gap-2">
        <UButton icon="i-heroicons-arrow-path" variant="outline" :loading="loading" @click="loadLogs">Actualiser</UButton>
        <UButton icon="i-heroicons-trash" color="neutral" variant="outline" @click="clearLocalLogs">Vider cache local</UButton>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <div class="lg:col-span-2 bg-white rounded-xl border shadow-sm p-5">
        <h3 class="font-semibold mb-4">Filtres</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <UInput v-model="filterCompany" placeholder="Filtrer par entreprise..." icon="i-heroicons-building-office-2" />
          <UInput v-model="filterAction" placeholder="Action (ex: bloque, abonnement...)" icon="i-heroicons-magnifying-glass" />
          <USelect v-model="filterSeverity" :items="severityOptions" placeholder="Sévérité" />
        </div>
      </div>
      <div class="bg-white rounded-xl border shadow-sm p-5">
        <h3 class="font-semibold mb-3">Stats rapides</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-gray-600">Total logs (local)</span><span class="font-bold">{{ logs.length }}</span></div>
          <div class="flex justify-between"><span class="text-gray-600">Alertes critiques</span><span class="font-bold text-red-600">{{ logs.filter(l => l.severity === 'critical').length }}</span></div>
          <div class="flex justify-between"><span class="text-gray-600">Dernière activité</span><span class="text-xs text-gray-500">{{ logs[0] ? formatDate(logs[0].createdAt) : '—' }}</span></div>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div class="p-4 border-b flex items-center justify-between">
        <h2 class="font-bold">Journal d'activité (localStorage + abonnements)</h2>
        <UBadge color="neutral" variant="soft">{{ filteredLogs.length }} entrées</UBadge>
      </div>

      <div v-if="loading" class="p-8 text-center text-gray-500">Chargement...</div>

      <div v-else-if="filteredLogs.length === 0" class="p-12 text-center">
        <UIcon name="heroicons:inbox-20-solid" class="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500">Aucun log correspondant aux filtres</p>
        <p class="text-xs text-gray-400 mt-1">Les actions superadmin (blocage, abonnement, etc.) apparaissent ici</p>
      </div>

      <div v-else class="divide-y max-h-[600px] overflow-y-auto">
        <div v-for="log in filteredLogs" :key="log.id" class="p-4 hover:bg-gray-50 flex gap-4">
          <div class="flex-shrink-0">
            <div class="w-10 h-10 rounded-full flex items-center justify-center" :class="severityClass(log.severity)">
              <UIcon :name="severityIcon(log.severity)" class="w-5 h-5" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold text-gray-900">{{ log.companyName }}</span>
              <UBadge :color="actionColor(log.action)" variant="soft" size="xs">{{ log.action }}</UBadge>
              <span class="text-xs text-gray-400">{{ formatDate(log.createdAt) }}</span>
            </div>
            <p class="text-sm text-gray-600 mt-1">{{ log.details }}</p>
            <p class="text-xs text-gray-400 mt-1">Par {{ log.actor }} • ID {{ log.companyId.slice(0, 8) }}...</p>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
      <h4 class="font-semibold text-amber-800 flex items-center gap-2">
        <UIcon name="heroicons:information-circle-20-solid" class="w-5 h-5" />
        Note sur l'audit trail complet
      </h4>
      <p class="text-sm text-amber-700 mt-2">
        Actuellement les logs superadmin sont stockés en localStorage (abonnements.vue) pour rapidité. Pour une production complète,
        il est recommandé de créer une table <code class="bg-amber-100 px-1 rounded">activity_log</code> en base avec RLS super_admin uniquement,
        et d'y logger toutes les actions sensibles (blocage entreprise, modification abonnement, création utilisateur, etc.).
        Cette page est prête à brancher sur cette table dès qu'elle existe.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ["auth", "superadmin"] });

const loading = ref(false);
const filterCompany = ref("");
const filterAction = ref("");
const filterSeverity = ref("all");

const severityOptions = [
  { label: "Toutes", value: "all" },
  { label: "Info", value: "info" },
  { label: "Warning", value: "warning" },
  { label: "Critical", value: "critical" },
];

interface LogEntry {
  id: string;
  companyId: string;
  companyName: string;
  action: string;
  details: string;
  actor: string;
  createdAt: string;
  severity?: string;
}

const logs = ref<LogEntry[]>([]);

function loadLogs() {
  loading.value = true;
  try {
    const rawLogs = localStorage.getItem("superadmin_subscription_logs_v1");
    const rawAlerts = localStorage.getItem("superadmin_subscription_alerts_v1");

    const parsedLogs: LogEntry[] = rawLogs ? JSON.parse(rawLogs) : [];
    const parsedAlerts: any[] = rawAlerts ? JSON.parse(rawAlerts) : [];

    const alertLogs: LogEntry[] = parsedAlerts.map((a: any) => ({
      id: a.id,
      companyId: a.companyId,
      companyName: a.companyName,
      action: "alerte",
      details: a.message,
      actor: "system",
      createdAt: a.createdAt,
      severity: a.severity,
    }));

    logs.value = [...parsedLogs, ...alertLogs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    logs.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(loadLogs);

const filteredLogs = computed(() => {
  return logs.value.filter((l) => {
    if (filterCompany.value && !l.companyName.toLowerCase().includes(filterCompany.value.toLowerCase())) return false;
    if (filterAction.value && !l.action.toLowerCase().includes(filterAction.value.toLowerCase()) && !l.details.toLowerCase().includes(filterAction.value.toLowerCase())) return false;
    if (filterSeverity.value !== "all" && l.severity !== filterSeverity.value) return false;
    return true;
  });
});

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleString("fr-FR");
  } catch {
    return d;
  }
}

function severityClass(sev?: string) {
  if (sev === "critical") return "bg-red-100 text-red-600";
  if (sev === "warning") return "bg-amber-100 text-amber-600";
  return "bg-blue-100 text-blue-600";
}

function severityIcon(sev?: string) {
  if (sev === "critical") return "heroicons:exclamation-triangle-20-solid";
  if (sev === "warning") return "heroicons:exclamation-circle-20-solid";
  return "heroicons:information-circle-20-solid";
}

function actionColor(action: string) {
  if (action.includes("bloque") || action.includes("suppression")) return "error";
  if (action.includes("alerte") || action.includes("en_attente")) return "warning";
  if (action.includes("actif") || action.includes("creation")) return "success";
  return "neutral";
}

function clearLocalLogs() {
  localStorage.removeItem("superadmin_subscription_logs_v1");
  localStorage.removeItem("superadmin_subscription_alerts_v1");
  logs.value = [];
}
</script>
