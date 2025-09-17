<script setup lang="ts">
const isMenuExpanded = ref(true);
const isMobileMenuOpen = ref(false);


const isMobile = ref(false);
const isTablet = ref(false);
const isDesktop = ref(true);

const checkScreenSize = () => {
  const width = window.innerWidth;
  isMobile.value = width < 768;
  isTablet.value = width >= 768 && width < 1024;
  isDesktop.value = width >= 1024;

  // Fermer le menu mobile automatiquement sur desktop
  if (isDesktop.value && isMobileMenuOpen.value) {
    isMobileMenuOpen.value = false;
  }
};

onMounted(() => {
  checkScreenSize();
  window.addEventListener("resize", checkScreenSize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", checkScreenSize);
});

// Calcul dynamique de la marge gauche
const mainMarginClass = computed(() => {
  if (isMobile.value) {
    return ""; // Pas de marge sur mobile
  } else if (isTablet.value) {
    return isMenuExpanded.value ? "ml-60" : "ml-16"; // Tablet
  } else {
    return isMenuExpanded.value ? "ml-64" : "ml-16"; // Desktop
  }
});
</script>

<template>
  <div class="min-h-screen bg-[#E7E9EB]">
    <TheHeader @toggle-mobile-menu="isMobileMenuOpen = !isMobileMenuOpen" />

    <div class="flex pt-16">
      <TheMenu
        :expanded="isMenuExpanded"
        :mobile-menu-open="isMobileMenuOpen"
        @toggle="isMenuExpanded = !isMenuExpanded"
        @close="isMobileMenuOpen = false"
      />

      <main
        class="flex-grow p-4 sm:p-6 lg:p-8 transition-all duration-300 min-h-[calc(100vh-4rem)]"
        :class="mainMarginClass"
      >
        <slot />
      </main>
    </div>
  </div>
</template>
