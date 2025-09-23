<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { useRouter } from "vue-router";
import { useCurrentUser } from "../composables/useCurrentUser";
const route = useRoute();
onMounted(() => {
  // Bloque l'accès direct aux routes bloquées
  if (blockedMenus.value.length > 0) {
    const blockedPaths = menuItems
      .filter((item) => blockedMenus.value.includes(item.name))
      .map((item) => item.path);
    if (blockedPaths.includes(route.path)) {
      router.replace("/error?blocked=1");
    }
  }
});

const props = defineProps({
  expanded: {
    type: Boolean,
    default: true,
  },
  mobileMenuOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["toggle", "close"]);

const router = useRouter(); // Instancier Vue Router

const { companyId } = useCurrentUser();
const isMobile = ref(false);
const isTablet = ref(false);
const isDesktop = ref(true);
const isMenuOpen = ref(props.mobileMenuOpen);
const blockedMenus = ref<string[]>([]);

const toggleMenu = () => {
  emit(isMobile.value ? "close" : "toggle");
};

const checkScreenSize = () => {
  const width = window.innerWidth;
  isMobile.value = width < 768;
  isTablet.value = width >= 768 && width < 1024;
  isDesktop.value = width >= 1024;
};

interface MenuChild {
  name: string;
  path: string;
  requiredRoles?: string[];
  disabled?: boolean;
}

watch(
  () => props.mobileMenuOpen,
  (newVal) => {
    isMenuOpen.value = newVal;
  }
);

onBeforeUnmount(() => {
  window.removeEventListener("resize", checkScreenSize);
});

// Liste des éléments de menu avec sous-menus et icônes
const menuItems: Array<{
  name: string;
  path: string;
  icon: string;
  children: Array<{
    name: string;
    path: string;
    requiredRoles?: string[];
    disabled?: boolean;
  }>;
  requiredRoles?: string[];
  disabled?: boolean;
}> = [
  {
    name: "Dashboard",
    path: "/superadmin/dashboard",
    icon: "heroicons:chart-bar-20-solid",
    children: [
      { name: "Company", path: "/superadmin" },
      { name: "Abonnements", path: "/superadmin/abonnements" },
      { name: "Utilisateurs", path: "/superadmin/utilisateurs" },
      { name: "Backups", path: "/superadmin/backup" },
      { name: "Logs", path: "/superadmin/logs" },
      { name: "Paramètres", path: "/superadmin/settings" },

    ],
  },
  {
    name: "Utilisateurs",
    path: "/superadmin/utilisateurs",
    icon: "heroicons:users-20-solid",
    children: [
      { name: "Profil", path: "/profile" },
      { name: "Utilisateurs", path: "/superadmin/utilisateurs/list" },
      { name: "Ajouter", path: "/superadmin/utilisateurs/add" },
    ],
  },
  {
     
    name: "Aide",
    path: "/aide",
    icon: "heroicons:question-mark-circle-20-solid",
    children: [
      { name: "Documentation", path: "/aide/documentation" },
      { name: "Support", path: "/aide/support", requiredRoles: ["admin"] },
    ],
    requiredRoles: ["admin", "employe", "magasinier"], // Aucun rôle requis pour l'aide
  },
];

const activeSubMenu = ref<string | null>(null);

const toggleSubMenu = (menuName: string) => {
  activeSubMenu.value = activeSubMenu.value === menuName ? null : menuName;
};

const navigateTo = (path: string, disabled = false) => {
  if (disabled) return;
  router.push(path);
  // Fermer le menu mobile après navigation
  if (isMobile.value) {
    emit("close");
  }
};

// Configuration des rôles et permissions
const { hasAnyRole } = useRoles();
const supabase = useSupabaseClient();
const user = useSupabaseUser();

// Récupérer les vrais rôles utilisateur depuis la base de données
const userRoles = ref<string[]>([]);
const isLoadingRoles = ref(true);

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
  { immediate: true }
);

// Fonction pour charger les menus bloqués pour la compagnie courante
const loadBlockedMenus = async () => {
  blockedMenus.value = [];
  if (!companyId.value) return;
  // Exemple: requête sur company_settings ou une API custom
  // Ici, on suppose que company_settings a un champ blocked_menus (array de string)
  const { data, error } = await supabase
    .from("company_settings")
    .select("blocked_menus")
    .eq("id", companyId.value)
    .single<{ blocked_menus: string[] }>();
  if (!error && data && Array.isArray(data.blocked_menus)) {
    blockedMenus.value = data.blocked_menus;
  }
};

watch(
  companyId,
  (id) => {
    if (id) loadBlockedMenus();
  },
  { immediate: true }
);

// Filtrer les éléments de menu : supprimer si l'utilisateur n'a pas le bon rôle, mais afficher en disabled si le menu est bloqué
const filteredMenuItems = computed(() => {
  if (isLoadingRoles.value) {
    return menuItems.map((item) => ({
      ...item,
      disabled: false,
      children: item.children,
    }));
  }
  return menuItems
    .filter((item) => {
      // Supprimer si l'utilisateur n'a pas le bon rôle
      if (
        item.requiredRoles &&
        item.requiredRoles.length > 0 &&
        !hasAnyRole(userRoles.value, item.requiredRoles)
      ) {
        return false;
      }
      return true;
    })
    .map((item) => {
      // Détermine si le menu principal est bloqué
      const isBlocked = blockedMenus.value.includes(item.name);
      // Filtrer les sous-menus selon les rôles et bloqués
      let children = item.children;
      if (children && children.length > 0) {
        children = children
          .filter((subItem: MenuChild) => {
            // Supprimer si l'utilisateur n'a pas le bon rôle
            if (
              subItem.requiredRoles &&
              subItem.requiredRoles.length > 0 &&
              !hasAnyRole(userRoles.value, subItem.requiredRoles)
            ) {
              return false;
            }
            return true;
          })
          .map((subItem: MenuChild) => {
            const subBlocked = blockedMenus.value.includes(subItem.name);
            return { ...subItem, disabled: subBlocked };
          });
      }
      return { ...item, disabled: isBlocked, children };
    });
});
onMounted(() => {
  checkScreenSize();
  window.addEventListener("resize", checkScreenSize);
});
</script>

