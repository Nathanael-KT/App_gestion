<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

definePageMeta({ layout: "sansmenu" });

const route = useRoute();
const id = computed(() => String(route.params.id));

interface PaymentDetail {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  merchantName: string;
  expiresAt?: string | null;
  paidAt?: string | null;
}
interface DetailResponse {
  payment: PaymentDetail;
  providers: { mtn: boolean; orange: boolean };
}

const loading = ref(true);
const notFound = ref(false);
const payment = ref<PaymentDetail | null>(null);
const providers = ref<{ mtn: boolean; orange: boolean }>({ mtn: false, orange: false });

const provider = ref<"mtn" | "orange">("mtn");
const phone = ref("");
const initiating = ref(false);
const mode = ref<"live" | "demo" | null>(null);
const paymentUrl = ref<string | null>(null);
const message = ref<string | null>(null);
let pollTimer: ReturnType<typeof setInterval> | null = null;

const isPaid = computed(() => payment.value?.status === "success");
const isExpired = computed(
  () => payment.value?.status === "expired" || payment.value?.status === "cancelled",
);
const isDemo = computed(() => mode.value === "demo");
const noProviderConfigured = computed(() => !providers.value.mtn && !providers.value.orange);

const load = async () => {
  loading.value = true;
  try {
    const res = await $fetch<DetailResponse>(`/api/payments/${id.value}`);
    payment.value = res.payment;
    providers.value = res.providers;
    // Si déjà en cours d'initiation live, reprendre le polling
    if (res.payment.status === "initiated") {
      startPolling();
    }
  } catch {
    notFound.value = true;
  } finally {
    loading.value = false;
  }
};

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

const poll = async () => {
  try {
    const res = await $fetch<DetailResponse>(`/api/payments/${id.value}`);
    payment.value = res.payment;
    if (["success", "failed", "cancelled", "expired"].includes(res.payment.status)) {
      stopPolling();
    }
  } catch {
    // ignore
  }
};

const startPolling = () => {
  stopPolling();
  pollTimer = setInterval(poll, 2500);
};

const pay = async () => {
  if (!phone.value || phone.value.replace(/[^\d]/g, "").length < 8) {
    message.value = "Entrez un numéro de téléphone valide.";
    return;
  }
  initiating.value = true;
  message.value = null;
  try {
    const res = await $fetch<{
      ok: boolean;
      status: string;
      mode: "live" | "demo";
      paymentUrl?: string | null;
      message?: string | null;
    }>(`/api/payments/${id.value}/initiate`, {
      method: "POST",
      body: { provider: provider.value, customerPhone: phone.value },
    });
    mode.value = res.mode;
    paymentUrl.value = res.paymentUrl ?? null;
    message.value = res.message ?? null;
    if (payment.value) payment.value.status = res.status;

    if (res.mode === "live" && res.paymentUrl) {
      // Orange : rediriger vers la page de paiement opérateur
      window.location.href = res.paymentUrl;
      return;
    }
    if (res.status !== "success") {
      startPolling();
    }
  } catch (err) {
    const e = err as { data?: { statusMessage?: string } };
    message.value = e?.data?.statusMessage || "Paiement impossible. Réessayez.";
  } finally {
    initiating.value = false;
  }
};

const simulate = async () => {
  try {
    await $fetch(`/api/payments/${id.value}/simulate`, { method: "POST" });
    await poll();
  } catch {
    message.value = "Simulation impossible.";
  }
};

onMounted(load);
onBeforeUnmount(stopPolling);
</script>

