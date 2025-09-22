<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSupabaseClient } from "#imports";

const router = useRouter();
const route = useRoute();

const companyId = route.params.id as string;
const supabase = useSupabaseClient();

interface Company {
  id: string;
  company_name: string;
  company_phone: string;
  company_address: string;
  company_email: string;
  company_website: string;
  currency?: string;
}

const company = ref<Company | null>(null);
const loading = ref(false);
const error = ref("");

const blockedMenus = ref<string[]>([]);
const lastUpdate = ref<Date | null>(null);
const allMenus = [
  "Accueil",
  "Stock",
  "Clients",
  "Commandes",
  "Facture",
  "Caisse",
  "Utilisateurs",
  "Rapports",
  "Discussion",
  "Paramètres",
  "Aide",
];
const menuActionLoading = ref<string | null>(null);

// Mapping menu -> path principal
const menuToPath: Record<string, string> = {
  Accueil: "/",
  Stock: "/stock",
  Clients: "/client",
  Commandes: "/commande",
  Facture: "/facture",
  Caisse: "/caisse",
  Utilisateurs: "/utilisateurs",
  Rapports: "/rapports",
  Discussion: "/discussion",
  Paramètres: "/parametres",
  Aide: "/aide",
};

async function fetchCompanyInfo() {
  loading.value = true;
  error.value = "";
  let result = await supabase
    .from("company_settings")
    .select("*")
    .eq("id", companyId)
    .single();
  if (
    result.error &&
    result.error.message.includes('relation "public.companies" does not exist')
  ) {
    result = await supabase
      .from("company")
      .select("id, company_name, company_phone, company_address, company_email")
      .eq("id", companyId)
      .single();
  }
  const { data, error: supaError } = result;
  if (!supaError && data) {
    company.value = data as Company;
  } else {
    error.value = supaError?.message || "Erreur lors du chargement";
  }
  loading.value = false;
}

async function fetchBlockedMenus() {
  const { data, error: supaError } = await supabase
    .from("company_settings")
    .select("blocked_menus, updated_at")
    .eq("id", companyId)
    .single();
  type BlockedMenusResponse = { blocked_menus?: string[]; updated_at?: string };
  const typedData = data as BlockedMenusResponse | null;
  const blockedMenusArr = typedData?.blocked_menus;
  if (!supaError && Array.isArray(blockedMenusArr)) {
    blockedMenus.value = blockedMenusArr;
    lastUpdate.value = typedData?.updated_at
      ? new Date(typedData.updated_at)
      : null;
  } else {
    blockedMenus.value = [];
    lastUpdate.value = null;
  }
}

async function setMenuStatus(menu: string, blocked: boolean) {
  menuActionLoading.value = menu;
  let newBlockedMenus: string[];
  if (blocked) {
    newBlockedMenus = [...blockedMenus.value, menu];
  } else {
    newBlockedMenus = blockedMenus.value.filter((m) => m !== menu);
  }
  const { error: supaError } = await supabase
    .from("company_settings")
    .update({ blocked_menus: newBlockedMenus })
    .eq("id", companyId);
  menuActionLoading.value = null;
  if (!supaError) {
    blockedMenus.value = newBlockedMenus;
    lastUpdate.value = new Date();
  } else {
    error.value = supaError?.message || "Erreur lors de la mise à jour";
    // Optionnel : toast error si tu utilises un composant de toast
    // if (window?.$nuxt?.$toast) window.$nuxt.$toast.error(error.value);
  }
}

