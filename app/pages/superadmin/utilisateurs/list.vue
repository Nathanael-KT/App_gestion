<script setup lang="ts">
definePageMeta({
  middleware: [
    "auth",
    "superadmin",
    () => navigateTo("/superadmin/utilisateurs", { replace: true }),
  ],
});
</script>

<template>
  <div />
</template>