<template>
  <div class="max-w-md mx-auto">
    <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
      <!-- En-tête -->
      <div class="bg-primary text-white px-6 py-5 text-center">
        <UIcon name="i-lucide-qr-code" class="w-8 h-8 mx-auto mb-1" />
        <h1 class="text-lg font-bold">Paiement mobile</h1>
        <p class="text-sm opacity-90">{{ payment?.merchantName }}</p>
      </div>

      <div class="p-6">
        <!-- Chargement -->
        <div v-if="loading" class="text-center py-10 text-gray-400">
          <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin mx-auto mb-2" />
          Chargement...
        </div>

        <!-- Introuvable -->
        <div v-else-if="notFound" class="text-center py-10">
          <UIcon name="i-lucide-circle-x" class="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p class="text-gray-600">Ce paiement est introuvable ou a expiré.</p>
        </div>

        <!-- Payé -->
        <div v-else-if="isPaid" class="text-center py-6">
          <UIcon name="i-lucide-circle-check-big" class="w-20 h-20 text-green-500 mx-auto mb-3" />
          <h2 class="text-xl font-bold text-green-600">Paiement réussi</h2>
          <p class="text-3xl font-extrabold my-2">
            {{ payment?.amount.toFixed(2) }} {{ payment?.currency }}
          </p>
          <p class="text-sm text-gray-500">Référence : {{ payment?.reference }}</p>
          <p class="text-xs text-gray-400 mt-2">Merci ! Vous pouvez fermer cette page.</p>
        </div>

        <!-- Expiré / annulé -->
        <div v-else-if="isExpired" class="text-center py-10">
          <UIcon name="i-lucide-clock-alert" class="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p class="text-gray-600">Ce paiement n'est plus disponible (expiré ou annulé).</p>
        </div>

        <!-- Choix du paiement -->
        <div v-else>
          <div class="text-center mb-5">
            <p class="text-sm text-gray-500">Montant à payer</p>
            <p class="text-4xl font-extrabold text-gray-900">
              {{ payment?.amount.toFixed(2) }}
              <span class="text-xl">{{ payment?.currency }}</span>
            </p>
            <p class="text-xs text-gray-400 mt-1">Réf. {{ payment?.reference }}</p>
          </div>

          <p class="text-sm font-medium text-gray-700 mb-2">Choisissez votre opérateur</p>
          <div class="grid grid-cols-2 gap-3 mb-4">
            <button
              class="border-2 rounded-xl p-3 text-center transition-all"
              :class="provider === 'mtn' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'"
              :disabled="!providers.mtn"
              @click="providers.mtn ? (provider = 'mtn') : null"
            >
              <div class="font-bold text-yellow-600">MTN</div>
              <div class="text-xs text-gray-500">MoMo</div>
              <div v-if="!providers.mtn" class="text-[10px] text-gray-400">(démo)</div>
            </button>
            <button
              class="border-2 rounded-xl p-3 text-center transition-all"
              :class="provider === 'orange' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'"
              :disabled="!providers.orange"
              @click="providers.orange ? (provider = 'orange') : null"
            >
              <div class="font-bold text-orange-600">Orange</div>
              <div class="text-xs text-gray-500">Money</div>
              <div v-if="!providers.orange" class="text-[10px] text-gray-400">(démo)</div>
            </button>
          </div>

          <UFormField label="Votre numéro de téléphone" class="mb-4">
            <UInput
              v-model="phone"
              type="tel"
              placeholder="Ex : 0701020304"
              class="w-full"
            />
          </UFormField>

          <UButton
            color="primary"
            size="lg"
            block
            :loading="initiating"
            :label="initiating ? 'Traitement...' : 'Payer maintenant'"
            icon="i-lucide-smartphone"
            @click="pay"
          />

          <div v-if="message" class="mt-3 text-sm text-center text-amber-600">
            {{ message }}
          </div>

          <!-- Mode démo -->
          <UAlert
            v-if="noProviderConfigured"
            icon="i-lucide-info"
            color="info"
            variant="subtle"
            title="Mode démonstration"
            description="Opérateurs non configurés : testez le flux avec le bouton ci-dessous."
            class="mt-4"
          />
          <UButton
            v-if="isDemo"
            color="success"
            variant="soft"
            block
            icon="i-lucide-check"
            label="Simuler le paiement (démo)"
            class="mt-3"
            @click="simulate"
          />

          <div v-if="payment?.status === 'initiated' && !isDemo" class="mt-4 text-center text-sm text-blue-600 flex items-center justify-center gap-2">
            <UIcon name="i-lucide-loader-circle" class="w-4 h-4 animate-spin" />
            Validation en cours sur votre téléphone...
          </div>
        </div>
      </div>

      <div class="px-6 py-3 bg-gray-50 text-center text-xs text-gray-400">
        Paiement sécurisé · MTN MoMo · Orange Money
      </div>
    </div>
  </div>
</template>
