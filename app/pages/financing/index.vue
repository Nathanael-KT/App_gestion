<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  useCashAdvance,
  type CashAdvance,
  type EligibilityResult,
} from "~/composables/useCashAdvance";

definePageMeta({ middleware: "auth" });

type BadgeColor = "error" | "info" | "success" | "primary" | "secondary" | "warning" | "neutral";

const { eligibility, list, apply, accept, previewTerms } = useCashAdvance();

const loading = ref(true);
const elig = ref<EligibilityResult | null>(null);
const advances = ref<CashAdvance[]>([]);
const requestedAmount = ref<string>("");

const statusLabel: Record<string, string> = {
  draft: "Brouillon",
  submitted: "Soumise",
  offered: "Offre prête",
  accepted: "Acceptée",
  rejected: "Refusée",
  disbursed: "Débloquée",
  repaid: "Remboursée",
  overdue: "En retard",
};
const statusColor: Record<string, BadgeColor> = {
  offered: "success",
  accepted: "info",
  disbursed: "success",
  repaid: "neutral",
  rejected: "error",
  overdue: "error",
  submitted: "warning",
  draft: "neutral",
};

const preview = computed(() => previewTerms(Number(requestedAmount.value) || 0));
const canRequest = computed(
  () =>
    elig.value?.eligible &&
    Number(requestedAmount.value) > 0 &&
    Number(requestedAmount.value) <= (elig.value?.maxAmount ?? 0),
);

const scoreColor = computed(() => {
  const s = elig.value?.score ?? 0;
  if (s >= 66) return "success";
  if (s >= 33) return "warning";
  return "error";
});

const requestAdvance = async () => {
  const res = await apply(Number(requestedAmount.value));
  if (res) {
    requestedAmount.value = "";
    advances.value = await list();
  }
};

const acceptOffer = async (a: CashAdvance) => {
  if (await accept(a.id)) {
    advances.value = await list();
  }
};

