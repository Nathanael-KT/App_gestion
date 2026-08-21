<script setup lang="ts">
const isMenuExpanded = ref(true);
const isMobileMenuOpen = ref(false);

const isMobile = ref(false);
const isTablet = ref(false);
const isDesktop = ref(true);

const checkScreenSize = () => {
  if (typeof window === "undefined") return;
  const width = window.innerWidth;
  isMobile.value = width < 768;
  isTablet.value = width >= 768 && width < 1024;
  isDesktop.value = width >= 1024;

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

const mainMarginClass = computed(() => {
  if (isMobile.value) return "";
  if (isTablet.value) return isMenuExpanded.value ? "ml-64" : "ml-16";
  return isMenuExpanded.value ? "ml-64" : "ml-16";
});
</script>

<template>
  <div class="min-h-screen bg-[#E7E9EB]">
    <TheHeader @toggle-mobile-menu="isMobileMenuOpen = !isMobileMenuOpen" />

    <div class="flex pt-16 md:pt-20">
      <TheMenu
        :expanded="isMenuExpanded"
        :mobile-menu-open="isMobileMenuOpen"
        @toggle="isMenuExpanded = !isMenuExpanded"
        @close="isMobileMenuOpen = false"
      />

      <main
        class="flex-1 p-3 sm:p-6 lg:p-8 transition-all duration-300 min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-5rem)] w-full max-w-full overflow-x-hidden"
        :class="mainMarginClass"
      >
        <slot />
      </main>
    </div>
  </div>
</template>
