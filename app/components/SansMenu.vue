// Composant sans menu ni header
<template>
  <div class="sans-menu">
    <slot/>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.sans-menu {
  padding: 2rem;
}
</style>