<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full space-y-8">
      <div>
        <div class="mx-auto h-12 w-12 text-red-600">
          <Icon
            name="heroicons:exclamation-triangle-20-solid"
            class="h-12 w-12"
          />
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Accès refusé
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
        </p>
      </div>
      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-medium text-gray-900 mb-4">
          Informations sur votre accès
        </h3>
        <div class="space-y-3">
          <div>
            <span class="text-sm font-medium text-gray-500">Utilisateur :</span>
            <span class="ml-2 text-sm text-gray-900">{{ userEmail }}</span>
          </div>
          <div>
            <span class="text-sm font-medium text-gray-500">Vos rôles :</span>
            <div class="ml-2 mt-1 flex flex-wrap gap-1">
                v-for="role in userRoles"
                :key="role"
                :role-value="role"
                size="sm"
              />
              <span v-if="userRoles.length === 0" class="text-sm text-gray-400">
                Aucun rôle assigné
              </span>
            </div>
          </div>
          <div v-if="error?.statusMessage">
            <span class="text-sm font-medium text-gray-500">Détail :</span>
            <p class="ml-2 text-sm text-red-600">{{ error.statusMessage }}</p>
          </div>
        </div>
      </div>
      <div class="flex justify-center">
        <UButton
          to="/"
          variant="solid"
          color="primary"
          icon="heroicons:arrow-left-20-solid"
        >
          Retour à l'accueil
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { userRoles, userEmail } = useCurrentUser();

// Récupérer l'erreur depuis la route si elle existe
const error = useError();

// Meta pour la page
useHead({
  title: "Accès refusé - App Gestion",
  meta: [
    {
      name: "description",
      content: "Accès refusé - Permissions insuffisantes",
    },
  ],
});
</script>
