<template>
  <div class="flex flex-col items-center justify-center h-screen text-center">
    <UIcon name="heroicons:lock-closed-20-solid" class="h-12 w-12 text-red-500 mb-4" />
    <h1 class="text-2xl font-bold text-gray-800">Accès refusé</h1>
    <p class="text-gray-600 mt-2">
      {{ $route.query.message || "Vous n'avez pas l'autorisation d'accéder à cette page." }}
    </p>
  </div>
</template>
