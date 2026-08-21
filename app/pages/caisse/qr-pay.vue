<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useQrPayment, type QrPaymentHistory } from "~/composables/useQrPayment";

definePageMeta({ middleware: "auth" });

type BadgeColor = "error" | "info" | "success" | "primary" | "secondary" | "warning" | "neutral";

const { create, cancel, list } = useQrPayment();

const amount = ref<string>("");
const currency = ref("XOF");
const customerName = ref("");
const note = ref("");

const creating = ref(false);
const session = ref<{ id: string; reference: string; paymentUrl: string; amount: number; currency: string } | null>(null);
const status = ref<string>("pending");
let pollTimer: ReturnType<typeof setInterval> | null = null;

const history = ref<QrPaymentHistory[]>([]);

const currencies = [
  { label: "XOF — Franc CFA (UEMOA)", value: "XOF" },
  { label: "XAF — Franc CFA (CEMAC)", value: "XAF" },
  { label: "EUR — Euro", value: "EUR" },
  { label: "GHS — Cedi (Ghana)", value: "GHS" },
  { label: "UGX — Shilling (Ouganda)", value: "UGX" },
  { label: "USD — Dollar", value: "USD" },
];

const statusColor: Record<string, BadgeColor> = {
  pending: "warning",
  initiated: "info",
  success: "success",
  failed: "error",
  cancelled: "neutral",
  expired: "neutral",
};

const statusLabel: Record<string, string> = {
  pending: "En attente de paiement",
  initiated: "Paiement en cours...",
  success: "Paiement réussi ✅",
  failed: "Paiement échoué",
  cancelled: "Annulé",
  expired: "Expiré",
};

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

const pollStatus = async () => {
  if (!session.value) return;
  try {
    const res = await $fetch<{ payment: { status: string } }>(
      `/api/payments/${session.value.id}`,
    );
    status.value = res.payment.status;
    if (["success", "failed", "cancelled", "expired"].includes(status.value)) {
      stopPolling();
      await loadHistory();
    }
  } catch {
    // ignore les erreurs ponctuelles de polling
  }
};

const generate = async () => {
  const amt = Number(amount.value);
  if (!Number.isFinite(amt) || amt <= 0) return;
  creating.value = true;
  stopPolling();
  const s = await create({
    amount: amt,
    currency: currency.value,
    customerName: customerName.value || undefined,
    note: note.value || undefined,
  });
  creating.value = false;
  if (s) {
    session.value = {
      id: s.id,
      reference: s.reference,
      paymentUrl: s.paymentUrl,
      amount: s.amount,
      currency: s.currency,
    };
    status.value = "pending";
    pollTimer = setInterval(pollStatus, 2500);
  }
};

const cancelSession = async () => {
  if (!session.value) return;
  if (await cancel(session.value.id)) {
    stopPolling();
    status.value = "cancelled";
    await loadHistory();
  }
};

const newPayment = () => {
  stopPolling();
  session.value = null;
  status.value = "pending";
  amount.value = "";
  customerName.value = "";
  note.value = "";
};

