<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const { companyId } = useCurrentUser();
const user = useSupabaseUser();
const supabase = useSupabaseClient();
const emit = defineEmits(["toggleMobileMenu"]);

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
  <header
    class="h-16 md:h-20 flex items-center px-3 md:px-4 py-2 md:py-4 shadow fixed top-0 left-0 right-0 bg-primary z-40"
  >
    <!-- Bouton hamburger pour mobile uniquement -->
    <button
      aria-label="Ouvrir le menu"
      class="md:hidden mr-2 text-white hover:bg-white/10 p-2 rounded-lg transition-colors flex-shrink-0"
      @click="toggleMobileMenu"
    >
      <UIcon name="heroicons:bars-3-20-solid" class="h-6 w-6" />
    </button>

    <!-- Logo visible sur tablet et desktop -->
    <div class="hidden md:flex items-center space-x-2 flex-shrink-0">
      <CompanyLogo :company-id="companyId ?? ''" :size="32" />
    </div>

    <div v-if="user" class="ml-auto flex items-center space-x-2 md:space-x-6">
      <!-- Notifications (visible sur desktop) -->

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
