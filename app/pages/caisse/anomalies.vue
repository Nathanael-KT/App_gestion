<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  useAnomalyDetection,
  type Anomaly,
  type AnomalySeverity,
  type AnomalyStatus,
} from "~/composables/useAnomalyDetection";

definePageMeta({ middleware: "auth" });

type BadgeColor = "error" | "info" | "success" | "primary" | "secondary" | "warning" | "neutral";

const { scan, list, updateStatus, typeLabel } = useAnomalyDetection();

const loading = ref(false);
const scanning = ref(false);
const anomalies = ref<Anomaly[]>([]);
const stats = ref<{ byStatus: Record<string, number>; bySeverity: Record<string, number> }>({
  byStatus: {},
  bySeverity: {},
});
const score = ref<number | null>(null);
const scannedAt = ref<string | null>(null);

// Filtres
const statusFilter = ref<AnomalyStatus | "all">("all");
const severityFilter = ref<AnomalySeverity | "all">("all");
const scanDays = ref(30);

const filtered = computed(() =>
  anomalies.value.filter((a) => {
    if (statusFilter.value !== "all" && a.status !== statusFilter.value) return false;
    if (severityFilter.value !== "all" && a.severity !== severityFilter.value)
      return false;
    return true;
  }),
);

const openCount = computed(() => stats.value.byStatus.open ?? 0);

const scoreColor = computed<BadgeColor>(() => {
  if (score.value === null) return "neutral";
  if (score.value >= 66) return "error";
  if (score.value >= 33) return "warning";
  return "success";
});

const scoreLabel = computed(() => {
  if (score.value === null) return "Non évalué";
  if (score.value >= 66) return "Risque élevé";
  if (score.value >= 33) return "Risque modéré";
  return "Faible risque";
});

const severityColor: Record<AnomalySeverity, BadgeColor> = {
  low: "info",
  medium: "warning",
  high: "error",
  critical: "error",
};

const statusColor: Record<AnomalyStatus, BadgeColor> = {
  open: "error",
  acknowledged: "warning",
  resolved: "success",
  false_positive: "neutral",
};

