<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import MagasinSelector from "./MagasinSelector.vue";
import { useCompanySettings } from "../composables/useCompanySettings";
import { useDashboardData } from "../composables/useDashboardData";

const { companyId, magasinId } = useCurrentUser();
const user = useSupabaseUser();
const supabase = useSupabaseClient() as any;
const emit = defineEmits(["toggleMobileMenu"]);

const userRoles = ref<string[]>([]);
const isLoadingRoles = ref(true);
const isSuperAdmin = computed(() => userRoles.value.includes("super_admin"));

// Notifications
const notifications = ref<
  Array<{ id: string; type: string; message: string; time?: string }>
>([]);

const { stockAlerts } = useDashboardData();
const newForumMessage = ref(false);
const voiceOpen = ref(false);

function checkCaisseFermeture() {
  const now = new Date();
  if (now.getHours() === 17 && now.getMinutes() >= 30) {
    notifications.value.push({
      id: "fermeture-caisse",
      type: "caisse",
      message: "Veuillez fermer la caisse à 17h30.",
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  }
}

const loadUserRoles = async () => {
  if (!user.value) {
    userRoles.value = [];
    isLoadingRoles.value = false;
    return;
  }
  try {
    const { data, error } = await (supabase as any)
      .from("users")
      .select("roles")
      .eq("auth_user_id", user.value.id)
      .single();

    if (error) {
      userRoles.value = ["employe"];
    } else {
      userRoles.value = data?.roles || ["employe"];
    }
  } catch {
    userRoles.value = ["employe"];
  } finally {
    isLoadingRoles.value = false;
  }
};

watch(
  user,
  (newUser) => {
    if (newUser) loadUserRoles();
    else {
      userRoles.value = [];
      isLoadingRoles.value = false;
    }
  },
  { immediate: true }
);

watch(stockAlerts, (alerts) => {
  if (alerts && alerts.length > 0) {
    notifications.value = notifications.value.filter((n) => n.type !== "stock");
    alerts.forEach((alert, idx) => {
      notifications.value.push({
        id: `stock-${idx}`,
        type: "stock",
        message: `Alerte stock: ${alert.product_name} (${alert.message})`,
      });
    });
  }
});

async function checkForumMessages() {
  if (!companyId.value) return;
  const { data, error } = await supabase
    .from("forum_messages")
    .select("id, created_at")
    .eq("company_id", companyId.value)
    .order("created_at", { ascending: false })
    .limit(1);
  if (!error && data && data.length > 0 && data[0]) {
    const lastMsg = data[0] as { id: string; created_at: string };
    const msgDate = new Date(lastMsg.created_at);
    const now = new Date();
    if (now.getTime() - msgDate.getTime() < 10 * 60 * 1000) {
      notifications.value = notifications.value.filter(
        (n) => n.type !== "forum"
      );
      notifications.value.push({
        id: `forum-${lastMsg.id}`,
        type: "forum",
        message: "Nouveau message dans le forum.",
        time: msgDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
      newForumMessage.value = true;
    }
  }
}

onMounted(() => {
  setInterval(checkCaisseFermeture, 60000);
  setInterval(checkForumMessages, 120000);
  checkCaisseFermeture();
  checkForumMessages();
});

const { settings: companySettings, fetchCompanySettings } =
  useCompanySettings();

onMounted(() => {
  if (!companyId.value || !magasinId.value) {
    const stop = watch(
      [() => companyId.value, () => magasinId.value],
      ([newCompanyId, newMagasinId]) => {
        if (newCompanyId && newMagasinId) {
          fetchMagasins();
          fetchCompanySettings(newCompanyId);
          stop();
        }
      },
      { immediate: true }
    );
  } else {
    fetchMagasins();
    if (companyId.value) fetchCompanySettings(companyId.value);
  }
});

const magasins = ref<any[]>([]);

async function fetchMagasins() {
  if (!companyId.value) return;
  const { data, error } = await supabase
    .from("magasins")
    .select("id, nom, company_id")
    .eq("company_id", companyId.value);
  if (!error) magasins.value = data || [];
}

const items: DropdownMenuItem[] = [
  {
    label: "Mon compte",
    icon: "heroicons:user-20-solid",
    to: "/profile",
  },
  {
    label: "Déconnexion",
    icon: "heroicons:arrow-right-start-on-rectangle-20-solid",
    onSelect: async () => {
      try {
        await supabase.auth.signOut();
        const { refreshUser } = useCurrentUser();
        refreshUser();
        await navigateTo("/login");
      } catch {
        await navigateTo("/login");
      }
    },
  },
];

const toggleMobileMenu = () => {
  emit("toggleMobileMenu");
};

// Raccourci clavier global : Ctrl/Cmd + K ouvre la recherche/navigation vocale
let voiceKeyHandler: ((e: KeyboardEvent) => void) | null = null;
onMounted(() => {
  voiceKeyHandler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      voiceOpen.value = true;
    }
  };
  window.addEventListener("keydown", voiceKeyHandler);
});
onBeforeUnmount(() => {
  if (voiceKeyHandler) window.removeEventListener("keydown", voiceKeyHandler);
});
</script>

<template>
  <header
    class="h-16 md:h-20 flex items-center px-3 md:px-4 shadow fixed top-0 left-0 right-0 bg-primary z-40"
  >
    <!-- Hamburger mobile/tablet -->
    <button
      aria-label="Ouvrir le menu"
      class="md:hidden mr-2 text-white hover:bg-white/10 p-2 rounded-lg transition-colors flex-shrink-0"
      @click="toggleMobileMenu"
    >
      <UIcon name="heroicons:bars-3-20-solid" class="h-6 w-6" />
    </button>

    <!-- Logo / Title -->
    <div class="flex items-center flex-shrink-0">
      <CompanyLogo :company-id="companyId ?? ''" :size="36" class="md:hidden" />
      <CompanyLogo :company-id="companyId ?? ''" :size="48" class="hidden md:flex" />
      <span class="mx-3 h-8 w-px bg-white/30 hidden sm:block" />
      <h1 class="text-white font-bold text-sm md:text-xl truncate max-w-[140px] md:max-w-none">
        <span v-if="isSuperAdmin" class="uppercase tracking-wide">Super Admin</span>
        <span v-else class="uppercase tracking-wide drop-shadow-lg">
          {{ companySettings?.company_name || "Gestion" }}
        </span>
      </h1>
    </div>

    <div v-if="user" class="ml-auto flex items-center gap-2 md:gap-6">
      <!-- Magasin selector - hidden on superadmin and mobile small -->
      <div v-if="!isSuperAdmin" class="hidden sm:flex items-center">
        <MagasinSelector
          :magasins="magasins"
          class="bg-primary text-white rounded-xl px-3 md:px-6 py-2 font-semibold shadow-lg border-2 border-secondary hover:bg-secondary hover:text-primary transition-all duration-200 text-xs md:text-sm"
        />
      </div>

      <NotificationMenu v-if="!isSuperAdmin" :notifications="notifications" />

      <!-- Recherche / navigation vocale (Ctrl+K) -->
      <button
        aria-label="Recherche vocale"
        title="Recherche vocale (Ctrl+K)"
        class="text-white hover:bg-white/10 p-2 rounded-lg transition-colors flex-shrink-0"
        @click="voiceOpen = true"
      >
        <UIcon name="i-lucide-mic" class="h-5 w-5" />
      </button>

      <UDropdownMenu :items="items">
        <UButton variant="ghost" class="!p-0 !w-10 !h-10 md:!w-12 md:!h-12">
          <span class="avatar-circle">
            {{ user?.email ? user.email.charAt(0).toUpperCase() : "" }}
          </span>
        </UButton>
      </UDropdownMenu>
    </div>

    <!-- Palette de commandes vocale (téléportée vers le body par UModal) -->
    <VoiceSearchModal v-model:open="voiceOpen" />
  </header>
</template>

<style scoped>
.avatar-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  background-color: #f2591d;
  color: white;
  font-size: 1.25rem;
}
@media (min-width: 768px) {
  .avatar-circle {
    font-size: 1.5rem;
  }
}
</style>
