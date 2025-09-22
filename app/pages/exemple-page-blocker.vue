<!--
  Exemple d'intégration de la composable usePageBlocker
  Cette page montre comment utiliser la composable pour bloquer l'accès
  au module Stock si celui-ci est désactivé pour l'entreprise.
-->
<template>
  <div class="p-6">
    <!-- Affichage d'un loader pendant la vérification -->
    <div v-if="isLoadingBlocker" class="flex items-center justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      <span class="ml-2 text-gray-600">Vérification des permissions...</span>
    </div>

    <!-- Contenu de la page si l'accès est autorisé -->
    <div v-else-if="!isBlockedStock">
      <h1 class="text-2xl font-bold mb-6">Gestion du Stock</h1>
      <p class="text-gray-600 mb-4">
        Cette page est accessible car le module Stock n'est pas bloqué pour votre entreprise.
      </p>
      
      <!-- Exemple de contenu de la page -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-4">Actions disponibles</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Ajouter un produit
          </button>
          <button class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
            Inventaire
          </button>
          <button class="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
            Rapports de stock
          </button>
        </div>
      </div>
    </div>

    <!-- Message d'erreur si nécessaire -->
    <div v-if="blockerError" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      <strong>Erreur:</strong> {{ blockerError }}
    </div>
  </div>
</template>

<script setup lang="ts">
// Import et utilisation de la composable usePageBlocker
import { usePageBlocker } from '~/composables/usePageBlocker'
import { onMounted } from 'vue'

// Définir les métadonnées de la page
definePageMeta({
  title: 'Gestion du Stock - Exemple',
  description: 'Exemple d\'intégration de la composable usePageBlocker'
})

// Utilisation de la composable pour le module "Stock"
const {
  isBlocked: isBlockedStock,
  isLoading: isLoadingBlocker,
  error: blockerError,
  checkAndBlock,
  isMenuBlocked,
  getBlockedMenus
} = usePageBlocker('Stock')

// Exemple d'utilisation avancée: vérifier si d'autres menus sont bloqués
const checkOtherMenus = async () => {
  const clientsBlocked = await isMenuBlocked('Clients')
  const facturesBlocked = await isMenuBlocked('Facture')
  const allBlockedMenus = await getBlockedMenus()
  
  console.log('Clients bloqué:', clientsBlocked)
  console.log('Factures bloqué:', facturesBlocked)
  console.log('Tous les menus bloqués:', allBlockedMenus)
}

// Fonction pour forcer une nouvelle vérification
const _recheckAccess = async () => {
  await checkAndBlock()
}

// Exemple d'utilisation lors du montage
onMounted(() => {
  // Vérifier d'autres menus si nécessaire
  checkOtherMenus()
})
</script>

<style scoped>
/* Styles spécifiques à cette page d'exemple */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>