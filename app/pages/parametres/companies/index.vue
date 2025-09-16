<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        Gestion des Compagnies
      </h1>
      <p class="text-gray-600">
        Gérez toutes les compagnies de votre organisation
      </p>
    </div>

    <div class="bg-white rounded-lg border p-6">
      <div class="text-center py-12">
        <UIcon name="i-lucide-building" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">
          Interface en développement
        </h3>
        <p class="text-gray-500 mb-6">
          L'interface de gestion des compagnies est en cours de développement.
        </p>
        <p class="text-sm text-gray-400">
          Cette fonctionnalité sera bientôt disponible pour les administrateurs.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

useHead({
  title: 'Gestion des Compagnies - App Gestion',
  meta: [
    { name: 'description', content: 'Gérez toutes les compagnies de votre organisation' }
  ]
})
</script>