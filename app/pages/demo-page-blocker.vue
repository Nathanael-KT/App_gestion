<template>
  <div class="p-6">
    <!-- Loader pendant la vérification des permissions -->
    <div v-if="isLoadingBlocker" class="flex items-center justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      <span class="ml-2 text-gray-600">Vérification des permissions...</span>
    </div>

    <!-- Contenu de la page si l'accès est autorisé -->
    <div v-else-if="!isBlockedStock" class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold text-gray-900">
          Exemple d'intégration usePageBlocker
        </h1>
        <div class="flex items-center space-x-2">
          <div class="w-3 h-3 bg-green-500 rounded-full" />
          <span class="text-sm text-gray-600">Module Stock accessible</span>
        </div>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 class="text-lg font-semibold text-blue-900 mb-2">
          ✅ Protection active
        </h2>
        <p class="text-blue-800">
          Cette page utilise la composable <code class="bg-blue-100 px-2 py-1 rounded">usePageBlocker('Stock')</code> 
          pour vérifier automatiquement si le module Stock est autorisé pour votre entreprise.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white border border-gray-200 rounded-lg p-6">
          <h3 class="text-lg font-semibold mb-4">Code d'intégration</h3>
          <pre class="bg-gray-100 p-4 rounded text-sm overflow-x-auto"><code>import { usePageBlocker } from '~/composables/usePageBlocker'

// Protection automatique du module Stock
const { isBlocked, isLoading } = usePageBlocker('Stock')</code></pre>
        </div>

        <div class="bg-white border border-gray-200 rounded-lg p-6">
          <h3 class="text-lg font-semibold mb-4">État actuel</h3>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-600">Module:</span>
              <span class="font-medium">Stock</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Statut:</span>
              <span class="text-green-600 font-medium">✅ Autorisé</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Chargement:</span>
              <span class="font-medium">{{ isLoadingBlocker ? 'Oui' : 'Non' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4">Actions de test</h3>
        <div class="flex space-x-4">
          <button 
            @click="testOtherModules"
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Tester autres modules
          </button>
          <button 
            @click="showBlockedMenus"
            class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
          >
            Voir menus bloqués
          </button>
        </div>
        
        <div v-if="testResults" class="mt-4 p-4 bg-gray-50 rounded">
          <h4 class="font-medium mb-2">Résultats des tests:</h4>
          <pre class="text-sm">{{ JSON.stringify(testResults, null, 2) }}</pre>
        </div>
      </div>

      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 class="text-lg font-semibold text-yellow-900 mb-2">
          💡 Comment ça marche
        </h3>
        <ul class="text-yellow-800 space-y-1 text-sm">
          <li>• La composable vérifie automatiquement au montage de la page</li>
          <li>• Si le module est bloqué, redirection automatique vers /error?blocked=1</li>
          <li>• Réactif aux changements de contexte utilisateur (companyId)</li>
          <li>• API flexible pour vérifications manuelles supplémentaires</li>
        </ul>
      </div>
    </div>

    <!-- Message d'erreur si problème -->
    <div v-if="blockerError" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      <strong>Erreur:</strong> {{ blockerError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePageBlocker } from '~/composables/usePageBlocker'

// Métadonnées de la page
definePageMeta({
  title: 'Exemple usePageBlocker - Module Stock',
  description: 'Démonstration de l\'utilisation de la composable usePageBlocker'
})

// Utilisation de la composable pour le module "Stock"
const {
  isBlocked: isBlockedStock,
  isLoading: isLoadingBlocker,
  error: blockerError,
  isMenuBlocked,
  getBlockedMenus
} = usePageBlocker('Stock')

// État pour les tests
const testResults = ref(null)

// Fonction pour tester d'autres modules
const testOtherModules = async () => {
  try {
    const results = {
      modules: {
        Clients: await isMenuBlocked('Clients'),
        Facture: await isMenuBlocked('Facture'),
        Commandes: await isMenuBlocked('Commandes'),
        Caisse: await isMenuBlocked('Caisse')
      },
      timestamp: new Date().toISOString()
    }
    testResults.value = results
  } catch (error) {
    console.error('Erreur lors du test des modules:', error)
    testResults.value = { error: 'Erreur lors du test' }
  }
}

// Fonction pour afficher tous les menus bloqués
const showBlockedMenus = async () => {
  try {
    const blockedMenus = await getBlockedMenus()
    testResults.value = {
      blockedMenus,
      total: blockedMenus.length,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des menus bloqués:', error)
    testResults.value = { error: 'Erreur lors de la récupération' }
  }
}
</script>

<style scoped>
code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

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