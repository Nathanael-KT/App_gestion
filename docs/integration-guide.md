# Guide d'intégration de usePageBlocker dans une page existante

Ce fichier montre comment intégrer la composable `usePageBlocker` dans une page existante en modifiant le minimum de code possible.

## Étapes d'intégration

### 1. Import de la composable

```typescript
// Ajouter cet import avec les autres imports
import { usePageBlocker } from "../../composables/usePageBlocker";
```

### 2. Utilisation dans le setup

```typescript
// Ajouter cette ligne dans la section setup
const { 
  isBlocked: isStockBlocked, 
  isLoading: isCheckingPermissions,
  error: permissionError 
} = usePageBlocker('Stock');
```

### 3. Computed pour l'affichage conditionnel

```typescript
// Ajouter ce computed pour déterminer quand afficher le contenu
const shouldShowContent = computed(() => {
  return !isCheckingPermissions.value && !isStockBlocked.value && !isLoadingUser.value;
});
```

### 4. Modification du template

```vue
<template>
  <div>
    <!-- Indicateur de vérification des permissions -->
    <div v-if="isCheckingPermissions" class="p-4 bg-blue-50 border border-blue-200 rounded">
      <div class="flex items-center">
        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3" />
        <span>Vérification des permissions...</span>
      </div>
    </div>

    <!-- Message d'erreur de permissions -->
    <div v-if="permissionError && !isCheckingPermissions" class="p-4 bg-red-50 border border-red-200 rounded">
      <strong>Erreur:</strong> {{ permissionError }}
    </div>

    <!-- Contenu principal (envelopper le contenu existant) -->
    <div v-if="shouldShowContent">
      <!-- VOTRE CONTENU EXISTANT ICI -->
    </div>
  </div>
</template>
```

## Exemple complet

Voir le fichier `categories-with-blocker.vue` pour un exemple complet d'intégration dans la page de catégories du stock.

## Modules disponibles

- `Stock` - Module de gestion des stocks
- `Clients` - Module de gestion des clients  
- `Facture` - Module de facturation
- `Commandes` - Module de gestion des commandes
- `Caisse` - Module de caisse
- `Utilisateurs` - Module de gestion des utilisateurs
- `Rapports` - Module de rapports
- `Discussion` - Module de discussion
- `Forum` - Module de forum
- `Paramètres` - Module de paramètres
- `Aide` - Module d'aide
- `Accueil` - Page d'accueil

## Avantages de cette approche

1. **Protection automatique** - Vérification au chargement de la page
2. **Redirection automatique** - Si bloqué, redirige vers `/error?blocked=1`
3. **Réactif** - Surveille les changements de `companyId`
4. **Non-invasif** - Modifications minimales du code existant
5. **API flexible** - Méthodes pour vérifications supplémentaires

## Différence avec le middleware

- **Middleware global** : Protection automatique de toutes les routes
- **Composable** : Contrôle granulaire par page avec UI personnalisée

Les deux peuvent coexister pour une sécurité renforcée.