<template>
  <!-- Overlay pour mobile -->
  <transition
    name="fade"
    enter-active-class="transition-opacity duration-300"
    leave-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isMobile && isMenuOpen"
      class="fixed inset-0 bg-black bg-opacity-50 z-30"
      @click="emit('close')"
    />
  </transition>

  <!-- Menu principal -->
  <aside
    class="fixed h-full bg-gray-800 text-white transition-all duration-300 z-30 overflow-y-auto"
    :class="[
      // Mobile styles (< 768px)
      isMobile ? 'transform shadow-xl w-64' : '',
      isMobile && !isMenuOpen ? '-translate-x-full' : '',
      isMobile && isMenuOpen ? 'translate-x-0' : '',

      // Tablet styles (768px - 1023px)
      isTablet && expanded ? 'w-64' : '',
      isTablet && !expanded ? 'w-16' : '',

      // Desktop styles (>= 1024px)
      isDesktop && expanded ? 'w-64' : '',
      isDesktop && !expanded ? 'w-16' : '',
    ]"
  >
    <!-- En-tête du menu -->
    <div
      class="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-40"
    >
      <!-- Logo/Titre (visible sur desktop et tablet en mode étendu) -->
      <div v-if="isMobile || expanded" class="flex items-center space-x-2">
        <UIcon
          name="heroicons:building-office-2-20-solid"
          class="h-8 w-8 text-blue-400"
        />
        <h1 class="text-xl font-bold text-white">Configuration</h1>
      </div>

      <!-- Bouton toggle -->
      <button
        :title="
          isMobile
            ? 'Fermer le menu'
            : expanded
            ? 'Réduire le menu'
            : 'Étendre le menu'
        "
        class="text-white hover:bg-gray-700 rounded p-2 transition-colors"
        @click="toggleMenu"
      >
        <UIcon
          :name="
            isMobile
              ? 'heroicons:x-mark-20-solid'
              : expanded
              ? 'heroicons:chevron-left-20-solid'
              : 'heroicons:chevron-right-20-solid'
          "
          class="h-6 w-6"
        />
      </button>
    </div>

    <!-- Items du menu -->
    <nav class="flex-1 overflow-y-auto py-4">
      <ul class="space-y-1">
        <li
          v-for="item in filteredMenuItems"
          :key="item.path"
          class="relative group"
        >
          <button
            class="flex items-center w-full text-left transition-colors rounded-lg mx-2"
            :class="[
              isMobile || expanded ? 'px-4 py-3' : 'px-2 py-3 justify-center',
              item.disabled
                ? 'bg-gray-700 opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-700',
            ]"
            :disabled="item.disabled"
            @click="
              item.disabled
                ? $event.preventDefault()
                : item.children.length
                ? toggleSubMenu(item.name)
                : navigateTo(item.path, item.disabled)
            "
          >
            <UIcon
              :name="item.icon"
              class="h-6 w-6 text-gray-300 flex-shrink-0"
            />
            <span
              v-if="isMobile || expanded"
              class="ml-3 whitespace-nowrap text-sm font-medium"
            >
              {{ item.name }}
            </span>
            <span
              v-if="item.children.length && (isMobile || expanded)"
              class="ml-auto"
            >
              <UIcon
                :name="
                  activeSubMenu === item.name
                    ? 'heroicons:chevron-down-20-solid'
                    : 'heroicons:chevron-right-20-solid'
                "
                class="h-4 w-4 text-gray-400"
              />
            </span>
          </button>

          <!-- Sous-menu -->
          <transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="transform scale-95 opacity-0"
            enter-to-class="transform scale-100 opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="transform scale-100 opacity-100"
            leave-to-class="transform scale-95 opacity-0"
          >
            <ul
              v-if="
                item.children.length &&
                activeSubMenu === item.name &&
                (isMobile || expanded)
              "
              class="ml-8 mt-2 space-y-1 border-l-2 border-gray-600 pl-4"
            >
              <li v-for="subItem in item.children" :key="subItem.path">
                <button
                  class="flex items-center w-full text-left transition-colors rounded-lg px-3 py-2"
                  :class="
                    subItem.disabled
                      ? 'bg-gray-700 opacity-50 cursor-not-allowed'
                      : 'hover:bg-gray-700'
                  "
                  :disabled="subItem.disabled"
                  @click="
                    subItem.disabled
                      ? $event.preventDefault()
                      : navigateTo(subItem.path, subItem.disabled)
                  "
                >
                  <UIcon
                    name="heroicons:minus-20-solid"
                    class="h-4 w-4 text-gray-500 mr-2"
                  />
                  <span class="text-sm text-gray-300">{{ subItem.name }}</span>
                </button>
              </li>
            </ul>
          </transition>

          <!-- Tooltip pour mode réduit -->
          <div
            v-if="!expanded && !isMobile && item.children.length === 0"
            class="absolute left-full ml-6 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap pointer-events-none"
            style="top: 50%; transform: translateY(-50%)"
          >
            {{ item.name }}
            <div
              class="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900"
            />
          </div>
        </li>
      </ul>
    </nav>
  </aside>
</template>