onMounted(async () => {
  await fetchCompanyInfo();
  await fetchBlockedMenus();

  // Bloque dynamiquement l'accès aux pages des menus désactivés
  if (blockedMenus.value.length > 0) {
    const blockedPaths = blockedMenus.value
      .map((menu) => menuToPath[menu])
      .filter(Boolean);
    if (
      blockedPaths.some(
        (p) => route.path === p || route.path.startsWith(p + "/")
      )
    ) {
      router.replace({
        path: "/error",
        query: {
          message:
            "Vous n'avez pas le droit d'accéder à cette page. Contactez votre administrateur.",
        },
      });
    }
  }
});
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-4">
      <div
        class="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100"
      >
        <UIcon
          name="heroicons:building-office-2-20-solid"
          class="h-10 w-10 text-blue-500"
        />
      </div>
      <div>
        <h1 class="text-3xl font-bold text-gray-900">
          {{ company?.company_name || "..." }}
        </h1>
      </div>
      <div v-if="lastUpdate" class="ml-auto text-xs text-gray-400">
        <UIcon
          name="heroicons:clock-20-solid"
          class="inline-block h-4 w-4 mr-1"
        />
        Dernière modification: {{ lastUpdate.toLocaleString() }}
      </div>
    </div>

    <!-- Loader -->
    <div v-if="loading" class="text-gray-500 animate-pulse">
      <div class="h-6 bg-gray-200 rounded w-1/3 mb-2" />
      <div class="h-4 bg-gray-100 rounded w-1/2 mb-2" />
      <div class="h-4 bg-gray-100 rounded w-1/4 mb-2" />
      <div class="h-4 bg-gray-100 rounded w-1/3 mb-2" />
    </div>

    <!-- Error -->
    <div v-if="error" class="mb-4">
      <div
        class="bg-red-100 text-red-700 px-4 py-2 rounded flex items-center gap-2"
      >
        <UIcon name="heroicons:exclamation-triangle-20-solid" class="h-5 w-5" />
        <span>{{ error }}</span>
      </div>
    </div>

    <!-- Info + Menus -->
    <div v-if="company" class="flex flex-col gap-4 mb-10">
      <div
        class="bg-white shadow rounded-lg p-6 flex flex-col md:flex-row gap-8 items-start"
      >
        <div>
          <h2 class="text-lg font-semibold mb-2">Informations</h2>
          <div class="mb-1">
            <span class="font-medium">Téléphone :</span>
            {{ company.company_phone }}
          </div>
          <div class="mb-1">
            <span class="font-medium">Adresse :</span>
            {{ company.company_address }}
          </div>
          <div class="mb-1">
            <span class="font-medium">Email :</span> {{ company.company_email }}
          </div>
          <div class="mb-1">
            <span class="font-medium">Site Web :</span>
            {{ company.company_website }}
          </div>
          <div class="mb-1">
            <span class="font-medium">Devise :</span> {{ company.currency }}
          </div>
        </div>
      </div>
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-semibold mb-2">Statut des menus</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <div
            v-for="menu in allMenus"
            :key="menu"
            class="flex flex-row items-center justify-between bg-gray-50 rounded-xl px-6 py-5 shadow-sm hover:shadow-md transition group min-h-[80px]"
          >
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <UIcon
                :name="
                  blockedMenus.includes(menu)
                    ? 'heroicons:lock-closed-20-solid'
                    : 'heroicons:check-circle-20-solid'
                "
                :class="
                  blockedMenus.includes(menu)
                    ? 'text-red-500'
                    : 'text-green-500'
                "
                class="h-6 w-6 mr-2 flex-shrink-0"
              />
              <span class="font-medium text-gray-800 truncate">{{ menu }}</span>
              <span
                :class="
                  blockedMenus.includes(menu)
                    ? 'text-red-500 font-semibold'
                    : 'text-green-600 font-semibold'
                "
                class="ml-2 text-xs flex-shrink-0"
              >
                {{ blockedMenus.includes(menu) ? "Bloqué" : "Actif" }}
              </span>
            </div>
            <div class="flex items-center justify-center" style="width: 90px">
              <label
                class="inline-flex items-center cursor-pointer"
                :title="
                  blockedMenus.includes(menu)
                    ? 'Ce menu est bloqué pour cette compagnie'
                    : 'Ce menu est actif'
                "
              >
                <input
                  type="checkbox"
                  class="sr-only peer"
                  :checked="blockedMenus.includes(menu)"
                  :disabled="menuActionLoading === menu"
                  @change="
                    setMenuStatus(
                      menu,
                      !($event.target as HTMLInputElement).checked
                    )
                  "
                >
                <div
                  class="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500 transition-all duration-200 relative"
                >
                  <div
                    :class="
                      blockedMenus.includes(menu)
                        ? 'translate-x-6 bg-red-500'
                        : 'translate-x-1 bg-green-500'
                    "
                    class="h-5 w-5 rounded-full shadow transform transition-transform duration-200 absolute top-0 left-0"
                    style="margin-top: 0.5px"
                  />
                  <span
                    v-if="menuActionLoading === menu"
                    class="absolute right-1 top-1/2 -translate-y-1/2"
                  >
                    <svg
                      class="animate-spin h-4 w-4 text-blue-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      />
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>
        <p class="mt-4 text-sm text-gray-500">
          Utilisez le switch pour activer ou bloquer chaque menu. Le statut est
          sauvegardé et affiché après chaque rafraîchissement.
        </p>
      </div>
    </div>
  </div>
</template>
