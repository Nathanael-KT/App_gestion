<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useCurrentUser } from "../../composables/useCurrentUser";

definePageMeta({ middleware: ["auth"] });

interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  interval: string;
  features: string[];
}

interface CurrentSubscription {
  is_paid: boolean;
  status: string;
  next_due_date: string | null;
  cancel_at_period_end: boolean;
  plan_id: string | null;
}

const supabase = useSupabaseClient() as ReturnType<typeof useSupabaseClient<any>>;
const route = useRoute();
const { companyId, isLoadingUser, loadCurrentUser } = useCurrentUser();

const plans = ref<Plan[]>([]);
const currentSub = ref<CurrentSubscription | null>(null);
const loading = ref(true);
const actionLoading = ref<string | null>(null); // slug du plan en cours de traitement
const error = ref<string | null>(null);

const checkoutStatus = computed(() => route.query.checkout as string | undefined);

// Raison d'arrivée sur cette page quand l'accès à l'application est
// restreint (middleware global) : la personne ne peut rien faire d'autre
// tant que l'abonnement n'est pas payé/valide.
const accessReason = computed(() => route.query.reason as string | undefined);

const accessReasonMessage = computed(() => {
  switch (accessReason.value) {
    case "subscription_required":
      return {
        title: "Abonnement requis",
        description:
          "Votre entreprise n'a pas encore d'abonnement actif. Choisissez une offre ci-dessous pour débloquer l'accès à l'application. Seul un administrateur de votre entreprise peut souscrire.",
        color: "warning" as const,
        icon: "i-heroicons-lock-closed",
      };
    case "subscription_overdue":
      return {
        title: "Échéance dépassée",
        description:
          "Le paiement de votre abonnement n'a pas été reçu (échéance dépassée). Régularisez ci-dessous : l'accès à l'application est rétabli automatiquement dès le paiement confirmé.",
        color: "error" as const,
        icon: "i-heroicons-exclamation-circle",
      };
    case "subscription_blocked":
      return {
        title: "Abonnement bloqué pour non-paiement",
        description:
          "L'accès de votre entreprise est suspendu. Régularisez votre abonnement ci-dessous : le déblocage est automatique après paiement. Si vous pensez qu'il s'agit d'une erreur, contactez le support.",
        color: "error" as const,
        icon: "i-heroicons-no-symbol",
      };
    default:
      return null;
  }
});

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

async function loadData() {
  loading.value = true;
  error.value = null;
  try {
    const { data: plansData, error: plansError } = await supabase
      .from("subscription_plans")
      .select("id, slug, name, description, price_cents, currency, interval, features")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (plansError) throw plansError;
    plans.value = (plansData as Plan[]) || [];

    if (companyId.value) {
      const { data: subData } = await supabase
        .from("company_subscription")
        .select("is_paid, status, next_due_date, cancel_at_period_end, plan_id")
        .eq("company_id", companyId.value)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      currentSub.value = (subData as CurrentSubscription) ?? null;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Erreur de chargement";
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  if (isLoadingUser.value) await loadCurrentUser();
  await loadData();
});

async function subscribeToPlan(planSlug: string) {
  actionLoading.value = planSlug;
  try {
    const { data: sessionResp } = await supabase.auth.getSession();
    const token = sessionResp.session?.access_token;

    const res = await $fetch<{ checkoutUrl: string }>(
      "/api/stripe/create-checkout-session",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: { planSlug },
      }
    );
    if (res.checkoutUrl) {
      window.location.href = res.checkoutUrl;
    }
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Impossible de lancer le paiement";
  } finally {
    actionLoading.value = null;
  }
}

