<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useCurrentUser } from "../composables/useCurrentUser";

const route = useRoute();
const router = useRouter();

const props = defineProps({
  expanded: { type: Boolean, default: true },
  mobileMenuOpen: { type: Boolean, default: false },
});

const emit = defineEmits(["toggle", "close"]);

const { companyId } = useCurrentUser();
const supabase = useSupabaseClient();
const user = useSupabaseUser();

const isMobile = ref(false);
const isTablet = ref(false);
const isDesktop = ref(true);
const isMenuOpen = ref(props.mobileMenuOpen);
const blockedMenus = ref<string[]>([]);
const userRoles = ref<string[]>([]);
const isLoadingRoles = ref(true);

const isSuperAdmin = computed(() => userRoles.value.includes("super_admin"));

const checkScreenSize = () => {
  const width = window.innerWidth;
  isMobile.value = width < 768;
  isTablet.value = width >= 768 && width < 1024;
  isDesktop.value = width >= 1024;
  if (isDesktop.value && isMenuOpen.value) {
    isMenuOpen.value = false;
  }
};

watch(
  () => props.mobileMenuOpen,
  (v) => {
    isMenuOpen.value = v;
  }
);

onMounted(() => {
  checkScreenSize();
  window.addEventListener("resize", checkScreenSize);
  // Blocked routes check
  if (blockedMenus.value.length > 0) {
    const blockedPaths = regularMenuItems
      .filter((item) => blockedMenus.value.includes(item.name))
      .flatMap((item) => [item.path, ...(item.children?.map((c) => c.path) || [])]);
    if (blockedPaths.includes(route.path)) {
      router.replace({
        path: "/error",
        query: { message: "Accès bloqué par l'administrateur." },
      });
    }
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", checkScreenSize);
});

interface MenuChild {
  name: string;
  path: string;
  requiredRoles?: string[];
  disabled?: boolean;
}
interface MenuItem {
  name: string;
  path: string;
  icon: string;
  children: MenuChild[];
  requiredRoles?: string[];
  disabled?: boolean;
}

const regularMenuItems: MenuItem[] = [
  {
    name: "Accueil",
    path: "/",
    icon: "heroicons:home-20-solid",
    children: [],
    requiredRoles: [],
  },
  {
    name: "Stock",
    path: "/stock",
    icon: "heroicons:cube-20-solid",
    children: [
      { name: "Produits", path: "/stock", requiredRoles: ["admin", "employe", "magasinier"] },
      { name: "Catégories", path: "/stock/categories", requiredRoles: ["admin", "magasinier"] },
      { name: "Nouveau produit", path: "/stock/add", requiredRoles: ["admin", "magasinier"] },
    ],
    requiredRoles: ["admin", "magasinier", "employe"],
  },
  {
    name: "Clients",
    path: "/client",
    icon: "heroicons:users-20-solid",
    children: [
      { name: "Liste des clients", path: "/client" },
      { name: "Nouveau client", path: "/client/add" },
    ],
    requiredRoles: ["admin", "employe"],
  },
  {
    name: "Commandes",
    path: "/commande",
    icon: "heroicons:shopping-bag-20-solid",
    children: [
      { name: "Nouvelle commande", path: "/commande/add", requiredRoles: ["admin", "employe"] },
      { name: "Commandes passées", path: "/commande", requiredRoles: ["admin", "employe", "magasinier"] },
      { name: "Livraison", path: "/commande/livraison", requiredRoles: ["admin", "magasinier"] },
    ],
    requiredRoles: ["admin", "employe", "magasinier"],
  },
  {
    name: "Facture",
    path: "/facture",
    icon: "heroicons:document-text-20-solid",
    children: [],
    requiredRoles: ["admin", "employe"],
  },
  {
    name: "Caisse",
    path: "/caisse",
    icon: "heroicons:credit-card-20-solid",
    children: [
      { name: "Caisse", path: "/caisse" },
      { name: "Paiement QR", path: "/caisse/qr-pay", requiredRoles: ["admin", "employe"] },
      { name: "Anti-fraude", path: "/caisse/anomalies", requiredRoles: ["admin"] },
      { name: "Rapports de caisse", path: "/caisse/rapports" },
      { name: "Bilan de caisse", path: "/caisse/bilan" },
    ],
    requiredRoles: ["admin", "employe"],
  },
  {
    name: "Utilisateurs",
    path: "/utilisateurs",
    icon: "heroicons:user-group-20-solid",
    children: [
      { name: "Liste des utilisateurs", path: "/utilisateurs" },
      { name: "Ajouter un utilisateur", path: "/utilisateurs/add" },
    ],
    requiredRoles: ["admin"],
  },
  {
    name: "Rapports",
    path: "/rapports",
    icon: "heroicons:chart-bar-20-solid",
    children: [
      { name: "Rapport de stock", path: "/rapports/stock", requiredRoles: ["admin", "magasinier"] },
      { name: "Rapport de ventes", path: "/rapports/ventes", requiredRoles: ["admin", "employe"] },
      { name: "Rapport clients", path: "/rapports/clients", requiredRoles: ["admin", "employe"] },
    ],
    requiredRoles: ["admin", "magasinier", "employe"],
  },
  {
    name: "Paramètres",
    path: "/parametres",
    icon: "heroicons:cog-6-tooth-20-solid",
    children: [
      { name: "Général", path: "/parametres/general", requiredRoles: ["admin"] },
      { name: "Utilisateurs", path: "/parametres/utilisateurs" },
      { name: "Magasins", path: "/parametres/magasin", requiredRoles: ["admin"] },
      { name: "Abonnement", path: "/parametres/abonnement", requiredRoles: ["admin"] },
    ],
    requiredRoles: ["admin", "employe", "magasinier"],
  },
  {
    name: "Financement",
    path: "/financing",
    icon: "heroicons:banknotes-20-solid",
    children: [],
    requiredRoles: ["admin"],
  },
  {
    name: "Aide",
    path: "/aide",
    icon: "heroicons:question-mark-circle-20-solid",
    children: [
      { name: "Documentation", path: "/aide/documentation" },
      { name: "Support", path: "/aide/support", requiredRoles: ["admin"] },
    ],
    requiredRoles: [],
  },
];

const superAdminMenuItems: MenuItem[] = [
  {
    name: "Dashboard",
    path: "/superadmin",
    icon: "heroicons:chart-bar-20-solid",
    children: [
      { name: "Entreprises", path: "/superadmin" },
      { name: "Abonnements", path: "/superadmin/abonnements" },
      { name: "Utilisateurs", path: "/superadmin/utilisateurs" },
      { name: "Backups", path: "/superadmin/backup" },
      { name: "Logs", path: "/superadmin/logs" },
    ],
    requiredRoles: ["super_admin"],
  },
  {
    name: "Entreprises",
    path: "/superadmin",
    icon: "heroicons:building-office-2-20-solid",
    children: [],
    requiredRoles: ["super_admin"],
  },
  {
    name: "Abonnements",
    path: "/superadmin/abonnements",
    icon: "heroicons:credit-card-20-solid",
    children: [],
    requiredRoles: ["super_admin"],
  },
  {
    name: "Utilisateurs",
    path: "/superadmin/utilisateurs",
    icon: "heroicons:users-20-solid",
    children: [
      { name: "Liste des utilisateurs", path: "/superadmin/utilisateurs" },
      { name: "Ajouter un super admin", path: "/superadmin/utilisateurs/add" },
    ],
    requiredRoles: ["super_admin"],
  },
  {
    name: "Backups",
    path: "/superadmin/backup",
    icon: "heroicons:cloud-arrow-down-20-solid",
    children: [],
    requiredRoles: ["super_admin"],
  },
  {
    name: "Logs",
    path: "/superadmin/logs",
    icon: "heroicons:document-text-20-solid",
    children: [],
    requiredRoles: ["super_admin"],
  },
  {
    name: "Retour app",
    path: "/",
    icon: "heroicons:arrow-left-20-solid",
    children: [],
    requiredRoles: ["super_admin"],
  },
];

const activeSubMenu = ref<string | null>(null);
const toggleSubMenu = (name: string) => {
  activeSubMenu.value = activeSubMenu.value === name ? null : name;
};

const toggleMenu = () => {
  if (isMobile.value) emit("close");
  else emit("toggle");
};

const navigateTo = (path: string, disabled = false) => {
  if (disabled) return;
  router.push(path);
  if (isMobile.value) emit("close");
};

const { hasAnyRole } = useRoles();

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
    if (error) userRoles.value = ["employe"];
    else userRoles.value = data?.roles || ["employe"];
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

const loadBlockedMenus = async () => {
  blockedMenus.value = [];
  if (!companyId.value) return;
  const { data, error } = await (supabase as any)
    .from("company_settings")
    .select("blocked_menus")
    .eq("id", companyId.value)
    .single();
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

const baseMenuItems = computed(() =>
  isSuperAdmin.value ? superAdminMenuItems : regularMenuItems
);

const filteredMenuItems = computed(() => {
  if (isLoadingRoles.value) {
    return baseMenuItems.value.map((item) => ({
      ...item,
      disabled: false,
      children: item.children,
    }));
  }
  return baseMenuItems.value
    .filter((item) => {
      if (
        item.requiredRoles &&
        item.requiredRoles.length > 0 &&
        !hasAnyRole(userRoles.value, item.requiredRoles)
      )
        return false;
      return true;
    })
    .map((item) => {
      const isBlocked =
        !isSuperAdmin.value && blockedMenus.value.includes(item.name);
      let children = item.children;
      if (children && children.length > 0) {
        children = children
          .filter((sub) => {
            if (
              sub.requiredRoles &&
              sub.requiredRoles.length > 0 &&
              !hasAnyRole(userRoles.value, sub.requiredRoles)
            )
              return false;
            return true;
          })
          .map((sub) => ({
            ...sub,
            disabled: !isSuperAdmin.value && blockedMenus.value.includes(sub.name),
          }));
      }
      return { ...item, disabled: isBlocked, children };
    });
});
</script>

<template>
  <div v-if="!isLoadingRoles">
    <!-- Overlay mobile -->
    <transition
      enter-active-class="transition-opacity duration-300"
      leave-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isMobile && isMenuOpen"
        class="fixed inset-0 bg-black/50 z-30"
        @click="emit('close')"
      />
    </transition>

    <!-- Sidebar -->
    <aside
      class="fixed top-16 md:top-20 bottom-0 bg-gray-800 text-white transition-all duration-300 z-30 overflow-y-auto flex flex-col"
      :class="[
        isMobile ? 'w-64 shadow-xl transform' : '',
        isMobile && !isMenuOpen ? '-translate-x-full' : '',
        isMobile && isMenuOpen ? 'translate-x-0' : '',
        isTablet && props.expanded ? 'w-64' : '',
        isTablet && !props.expanded ? 'w-16' : '',
        isDesktop && props.expanded ? 'w-64' : '',
        isDesktop && !props.expanded ? 'w-16' : '',
      ]"
    >
      <!-- Header menu -->
      <div
        class="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-10"
      >
        <div v-if="isMobile || props.expanded" class="flex items-center gap-2">
          <UIcon
            :name="isSuperAdmin ? 'heroicons:shield-check-20-solid' : 'heroicons:building-office-2-20-solid'"
            class="h-7 w-7"
            :class="isSuperAdmin ? 'text-amber-400' : 'text-blue-400'"
          />
          <h1 class="text-lg font-bold truncate">
            {{ isSuperAdmin ? "Super Admin" : "Gestion" }}
          </h1>
        </div>
        <button
          class="text-white hover:bg-gray-700 rounded p-2 transition-colors ml-auto"
          :title="isMobile ? 'Fermer' : props.expanded ? 'Réduire' : 'Étendre'"
          @click="toggleMenu"
        >
          <UIcon
            :name="
              isMobile
                ? 'heroicons:x-mark-20-solid'
                : props.expanded
                ? 'heroicons:chevron-left-20-solid'
                : 'heroicons:chevron-right-20-solid'
            "
            class="h-5 w-5"
          />
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto py-3">
        <ul class="space-y-1 px-2">
          <li
            v-for="item in filteredMenuItems"
            :key="item.path + item.name"
            class="relative group"
          >
            <button
              class="flex items-center w-full text-left rounded-lg transition-colors"
              :class="[
                isMobile || props.expanded ? 'px-3 py-2.5' : 'px-2 py-3 justify-center',
                item.disabled ? 'bg-gray-700 opacity-50 cursor-not-allowed' : 'hover:bg-gray-700',
                route.path === item.path ? 'bg-gray-700 text-white' : '',
              ]"
              :disabled="item.disabled"
              @click="
                item.disabled
                  ? undefined
                  : item.children.length
                  ? toggleSubMenu(item.name)
                  : navigateTo(item.path, item.disabled)
              "
            >
              <UIcon :name="item.icon" class="h-5 w-5 flex-shrink-0" />
              <span
                v-if="isMobile || props.expanded"
                class="ml-3 text-sm font-medium truncate"
              >
                {{ item.name }}
              </span>
              <UIcon
                v-if="item.children.length && (isMobile || props.expanded)"
                :name="
                  activeSubMenu === item.name
                    ? 'heroicons:chevron-down-20-solid'
                    : 'heroicons:chevron-right-20-solid'
                "
                class="h-4 w-4 ml-auto text-gray-400"
              />
            </button>

            <transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0 -translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-1"
            >
              <ul
                v-if="
                  item.children.length &&
                  activeSubMenu === item.name &&
                  (isMobile || props.expanded)
                "
                class="ml-6 mt-1 space-y-1 border-l border-gray-600 pl-3"
              >
                <li v-for="sub in item.children" :key="sub.path + sub.name">
                  <button
                    class="flex items-center w-full text-left rounded-md px-2 py-2 text-sm transition-colors"
                    :class="[
                      sub.disabled ? 'opacity-50 cursor-not-allowed bg-gray-700' : 'hover:bg-gray-700 text-gray-300 hover:text-white',
                      route.path === sub.path ? 'bg-gray-600 text-white' : '',
                    ]"
                    :disabled="sub.disabled"
                    @click="navigateTo(sub.path, sub.disabled)"
                  >
                    <UIcon name="heroicons:minus-20-solid" class="h-3 w-3 mr-2 opacity-60" />
                    <span class="truncate">{{ sub.name }}</span>
                  </button>
                </li>
              </ul>
            </transition>

            <!-- Tooltip collapsed -->
            <div
              v-if="!props.expanded && !isMobile && !item.children.length"
              class="absolute left-full ml-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 top-1/2 -translate-y-1/2"
            >
              {{ item.name }}
            </div>
          </li>
        </ul>
      </nav>

      <!-- Footer -->
      <div class="p-3 border-t border-gray-700 text-xs text-gray-400 text-center">
        <span v-if="isMobile || props.expanded">v1.0 • {{ isSuperAdmin ? "SuperAdmin" : "App" }}</span>
      </div>
    </aside>
  </div>
</template>