const setMax = () => {
  if (elig.value) requestedAmount.value = String(Math.round(elig.value.maxAmount));
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

onMounted(async () => {
  loading.value = true;
  elig.value = await eligibility();
  advances.value = await list();
  loading.value = false;
});
</script>

<template>
  <div class="container mx-auto px-2 sm:px-4 py-4">
    <h1 class="text-2xl font-bold flex items-center gap-2 mb-1">
      <UIcon name="i-lucide-banknote" class="w-7 h-7 text-primary" />
      Avance de trésorerie
    </h1>
    <p class="text-gray-600 text-sm mb-6">
 Obtenez une avance sur vos ventes futures pour financer votre stock ou votre activité.
    </p>

    <div v-if="loading" class="text-center py-12 text-gray-500">
      <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin mx-auto mb-2" />
      Calcul de l'éligibilité...
    </div>

    <template v-else-if="elig">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <!-- Score -->
        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-500 mb-1">Score d'éligibilité</p>
            <div
class="text-5xl font-extrabold" :class="{
              'text-green-600': scoreColor === 'success',
              'text-amber-500': scoreColor === 'warning',
              'text-red-600': scoreColor === 'error',
            }">{{ elig.score }}</div>
            <UBadge :color="elig.eligible ? 'success' : 'error'" variant="subtle" class="mt-2">
              {{ elig.eligible ? "Éligible" : "Non éligible" }}
            </UBadge>
          </div>
        </UCard>

        <!-- Ventes moyennes -->
        <UCard>
          <p class="text-sm text-gray-500 mb-1">Ventes moyennes / mois</p>
          <div class="text-3xl font-bold text-gray-800">
            {{ Math.round(elig.averageMonthlySales).toLocaleString("fr-FR") }}
          </div>
          <p class="text-xs text-gray-400 mt-2">
            {{ elig.invoiceCount }} ventes · {{ elig.activeDays }} jours actifs (3 mois)
          </p>
        </UCard>

        <!-- Montant max -->
        <UCard>
          <p class="text-sm text-gray-500 mb-1">Avance maximale possible</p>
          <div class="text-3xl font-bold text-primary">
            {{ Math.round(elig.maxAmount).toLocaleString("fr-FR") }}
          </div>
          <p class="text-xs text-gray-400 mt-2">
            Frais {{ (elig.factorRate * 100).toFixed(0) }}% · remboursement {{ elig.termDays }} jours
          </p>
        </UCard>
      </div>

      <!-- Demande -->
      <UCard class="mb-6">
        <template #header>
          <h3 class="font-semibold">Demander une avance</h3>
        </template>
        <div v-if="!elig.eligible" class="text-sm text-gray-600">
          <p class="mb-2 font-medium">Pourquoi je ne suis pas encore éligible :</p>
          <ul class="list-disc list-inside space-y-1 text-gray-500">
            <li v-for="(r, i) in elig.reasons" :key="i">{{ r }}</li>
          </ul>
          <p class="mt-3 text-gray-400">
            Astuce : enregistrez régulièrement vos ventes dans l'application pour améliorer votre score.
          </p>
        </div>
        <div v-else>
          <div class="flex flex-col sm:flex-row sm:items-end gap-3">
            <UFormField label="Montant souhaité" class="flex-1">
              <UInput
                v-model="requestedAmount"
                type="number"
                step="0.01"
                :placeholder="`Max ${Math.round(elig.maxAmount).toLocaleString('fr-FR')}`"
                class="w-full"
              />
            </UFormField>
            <UButton variant="ghost" icon="i-lucide-arrow-up-to-line" label="Montant max" @click="setMax" />
          </div>

          <div v-if="Number(requestedAmount) > 0" class="mt-4 grid grid-cols-3 gap-3 text-center">
            <div class="bg-gray-50 rounded-lg p-3">
              <p class="text-xs text-gray-500">Avance</p>
              <p class="font-bold">{{ Math.round(preview.amount).toLocaleString("fr-FR") }}</p>
            </div>
            <div class="bg-amber-50 rounded-lg p-3">
              <p class="text-xs text-gray-500">Frais ({{ (elig.factorRate * 100).toFixed(0) }}%)</p>
              <p class="font-bold text-amber-600">{{ Math.round(preview.fee).toLocaleString("fr-FR") }}</p>
            </div>
            <div class="bg-green-50 rounded-lg p-3">
              <p class="text-xs text-gray-500">À rembourser</p>
              <p class="font-bold text-green-600">{{ Math.round(preview.repayment).toLocaleString("fr-FR") }}</p>
            </div>
          </div>

          <UButton
            color="primary"
            size="lg"
            icon="i-lucide-banknote"
            label="Demander l'avance"
            class="mt-4"
            :disabled="!canRequest"
            @click="requestAdvance"
          />
        </div>
      </UCard>

      <!-- Historique -->
      <UCard>
        <template #header>
          <h3 class="font-semibold">Mes demandes</h3>
        </template>
        <div v-if="!advances.length" class="text-center text-gray-400 py-6 text-sm">
          Aucune demande pour le moment.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="a in advances"
            :key="a.id"
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b last:border-0 pb-3 last:pb-0"
          >
            <div>
              <p class="font-medium">
                {{ Number(a.offered_amount ?? a.requested_amount).toLocaleString("fr-FR") }}
                <span class="text-xs text-gray-400 font-normal">
                  · à rembourser {{ Number(a.repayment_amount ?? 0).toLocaleString("fr-FR") }}
                </span>
              </p>
              <p class="text-xs text-gray-400 font-mono">{{ a.reference }} · {{ formatTime(a.created_at) }}</p>
            </div>
            <div class="flex items-center gap-2">
              <UBadge :color="statusColor[a.status] || 'neutral'" variant="subtle">
                {{ statusLabel[a.status] || a.status }}
              </UBadge>
              <UButton
                v-if="a.status === 'offered'"
                size="xs"
                color="success"
                label="Accepter"
                @click="acceptOffer(a)"
              />
            </div>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
