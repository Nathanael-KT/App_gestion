# usePageBlocker - Solution de blocage de pages par module

Cette solution implémente une composable Vue.js pour bloquer l'accès aux pages dont le module est désactivé pour l'entreprise. Elle offre une protection flexible et réutilisable contre l'accès direct aux pages, même via des URLs directes ou des favoris.

## 🎯 Objectif

Sécuriser l'accès direct aux pages même si l'utilisateur utilise une URL ou un favori, sans passer par le menu, en vérifiant les permissions au niveau de chaque page.

## 📦 Fichiers créés

### Composable principale
- `app/composables/usePageBlocker.ts` - La composable principale

### Pages d'exemple
- `app/pages/demo-page-blocker.vue` - Démonstration interactive avec tests
- `app/pages/exemple-page-blocker.vue` - Exemple basique d'utilisation
- `app/pages/stock/categories-with-blocker.vue` - Exemple d'intégration dans une page existante

### Documentation
- `docs/usePageBlocker.md` - Documentation complète de l'API
- `docs/integration-guide.md` - Guide d'intégration étape par étape
- `docs/test-manual.js` - Scénarios de tests manuels
- `docs/README-usePageBlocker.md` - Ce fichier

## 🚀 Utilisation rapide

```vue
<script setup lang="ts">
import { usePageBlocker } from '~/composables/usePageBlocker'

// Protection automatique pour le module Stock
const { isBlocked, isLoading, error } = usePageBlocker('Stock')
</script>

<template>
  <div>
    <div v-if="isLoading">Vérification des permissions...</div>
    <div v-else-if="!isBlocked">
      <!-- Contenu de la page -->
    </div>
    <div v-if="error">Erreur: {{ error }}</div>
  </div>
</template>
```

## 🔧 Fonctionnalités

### Protection automatique
- ✅ Vérification au montage du composant
- ✅ Redirection automatique vers `/error?blocked=1` si bloqué
- ✅ Surveillance des changements de `companyId`

### API flexible
- ✅ `isMenuBlocked(menuName)` - Vérifier un menu spécifique
- ✅ `getBlockedMenus()` - Obtenir la liste complète des menus bloqués
- ✅ `checkAndBlock()` - Forcer une nouvelle vérification

### États réactifs
- ✅ `isBlocked` - Indique si le module est bloqué
- ✅ `isLoading` - Indique si la vérification est en cours
- ✅ `error` - Message d'erreur éventuel

## 🏗️ Architecture

```
usePageBlocker(menuName)
    ↓
Récupère companyId via useCurrentUser()
    ↓
Requête Supabase: company_settings.blocked_menus
    ↓
Vérifie si menuName ∈ blocked_menus
    ↓
Si bloqué → navigateTo('/error?blocked=1&message=...')
Si autorisé → Continue normalement
```

## 📋 Modules supportés

- `Accueil` → `/`
- `Stock` → `/stock`
- `Clients` → `/client`
- `Commandes` → `/commande`
- `Facture` → `/facture`
- `Caisse` → `/caisse`
- `Utilisateurs` → `/utilisateurs`
- `Rapports` → `/rapports`
- `Discussion` → `/discussion`
- `Forum` → `/forum`
- `Paramètres` → `/parametres`
- `Aide` → `/aide`

## 🔄 Complémentarité avec le middleware

Cette composable complète le middleware `blocked-menus.global.ts` existant :

| Approche | Avantages | Utilisation |
|----------|-----------|-------------|
| **Middleware global** | Protection automatique de toutes les routes | Sécurité de base |
| **Composable** | Contrôle granulaire + UI personnalisée | Pages spécifiques |

Les deux peuvent coexister pour une sécurité renforcée.

## 🧪 Tests

### Tests automatiques
Visitez les pages d'exemple pour tester les fonctionnalités :
- `/demo-page-blocker` - Tests interactifs complets
- `/exemple-page-blocker` - Exemple basique
- `/stock/categories-with-blocker` - Intégration page existante

### Tests manuels
1. Modifier `company_settings.blocked_menus` dans Supabase
2. Ajouter/retirer des modules de la liste
3. Recharger les pages et vérifier le comportement
4. Tester avec différents `companyId`

## 🚦 États et comportements

| État | Condition | Comportement |
|------|-----------|-------------|
| `isLoading: true` | Vérification en cours | Affiche un loader |
| `isBlocked: true` | Module bloqué | Redirection automatique |
| `isBlocked: false` | Module autorisé | Affiche le contenu |
| `error: string` | Erreur réseau/API | Affiche l'erreur |

## 📝 Exemple d'intégration complète

```vue
<script setup lang="ts">
import { usePageBlocker } from '~/composables/usePageBlocker'

// Protection du module Stock
const { 
  isBlocked: isStockBlocked, 
  isLoading: isCheckingPermissions,
  error: permissionError,
  isMenuBlocked,
  getBlockedMenus 
} = usePageBlocker('Stock')

// État pour l'affichage
const shouldShowContent = computed(() => {
  return !isCheckingPermissions.value && !isStockBlocked.value
})

// Tests supplémentaires
const testOtherModules = async () => {
  const clientsBlocked = await isMenuBlocked('Clients')
  const allBlocked = await getBlockedMenus()
  console.log({ clientsBlocked, allBlocked })
}
</script>

<template>
  <div>
    <!-- Indicateur de chargement -->
    <div v-if="isCheckingPermissions" class="loading">
      Vérification des permissions...
    </div>

    <!-- Erreurs -->
    <div v-if="permissionError" class="error">
      {{ permissionError }}
    </div>

    <!-- Contenu principal -->
    <div v-if="shouldShowContent">
      <h1>Page protégée du module Stock</h1>
      <button @click="testOtherModules">Tester autres modules</button>
      <!-- Votre contenu ici -->
    </div>
  </div>
</template>
```

## 🔐 Sécurité

### Côté client
- Vérification automatique au chargement
- Redirection immédiate si bloqué
- UI réactive aux permissions

### Côté serveur
- Middleware global comme filet de sécurité
- Validation des permissions côté API
- Contrôle d'accès aux données Supabase

## 📞 Support

Pour toute question ou problème :
1. Consulter la documentation dans `docs/`
2. Tester avec les pages d'exemple
3. Vérifier les logs de la console
4. Contrôler les settings Supabase

## 🎉 Conclusion

La composable `usePageBlocker` offre une solution complète et flexible pour la protection des pages par module. Elle s'intègre facilement dans les pages existantes avec un minimum de modifications et fournit une API riche pour des besoins avancés.

L'implémentation respecte les bonnes pratiques Vue.js/Nuxt.js et s'appuie sur l'infrastructure existante (Supabase, useCurrentUser) pour une intégration harmonieuse.