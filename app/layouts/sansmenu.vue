<template>
  <div class="sans-menu-layout">
    <slot />
  </div>
</template>

<script setup lang="ts">
// Layout sans menu ni header
</script>

<style scoped>
.sans-menu-layout {
  min-height: 100vh;
  background: #e7e9eb;
  padding: 2rem;
}
</style>
