<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

import MagasinSelector from "./MagasinSelector.vue";
import { useCurrentUser } from "../composables/useCurrentUser";
import TheHeader2 from "./TheHeader2.vue";
import { useCompanySettings } from "../composables/useCompanySettings";
import { useDashboardData } from "../composables/useDashboardData";
import { ref, onMounted, watch } from "vue";

const { companyId, magasinId } = useCurrentUser();
const user = useSupabaseUser();
const supabase = useSupabaseClient() as any;
const emit = defineEmits(["toggleMobileMenu"]);
const isSuperAdmin = computed(() => userRoles.value.includes("super_admin"));

// Notifications
const notifications = ref<
  Array<{ id: string; type: string; message: string; time?: string }>
>([]);
const userRoles = ref<string[]>([]);
const isLoadingRoles = ref(true);

// Stock alerts
const { stockAlerts } = useDashboardData();

// Forum messages
const newForumMessage = ref(false);

// Caisse fermeture (à 17h30)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("users")
      .select("roles")
      .eq("auth_user_id", user.value.id)
      .single();

    if (error) {
      console.error("Erreur lors du chargement des rôles:", error);
      userRoles.value = ["employe"]; // Rôle par défaut en cas d'erreur
    } else {
      userRoles.value = data?.roles || ["employe"];
    }
  } catch (error) {
    console.error("Erreur lors du chargement des rôles:", error);
    userRoles.value = ["employe"]; // Rôle par défaut
  } finally {
    isLoadingRoles.value = false;
  }
};

// Surveiller les changements d'utilisateur
watch(
  user,
  (newUser) => {
    if (newUser) {
      loadUserRoles();
    } else {
      userRoles.value = [];
      isLoadingRoles.value = false;
    }
  },
  { immediate: true },
);

// Charger les alertes de stock
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

// Vérifier les nouveaux messages du forum
async function checkForumMessages() {
  if (!companyId.value) return;
  const { data, error } = await supabase
    .from("forum_messages")
    .select("id, created_at")
    .eq("company_id", companyId.value)
    .order("created_at", { ascending: false })
    .limit(1);
  if (!error && data && data.length > 0) {
    if (data[0]) {
      const lastMsg = data[0] as { id: string; created_at: string };
      // Si le message est récent (< 10 min)
      const msgDate = new Date(lastMsg.created_at);
      const now = new Date();
      if (now.getTime() - msgDate.getTime() < 10 * 60 * 1000) {
        notifications.value = notifications.value.filter(
          (n) => n.type !== "forum",
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
}

onMounted(() => {
  // Vérifier la fermeture de caisse toutes les minutes
  setInterval(checkCaisseFermeture, 60000);
  // Vérifier les nouveaux messages du forum toutes les 2 min
  setInterval(checkForumMessages, 120000);
  // Vérifier au montage
  checkCaisseFermeture();
  checkForumMessages();
});

// Utilisation du composable pour les paramètres de l'entreprise
const { settings: companySettings, fetchCompanySettings } =
  useCompanySettings();

// Récupérer les paramètres de l'entreprise au montage
onMounted(() => {
  // Attendre que companyId ET magasinId soient tous les deux définis
  if (!companyId.value || !magasinId.value) {
    const stop = watch(
      [() => companyId.value, () => magasinId.value],
      ([newCompanyId, newMagasinId]) => {
        if (newCompanyId && newMagasinId) {
          console.log("companyId récupéré :", companyId.value);
          console.log("magasinId récupéré :", magasinId.value);

          fetchMagasins();
          fetchCompanySettings(newCompanyId);
          stop();
        }
      },
      { immediate: true },
    );
  }
});

// Liste des magasins filtrés par companyId
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
        // Déconnexion de Supabase Auth
        await supabase.auth.signOut();

        // Effacer le cache/état local si nécessaire
        const { refreshUser } = useCurrentUser();
        refreshUser();

        // Rediriger vers la page de connexion
        await navigateTo("/login");
      } catch (error) {
        console.error("Erreur lors de la déconnexion:", error);
        // Forcer la redirection même en cas d'erreur
        await navigateTo("/login");
      }
    },
  },
];

const toggleMobileMenu = () => {
  emit("toggleMobileMenu");
};
</script>

<template>
  <component :is="isSuperAdmin ? TheHeader2 : 'div'" v-show="!isLoadingRoles">
    <template v-if="!isSuperAdmin">
      <header
        class="h-16 md:h-20 flex items-center px-3 md:px-4 shadow fixed top-0 left-0 right-0 bg-primary z-40"
      >
        <!-- Bouton hamburger pour mobile uniquement -->
        <button
          aria-label="Ouvrir le menu"
          class="md:hidden mr-3 text-white hover:bg-white/10 p-2 rounded-lg transition-colors flex-shrink-0"
          @click="toggleMobileMenu"
        >
          <UIcon name="heroicons:bars-3-20-solid" class="h-6 w-6" />
        </button>

        <!-- Titre de l'application (visible sur tablet et desktop) -->
        <div class="hidden md:flex items-center text-white flex-shrink-0">
          <CompanyLogo :company-id="companyId ?? ''" :size="40" />
          <!-- Séparation verticale -->
          <span class="mx-3 h-8 w-px bg-white/30" />
          <h1 class="text-lg font-bold">
            <span
              class="text-xl font-extrabold tracking-wide uppercase text-white drop-shadow-lg"
            >
              {{ companySettings?.company_name || "" }}
            </span>
          </h1>
        </div>

        <div v-if="user" class="ml-auto flex items-center space-x-2 md:space-x-4">
          <!-- Sélecteur de magasin -->
          <div class="flex items-center">
            <MagasinSelector
              :magasins="magasins"
              class="text-white text-sm font-semibold"
            />
          </div>

          <!-- Notifications (visible sur desktop) -->
          <NotificationMenu :notifications="notifications" />

          <!-- Menu utilisateur -->
          <UDropdownMenu :items="items">
            <UButton variant="ghost" class="!p-0 !w-10 !h-10 md:!w-12 md:!h-12">
              <span class="avatar-circle">
                {{ user?.email ? user.email.charAt(0).toUpperCase() : "" }}
              </span>
            </UButton>
          </UDropdownMenu>
        </div>
      </header>
    </template>
  </component>
</template>

<style scoped>
.avatar-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 9999px;
  background-color: #f2591d;
  color: white;
  font-size: 1.5rem;
}
</style>
