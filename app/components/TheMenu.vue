<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { useRouter } from "vue-router"; // Import Vue Router

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

const isMobile = ref(false);
const isTablet = ref(false);
const isDesktop = ref(true);
const isMenuOpen = ref(props.mobileMenuOpen);

const toggleMenu = () => {
  emit(isMobile.value ? "close" : "toggle");
};

const checkScreenSize = () => {
  const width = window.innerWidth;
  isMobile.value = width < 768;
  isTablet.value = width >= 768 && width < 1024;
  isDesktop.value = width >= 1024;
};

watch(
  () => props.mobileMenuOpen,
  (newVal) => {
    isMenuOpen.value = newVal;
  }
);

onMounted(() => {
  checkScreenSize();
  window.addEventListener("resize", checkScreenSize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", checkScreenSize);
});

// Liste des éléments de menu avec sous-menus et icônes
const menuItems = [
  {
    name: "Accueil",
    path: "/",
    icon: "heroicons:home-20-solid",
    children: [],
    requiredRoles: [], // Aucun rôle requis pour l'accueil
  },
  {
    name: "Stock",
    path: "/stock",
    icon: "heroicons:cube-20-solid",
    children: [
      {
        name: "Produits",
        path: "/stock",
        requiredRoles: ["admin", "employe", "magasinier"],
      },
      {
        name: "Catégories",
        path: "/stock/categories",
        requiredRoles: ["admin", "magasinier"],
      },
      {
        name: "Nouveau produit",
        path: "/stock/add",
        requiredRoles: ["admin", "magasinier"],
      },
    ],
    requiredRoles: ["admin", "magasinier"], // Seuls les admins, employés et magasiniers peuvent accéder à cette section
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
      {
        name: "Nouvelle commande",
        path: "/commande/add",
        requiredRoles: ["admin", "employe"],
      },
      {
        name: "autres commandes",
        path: "/commande/autres",
        requiredRoles: ["admin", "employe"],
      },
      {
        name: "Commandes passées",
        path: "/commande",
        requiredRoles: ["admin", "employe", "magasinier"],
      },
      {
        name: "Livraison",
        path: "/commande/livraison",
        requiredRoles: ["admin", "magasinier"],
      },
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
      { name: "Rapports de caisse", path: "/caisse/rapports" },
      {
        name: "Bilan de caisse",
        path: "/caisse/bilan",
      },
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
    requiredRoles: ["admin"], // Seuls les admins peuvent accéder à cette section
  },
  {
    name: "Rapports",
    path: "/rapports",
    icon: "heroicons:chart-bar-20-solid",
    children: [
      // Affiche tous les sous-rapports selon le rôle
      {
        name: "Rapport de stock",
        path: "/rapports/stock",
        requiredRoles: ["admin", "magasinier"],
      },
      {
        name: "Rapport de ventes",
        path: "/rapports/ventes",
        requiredRoles: ["admin", "employe"],
      },
    ],
    requiredRoles: ["admin", "magasinier", "employe"], // Tous les rôles pouvant voir au moins un sous-rapport
  },
  {
    name: "Discussion",
    path: "/discussion",
    icon: "heroicons:chat-bubble-oval-left-ellipsis",
    children: [
      { name: "Forum", path: "/forum" },
    ],
    requiredRoles: ["admin", "employe", "magasinier"],
  },
  {
    name: "Paramètres",
    path: "/parametres",
    icon: "heroicons:cog-6-tooth-20-solid",
    children: [
      {
        name: "Général",
        path: "/parametres/general",
        requiredRoles: ["admin"],
      },
      { name: "Utilisateurs", path: "/parametres/utilisateurs" },
      { name: "Magasins", path: "/parametres/magasin" , requiredRoles: ["admin"] },
      { 
        name: "Compagnies", 
        path: "/parametres/companies", 
        requiredRoles: ["admin"],
        icon: "heroicons:building-office-20-solid"
      },
    ],
    requiredRoles: ["admin", "employe", "magasinier"],
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
  
  
] as Array<{
  name: string;
  path: string;
  icon: string;
  children: Array<{ name: string; path: string }>;
  requiredRoles?: string[];
}>;

const activeSubMenu = ref<string | null>(null);

const toggleSubMenu = (menuName: string) => {
  activeSubMenu.value = activeSubMenu.value === menuName ? null : menuName;
};

const navigateTo = (path: string) => {
  router.push(path);
  // Fermer le menu mobile après navigation
  if (isMobile.value) {
    emit("close");
  }
};

// Gestion des rôles et permissions
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

// Filtrer les éléments de menu selon les rôles
const filteredMenuItems = computed(() => {
  // Si les rôles sont en cours de chargement, afficher tous les éléments de base
  if (isLoadingRoles.value) {
    return menuItems.filter(
      (item) => !item.requiredRoles || item.requiredRoles.length === 0
    );
  }

  return menuItems
    .map((item) => {
      // Filtrer les sous-menus selon les rôles
      let children = item.children;
      if (children && children.length > 0) {
        children = children.filter(
          (subItem: {
            name: string;
            path: string;
            requiredRoles?: string[];
          }) => {
            if (!subItem.requiredRoles || subItem.requiredRoles.length === 0) {
              return true;
            }
            return hasAnyRole(userRoles.value, subItem.requiredRoles);
          }
        );
      }
      // Si l'item n'a pas de restriction de rôle, l'afficher
      if (!item.requiredRoles || item.requiredRoles.length === 0) {
        return { ...item, children };
      }
      // Vérifier si l'utilisateur a au moins l'un des rôles requis
      if (hasAnyRole(userRoles.value, item.requiredRoles)) {
        return { ...item, children };
      }
      return null;
    })
    .filter((item) => item !== null);
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
    class="fixed h-full bg-gray-800 text-white transition-all duration-300 z-30"
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
    <div class="flex items-center justify-between p-4 border-b border-gray-700">
      <!-- Logo/Titre (visible sur desktop et tablet en mode étendu) -->
      <div v-if="isMobile || expanded" class="flex items-center space-x-2">
        <UIcon
          name="heroicons:building-office-2-20-solid"
          class="h-8 w-8 text-blue-400"
        />
        <h1 class="text-xl font-bold text-white">Gestion</h1>
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
            class="flex items-center w-full text-left hover:bg-gray-700 transition-colors rounded-lg mx-2"
            :class="[
              isMobile || expanded ? 'px-4 py-3' : 'px-2 py-3 justify-center',
            ]"
            @click="
              item.children.length
                ? toggleSubMenu(item.name)
                : navigateTo(item.path)
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
                  class="flex items-center w-full text-left hover:bg-gray-700 transition-colors rounded-lg px-3 py-2"
                  @click="navigateTo(subItem.path)"
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

<style scoped>
/* Transitions personnalisées */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Groupe hover pour les tooltips */
.group:hover .group-hover\:opacity-100 {
  opacity: 1;
}

/* Animations personnalisées */
@media (prefers-reduced-motion: no-preference) {
  .transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
  }
}

/* Responsive breakpoints personnalisés */
@media (max-width: 767px) {
  /* Mobile: forcer la largeur complète du menu */
  .mobile-menu {
    width: 280px !important;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  /* Tablet: largeurs optimisées */
  .tablet-expanded {
    width: 240px !important;
  }

  .tablet-collapsed {
    width: 64px !important;
  }
}

@media (min-width: 1024px) {
  /* Desktop: largeurs confortables */
  .desktop-expanded {
    width: 256px !important;
  }

  .desktop-collapsed {
    width: 64px !important;
  }
}

/* Amélioration de l'accessibilité */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus states améliorés */
button:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Scrollbar personnalisée pour le menu */
nav::-webkit-scrollbar {
  width: 6px;
}

nav::-webkit-scrollbar-track {
  background: #374151;
}

nav::-webkit-scrollbar-thumb {
  background: #6b7280;
  border-radius: 3px;
}

nav::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
