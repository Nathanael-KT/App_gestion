<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import CompanySelector from "./CompanySelector.vue";

const user = useSupabaseUser();
const supabase = useSupabaseClient();
const emit = defineEmits(["toggleMobileMenu"]);

// Utilisation du composable pour les paramètres de l'entreprise
const { settings: companySettings, fetchCompanySettings } =
  useCompanySettings();

// Utilisation du composable pour la gestion des compagnies
const { currentCompany } = useCompanyManagement();

// Charger les paramètres de l'entreprise au montage du composant
onMounted(() => {
  fetchCompanySettings();
});

const items: DropdownMenuItem[] = [
  {
    label: "Mon compte",
    icon: "heroicons:user-20-solid",
    to: "/profile",
  },
  {
    label: "Paramètres",
    icon: "heroicons:cog-6-tooth-20-solid",
    to: "/parametres",
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

// Computed pour le nom affiché dans le header
const displayName = computed(() => {
  return currentCompany.value?.name || 
         companySettings.value?.company_name || 
         "Mon Application";
});
</script>

<template>
  <header
    class="h-16 flex items-center p-4 shadow fixed top-0 left-0 right-0 bg-primary z-40"
  >
    <!-- Bouton hamburger pour mobile -->
    <button
      aria-label="Ouvrir le menu"
      class="lg:hidden mr-4 text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
      @click="toggleMobileMenu"
    >
      <img src="../assets/img/img.png" alt="Logo" class="h-8 w-8" >
    </button>

    <!-- Titre de l'application (visible sur tablet et desktop) -->
    <div class="hidden sm:flex items-center text-white">
      <img src="../assets/img/img.png" alt="Logo" class="h-8 w-8 mr-3" >
      <h1 class="text-xl font-bold">
        {{ displayName }}
      </h1>
    </div>

    <div v-if="user" class="ml-auto flex items-center space-x-6">
      <!-- Sélecteur de compagnie et magasin -->
      <div class="flex items-center">
        <CompanySelector
          class="bg-primary text-white rounded-xl px-6 py-2 font-semibold shadow-lg border-2 border-secondary hover:bg-secondary hover:text-primary transition-all duration-200"
        />
      </div>
      <!-- Notifications (visible sur desktop) -->
      <button
        class="hidden lg:flex items-center text-white hover:bg-white/10 p-2 rounded-lg transition-colors relative"
        aria-label="Notifications"
      >
        <UIcon name="heroicons:bell-20-solid" class="h-6 w-6" />
        <!-- Badge de notification -->
        <span
          class="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"
        />
      </button>

      <!-- Menu utilisateur -->
      <UDropdownMenu :items="items">
        <UButton variant="ghost" class="!p-0 !w-12 !h-12">
          <span class="avatar-circle">
            {{ user?.email ? user.email.charAt(0).toUpperCase() : "" }}
          </span>
        </UButton>
      </UDropdownMenu>
    </div>
  </header>
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