async function openBillingPortal() {
  actionLoading.value = "portal";
  try {
    const { data: sessionResp } = await supabase.auth.getSession();
    const token = sessionResp.session?.access_token;

    const res = await $fetch<{ portalUrl: string }>(
      "/api/stripe/create-portal-session",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (res.portalUrl) {
      window.location.href = res.portalUrl;
    }
  } catch (err) {
    error.value =
      err instanceof Error
        ? err.message
        : "Impossible d'ouvrir le portail de facturation";
  } finally {
    actionLoading.value = null;
  }
}

function isCurrentPlan(planId: string) {
  return currentSub.value?.plan_id === planId && currentSub.value?.is_paid;
}
</script>

<template>
  <div class="w-full min-h-screen bg-gradient-to-br from-blue-50 to-white px-4 py-10">
    <div class="max-w-5xl mx-auto">
      <div class="text-center mb-10">
        <h1 class="text-3xl font-extrabold text-gray-900 mb-2">
          Abonnement
        </h1>
        <p class="text-gray-500">
          Choisissez l'offre adaptée à votre entreprise. Paiement sécurisé
          par Stripe, sans engagement.
        </p>
      </div>

      <UAlert
        v-if="accessReasonMessage"
        :icon="accessReasonMessage.icon"
        :color="accessReasonMessage.color"
        variant="soft"
        :title="accessReasonMessage.title"
        :description="accessReasonMessage.description"
        class="mb-6"
      />
      <UAlert
        v-if="checkoutStatus === 'success'"
        icon="i-heroicons-check-circle"
        color="success"
        variant="soft"
        title="Paiement confirmé"
        description="Votre abonnement est en cours d'activation, cela peut prendre quelques secondes. Rechargez la page si besoin."
        class="mb-6"
      />
      <UAlert
        v-else-if="checkoutStatus === 'cancelled'"
        icon="i-heroicons-information-circle"
        color="neutral"
        variant="soft"
        title="Paiement annulé"
        description="Aucun montant n'a été débité. Vous pouvez réessayer à tout moment."
        class="mb-6"
      />
      <UAlert
        v-if="error"
        icon="i-heroicons-exclamation-triangle"
        color="error"
        variant="soft"
        :title="error"
        class="mb-6"
      />

      <div v-if="loading" class="flex justify-center py-16">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
      </div>

      <template v-else>
        <!-- Statut actuel -->
        <div
          v-if="currentSub"
          class="mb-8 rounded-xl border bg-white p-5 flex items-center justify-between shadow-sm"
        >
          <div class="flex items-center gap-3">
            <UIcon
              :name="currentSub.is_paid ? 'i-heroicons-check-badge' : 'i-heroicons-exclamation-circle'"
              :class="currentSub.is_paid ? 'text-green-500' : 'text-amber-500'"
              class="w-8 h-8"
            />
            <div>
              <p class="font-semibold text-gray-800">
                {{
                  currentSub.is_paid
                    ? "Abonnement actif"
                    : "Aucun abonnement actif"
                }}
              </p>
              <p v-if="currentSub.next_due_date" class="text-sm text-gray-500">
                Prochaine échéance : {{ currentSub.next_due_date }}
                <span v-if="currentSub.cancel_at_period_end" class="text-amber-600">
                  (annulation programmée à cette date)
                </span>
              </p>
            </div>
          </div>
          <UButton
            v-if="currentSub.is_paid"
            variant="outline"
            :loading="actionLoading === 'portal'"
            @click="openBillingPortal"
          >
            Gérer mon abonnement
          </UButton>
        </div>

        <!-- Cartes de plans -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            v-for="plan in plans"
            :key="plan.id"
            class="relative rounded-2xl border bg-white p-6 shadow-sm flex flex-col"
            :class="plan.slug === 'pro' ? 'border-primary-400 ring-1 ring-primary-200' : 'border-gray-200'"
          >
            <UBadge
              v-if="plan.slug === 'pro'"
              color="primary"
              variant="soft"
              class="absolute -top-3 left-6"
            >
              Recommandé
            </UBadge>

            <h3 class="text-lg font-bold text-gray-900">{{ plan.name }}</h3>
            <p class="text-sm text-gray-500 mt-1 mb-4">{{ plan.description }}</p>

            <div class="mb-6">
              <span class="text-3xl font-extrabold text-gray-900">
                {{ formatPrice(plan.price_cents, plan.currency) }}
              </span>
              <span class="text-gray-500">
                / {{ plan.interval === "month" ? "mois" : "an" }}
              </span>
            </div>

            <ul class="space-y-2 mb-6 flex-1">
              <li
                v-for="feature in plan.features"
                :key="feature"
                class="flex items-center gap-2 text-sm text-gray-700"
              >
                <UIcon name="i-heroicons-check" class="w-4 h-4 text-green-500 shrink-0" />
                {{ feature }}
              </li>
            </ul>

            <UButton
              :disabled="isCurrentPlan(plan.id)"
              :loading="actionLoading === plan.slug"
              :variant="plan.slug === 'pro' ? 'solid' : 'outline'"
              block
              size="lg"
              @click="subscribeToPlan(plan.slug)"
            >
              {{ isCurrentPlan(plan.id) ? "Offre actuelle" : "S'abonner" }}
            </UButton>
          </div>
        </div>

        <p class="text-center text-xs text-gray-400 mt-8">
          Paiement sécurisé par Stripe. Vous pouvez annuler à tout moment
          depuis "Gérer mon abonnement".
        </p>
      </template>
    </div>
  </div>
</template>
