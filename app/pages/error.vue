<template>
  <div
    class="min-h-screen flex items-center justify-center px-4 py-10"
    :class="isCompanyBlocked ? 'bg-red-50' : 'bg-gray-50'"
  >
    <div class="max-w-2xl w-full space-y-6">
      <div class="text-center">
        <div
          class="mx-auto h-14 w-14"
          :class="isCompanyBlocked ? 'text-red-700' : 'text-red-600'"
        >
          <Icon
            :name="
              isCompanyBlocked
                ? 'heroicons:shield-exclamation-20-solid'
                : 'heroicons:exclamation-triangle-20-solid'
            "
            class="h-14 w-14"
          />
        </div>
        <h2 class="mt-5 text-center text-3xl font-extrabold text-gray-900">
          {{ pageTitle }}
        </h2>
        <p
          class="mt-2 text-center text-sm"
          :class="isCompanyBlocked ? 'text-red-700' : 'text-gray-600'"
        >
          {{ pageDescription }}
        </p>
      </div>

      <div
        class="rounded-xl border p-6 shadow-sm"
        :class="
          isCompanyBlocked
            ? 'bg-red-100 border-red-300'
            : 'bg-white border-gray-200'
        "
      >
        <h3
          class="text-lg font-semibold mb-3"
          :class="isCompanyBlocked ? 'text-red-900' : 'text-gray-900'"
        >
          Détails de votre accès
        </h3>

        <div class="space-y-3">
          <div>
            <span class="text-sm font-medium text-gray-600">Utilisateur :</span>
            <span class="ml-2 text-sm text-gray-900">{{
              userEmail || "Non identifié"
            }}</span>
          </div>

          <div>
            <span class="text-sm font-medium text-gray-600">Vos rôles :</span>
            <div class="ml-2 mt-1 flex flex-wrap gap-1">
              <RoleBadge
                v-for="role in userRoles"
                :key="role"
                :role-value="role"
                size="sm"
              />
              <span v-if="userRoles.length === 0" class="text-sm text-gray-400">
                Aucun rôle assigné
              </span>
            </div>
          </div>

          <div v-if="detailMessage">
            <span class="text-sm font-medium text-gray-600">Motif :</span>
            <p
              class="ml-2 text-sm"
              :class="isCompanyBlocked ? 'text-red-800' : 'text-red-600'"
            >
              {{ detailMessage }}
            </p>
          </div>

          <div
            v-if="isCompanyBlocked"
            class="mt-4 rounded-lg bg-white/70 border border-red-300 p-3"
          >
            <p class="text-sm text-red-900 font-medium">Action recommandée</p>
            <p class="text-sm text-red-800 mt-1">
              Contactez votre administrateur pour régulariser l'abonnement ou
              lever le blocage global de l'entreprise.
            </p>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-3 justify-center">
        <UButton
          to="/"
          variant="solid"
          color="primary"
          icon="heroicons:arrow-left-20-solid"
        >
          Retour à l'accueil
        </UButton>
        <UButton
          v-if="isCompanyBlocked"
          variant="outline"
          color="neutral"
          icon="heroicons:arrow-right-on-rectangle-20-solid"
          @click="handleLogout"
        >
          Se déconnecter
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const supabase = useSupabaseClient();
const { userRoles, userEmail } = useCurrentUser();

const error = useError();

const reason = computed(() => {
  const value = route.query.reason;
  return typeof value === "string" ? value : "";
});

const routeMessage = computed(() => {
  const value = route.query.message;
  return typeof value === "string" ? value : "";
});

const detailMessage = computed(() => {
  return error.value?.statusMessage || routeMessage.value || "";
});

const isCompanyBlocked = computed(() => {
  if (reason.value === "company_blocked") return true;
  return /entreprise.*bloqu|bloqu.*entreprise/i.test(detailMessage.value);
});

const pageTitle = computed(() => {
  if (isCompanyBlocked.value) return "Entreprise temporairement bloquée";
  return "Accès refusé";
});

const pageDescription = computed(() => {
  if (isCompanyBlocked.value) {
    return "L'accès est suspendu pour votre entreprise jusqu'à régularisation.";
  }
  return "Vous n'avez pas les permissions nécessaires pour accéder à cette page.";
});

const handleLogout = async () => {
  await supabase.auth.signOut();
  await navigateTo("/login");
};

// Meta pour la page
useHead({
  title: "Accès - App Gestion",
  meta: [
    {
      name: "description",
      content: "Statut d'accès et blocage d'entreprise",
    },
  ],
});
</script>