const statusLabel: Record<AnomalyStatus, string> = {
  open: "Ouverte",
  acknowledged: "Acquittée",
  resolved: "Résolue",
  false_positive: "Faux positif",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const load = async () => {
  loading.value = true;
  const res = await list({ limit: 200 });
  if (res) {
    anomalies.value = res.anomalies;
    stats.value = res.stats;
  }
  loading.value = false;
};

const runScan = async () => {
  scanning.value = true;
  const res = await scan(scanDays.value);
  if (res) {
    score.value = res.score;
    scannedAt.value = res.scannedAt;
    await load();
  }
  scanning.value = false;
};

const changeStatus = async (anomaly: Anomaly, status: AnomalyStatus) => {
  const updated = await updateStatus(anomaly.id, status);
  if (updated) {
    const idx = anomalies.value.findIndex((a) => a.id === anomaly.id);
    if (idx >= 0) anomalies.value[idx] = updated;
    await load();
  }
};

onMounted(async () => {
  await load();
  // Score initial déduit des anomalies chargées
  if (score.value === null && anomalies.value.length > 0) {
    const weights: Record<AnomalySeverity, number> = {
      low: 1,
      medium: 3,
      high: 7,
      critical: 12,
    };
    const w = anomalies.value
      .filter((a) => a.status === "open")
      .reduce((s, a) => s + (weights[a.severity] ?? 0), 0);
    score.value = Math.min(100, Math.round((w / (w + 15)) * 100));
  }
});
</script>

<template>
  <div class="container mx-auto px-2 sm:px-4 py-4">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <UIcon name="i-lucide-shield-alert" class="w-7 h-7 text-red-500" />
          Anti-fraude &amp; anomalies
        </h1>
        <p class="text-gray-600 text-sm mt-1">
          Détection automatique des écarts de caisse, ventes suspectes et erreurs.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <USelect
          v-model="scanDays"
          :items="[
            { label: '7 jours', value: 7 },
            { label: '30 jours', value: 30 },
            { label: '90 jours', value: 90 },
          ]"
          class="w-36"
        />
        <UButton
          icon="i-lucide-radar"
          color="primary"
          :loading="scanning"
          label="Scanner"
          @click="runScan"
        />
      </div>
    </div>

    <!-- Score + résumé -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
      <UCard class="lg:col-span-1">
        <div class="text-center">
          <p class="text-sm text-gray-500 mb-1">Score de risque</p>
          <div
            class="text-5xl font-extrabold"
            :class="{
              'text-red-600': scoreColor === 'error',
              'text-amber-500': scoreColor === 'warning',
              'text-green-600': scoreColor === 'success',
              'text-gray-400': scoreColor === 'neutral',
            }"
          >
            {{ score ?? "—" }}
          </div>
          <UBadge :color="scoreColor" variant="subtle" class="mt-2">
            {{ scoreLabel }}
          </UBadge>
        </div>
      </UCard>

      <UCard class="lg:col-span-3">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="text-center p-3 bg-red-50 rounded-lg">
            <div class="text-2xl font-bold text-red-600">
              {{ stats.bySeverity.critical ?? 0 }}
            </div>
            <div class="text-xs text-gray-600">Critique</div>
          </div>
          <div class="text-center p-3 bg-orange-50 rounded-lg">
            <div class="text-2xl font-bold text-orange-600">
              {{ stats.bySeverity.high ?? 0 }}
            </div>
            <div class="text-xs text-gray-600">Élevée</div>
          </div>
          <div class="text-center p-3 bg-amber-50 rounded-lg">
            <div class="text-2xl font-bold text-amber-600">
              {{ stats.bySeverity.medium ?? 0 }}
            </div>
            <div class="text-xs text-gray-600">Moyenne</div>
          </div>
          <div class="text-center p-3 bg-blue-50 rounded-lg">
            <div class="text-2xl font-bold text-blue-600">
              {{ stats.bySeverity.low ?? 0 }}
            </div>
            <div class="text-xs text-gray-600">Faible</div>
          </div>
        </div>
        <p v-if="scannedAt" class="text-xs text-gray-400 mt-3 text-center">
          Dernier scan : {{ formatDate(scannedAt) }}
        </p>
      </UCard>
    </div>

    <!-- Filtres -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <USelect
        v-model="statusFilter"
        :items="[
          { label: 'Tous les statuts', value: 'all' },
          { label: 'Ouvertes', value: 'open' },
          { label: 'Acquittées', value: 'acknowledged' },
          { label: 'Résolues', value: 'resolved' },
          { label: 'Faux positifs', value: 'false_positive' },
        ]"
        class="w-48"
      />
      <USelect
        v-model="severityFilter"
        :items="[
          { label: 'Toutes sévérités', value: 'all' },
          { label: 'Critique', value: 'critical' },
          { label: 'Élevée', value: 'high' },
          { label: 'Moyenne', value: 'medium' },
          { label: 'Faible', value: 'low' },
        ]"
        class="w-48"
      />
      <span class="text-sm text-gray-500">
        {{ filtered.length }} anomalie(s) • {{ openCount }} ouverte(s)
      </span>
    </div>

    <!-- Liste -->
    <div v-if="loading" class="text-center py-12 text-gray-500">
      <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin mx-auto mb-2" />
      Chargement...
    </div>

    <div v-else-if="filtered.length === 0" class="text-center py-12">
      <UIcon name="i-lucide-shield-check" class="w-16 h-16 text-green-500 mx-auto mb-3" />
      <h3 class="text-lg font-semibold text-gray-700">Aucune anomalie</h3>
      <p class="text-gray-500 text-sm">
        Lancez un scan pour analyser les {{ scanDays }} derniers jours.
      </p>
    </div>

    <div v-else class="space-y-3">
      <UCard
        v-for="a in filtered"
        :key="a.id"
        :ui="{ body: 'p-4 sm:p-5' }"
      >
        <div class="flex flex-col sm:flex-row sm:items-start gap-3">
          <div class="flex-1">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <UBadge :color="severityColor[a.severity]" variant="solid" size="sm">
                {{ a.severity }}
              </UBadge>
              <UBadge color="neutral" variant="subtle" size="sm">
                {{ typeLabel(a.type) }}
              </UBadge>
              <UBadge :color="statusColor[a.status]" variant="subtle" size="sm">
                {{ statusLabel[a.status] }}
              </UBadge>
              <span v-if="a.amount !== null" class="text-sm font-semibold text-gray-700">
                {{ Number(a.amount).toFixed(2) }}
              </span>
            </div>
            <h4 class="font-semibold text-gray-800">{{ a.title }}</h4>
            <p class="text-sm text-gray-600 mt-1">{{ a.description }}</p>
            <p class="text-xs text-gray-400 mt-2">
              Détectée le {{ formatDate(a.detected_at) }}
            </p>
          </div>

          <div v-if="a.status === 'open'" class="flex flex-col gap-2 sm:w-40">
            <UButton
              size="xs"
              color="warning"
              variant="soft"
              icon="i-lucide-check"
              label="Acquitter"
              block
              @click="changeStatus(a, 'acknowledged')"
            />
            <UButton
              size="xs"
              color="success"
              variant="soft"
              icon="i-lucide-check-check"
              label="Résoudre"
              block
              @click="changeStatus(a, 'resolved')"
            />
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              label="Faux positif"
              block
              @click="changeStatus(a, 'false_positive')"
            />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