const loadHistory = async () => {
  history.value = await list();
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

onMounted(loadHistory);
onBeforeUnmount(stopPolling);

const showQr = computed(() => session.value && status.value !== "success");
const showSuccess = computed(() => status.value === "success");
</script>

<template>
  <div class="container mx-auto px-2 sm:px-4 py-4">
    <h1 class="text-2xl font-bold flex items-center gap-2 mb-1">
      <UIcon name="i-lucide-qr-code" class="w-7 h-7 text-primary" />
      Paiement par QR code
    </h1>
    <p class="text-gray-600 text-sm mb-6">
      Le client scanne le QR et paie avec MTN MoMo ou Orange Money depuis son téléphone.
    </p>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Colonne gauche : saisie -->
      <UCard>
        <template #header>
          <h3 class="font-semibold">Nouveau paiement</h3>
        </template>

        <div class="space-y-4">
          <UFormField label="Montant à encaisser" required>
            <UInput
              v-model="amount"
              type="number"
              step="0.01"
              placeholder="0"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Devise">
            <USelect v-model="currency" :items="currencies" class="w-full" />
          </UFormField>

          <UFormField label="Nom du client (optionnel)">
            <UInput v-model="customerName" placeholder="Client de passage" class="w-full" />
          </UFormField>

          <UFormField label="Note (optionnel)">
            <UInput v-model="note" placeholder="Ex: Commande #123" class="w-full" />
          </UFormField>

          <UButton
            color="primary"
            size="lg"
            block
            icon="i-lucide-qr-code"
            :loading="creating"
            label="Générer le QR code"
            :disabled="creating"
            @click="generate"
          />
        </div>
      </UCard>

      <!-- Colonne droite : QR / statut -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Suivi du paiement</h3>
            <UBadge
              v-if="session"
              :color="statusColor[status] || 'neutral'"
              variant="subtle"
            >
              {{ statusLabel[status] || status }}
            </UBadge>
          </div>
        </template>

        <div v-if="!session" class="text-center py-12 text-gray-400">
          <UIcon name="i-lucide-qr-code" class="w-16 h-16 mx-auto mb-3" />
          <p>Générez un QR code pour démarrer.</p>
        </div>

        <div v-else-if="showSuccess" class="text-center py-8">
          <UIcon name="i-lucide-circle-check-big" class="w-20 h-20 text-green-500 mx-auto mb-3" />
          <h3 class="text-xl font-bold text-green-600">
            {{ session.amount.toFixed(2) }} {{ session.currency }}
          </h3>
          <p class="text-gray-500 text-sm mb-4">Paiement reçu avec succès</p>
          <UButton color="primary" icon="i-lucide-plus" label="Nouveau paiement" @click="newPayment" />
        </div>

        <div v-else-if="showQr" class="text-center">
          <QRCodeDisplay :value="session.paymentUrl" :size="240" class="mx-auto mb-4" />
          <p class="text-sm text-gray-500 mb-1">Référence : <span class="font-mono">{{ session.reference }}</span></p>
          <p class="text-2xl font-bold mb-3">{{ session.amount.toFixed(2) }} {{ session.currency }}</p>
          <p class="text-sm text-gray-600 mb-4">
            Demandez au client de scanner le QR avec son téléphone, puis de payer via MTN MoM / Orange Money.
          </p>
          <div class="flex gap-2 justify-center">
            <UButton variant="ghost" icon="i-lucide-x" label="Annuler" @click="cancelSession" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Historique -->
    <UCard class="mt-6">
      <template #header>
        <h3 class="font-semibold">Paiements récents</h3>
      </template>
      <div v-if="!history.length" class="text-center text-gray-400 py-6 text-sm">
        Aucun paiement pour le moment.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-gray-500 border-b">
            <tr>
              <th class="py-2 pr-3">Référence</th>
              <th class="py-2 pr-3">Montant</th>
              <th class="py-2 pr-3">Opérateur</th>
              <th class="py-2 pr-3">Statut</th>
              <th class="py-2 pr-3">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in history" :key="p.id" class="border-b last:border-0">
              <td class="py-2 pr-3 font-mono text-xs">{{ p.reference }}</td>
              <td class="py-2 pr-3 font-semibold">{{ Number(p.amount).toFixed(2) }} {{ p.currency }}</td>
              <td class="py-2 pr-3 uppercase text-xs">{{ p.provider || "—" }}</td>
              <td class="py-2 pr-3">
                <UBadge :color="statusColor[p.status] || 'neutral'" variant="subtle" size="sm">
                  {{ statusLabel[p.status] || p.status }}
                </UBadge>
              </td>
              <td class="py-2 pr-3 text-xs text-gray-500">{{ formatTime(p.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>
