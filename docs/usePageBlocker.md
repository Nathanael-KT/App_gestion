# usePageBlocker - Composable de blocage de pages

Cette composable permet de bloquer l'accès aux pages dont le module est désactivé pour l'entreprise. Elle offre une approche flexible et réutilisable pour sécuriser l'accès direct aux pages, même si l'utilisateur utilise une URL directe ou un favori.

## Fonctionnalités

- ✅ Récupère automatiquement la liste des menus bloqués via Supabase et companyId
- ✅ Redirection automatique vers `/error` avec `blocked=1` si le module est bloqué
- ✅ Vérification au montage du composant et lors des changements de companyId
- ✅ API flexible pour vérifications manuelles
- ✅ Gestion des états de chargement et d'erreur
- ✅ Réactive aux changements de contexte utilisateur

## Utilisation de base

```vue
&lt;script setup lang="ts"&gt;
import { usePageBlocker } from '~/composables/usePageBlocker'

// Utilisation pour protéger une page du module "Stock"
const { isBlocked, isLoading, error } = usePageBlocker('Stock')
&lt;/script&gt;

&lt;template&gt;
  &lt;div&gt;
    &lt;!-- La composable redirige automatiquement si le module est bloqué --&gt;
    &lt;div v-if="isLoading"&gt;Vérification des permissions...&lt;/div&gt;
    &lt;div v-else-if="!isBlocked"&gt;
      &lt;!-- Contenu de la page --&gt;
      &lt;h1&gt;Page du module Stock&lt;/h1&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/template&gt;
```

## API complète

### Paramètres

- `menuName` (string) : Le nom du menu/module à vérifier (ex: 'Stock', 'Clients', 'Facture', etc.)

### Valeurs retournées

#### État réactif
- `isBlocked` (Ref&lt;boolean&gt;) : Indique si le module est bloqué
- `isLoading` (Ref&lt;boolean&gt;) : Indique si la vérification est en cours
- `error` (Ref&lt;string | null&gt;) : Message d'erreur éventuel

#### Méthodes
- `checkAndBlock()` : Force une nouvelle vérification et redirige si nécessaire
- `isMenuBlocked(menuName: string)` : Vérifie si un menu spécifique est bloqué (sans redirection)
- `getBlockedMenus()` : Retourne la liste complète des menus bloqués

#### Utilitaires
- `menuToRootPath` : Mapping des noms de menus vers leurs chemins racines

## Exemples d'utilisation avancée

### Vérification de plusieurs modules
```vue
&lt;script setup lang="ts"&gt;
const { isMenuBlocked, getBlockedMenus } = usePageBlocker('Stock')

const checkMultipleMenus = async () =&gt; {
  const stockBlocked = await isMenuBlocked('Stock')
  const clientsBlocked = await isMenuBlocked('Clients')
  const allBlocked = await getBlockedMenus()
  
  console.log('Stock bloqué:', stockBlocked)
  console.log('Clients bloqué:', clientsBlocked)
  console.log('Tous les menus bloqués:', allBlocked)
}
&lt;/script&gt;
```

### Gestion des erreurs
```vue
&lt;script setup lang="ts"&gt;
const { isBlocked, isLoading, error, checkAndBlock } = usePageBlocker('Facture')

const retryCheck = async () =&gt; {
  try {
    await checkAndBlock()
  } catch (err) {
    console.error('Erreur lors de la revérification:', err)
  }
}
&lt;/script&gt;

&lt;template&gt;
  &lt;div&gt;
    &lt;div v-if="error" class="error"&gt;
      {{ error }}
      &lt;button @click="retryCheck"&gt;Réessayer&lt;/button&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/template&gt;
```

## Modules supportés

Les modules suivants peuvent être bloqués :

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

## Fonctionnement technique

1. **Initialisation** : La composable récupère le `companyId` depuis `useCurrentUser()`
2. **Requête Supabase** : Interroge la table `company_settings` pour obtenir le champ `blocked_menus`
3. **Vérification** : Compare le `menuName` fourni avec la liste des menus bloqués
4. **Redirection** : Si bloqué, redirige vers `/error?blocked=1&message=...`
5. **Réactivité** : Surveille les changements de `companyId` pour re-vérifier

## Différence avec le middleware global

Cette composable complète le middleware `blocked-menus.global.ts` existant :

- **Middleware** : Protection automatique de toutes les routes
- **Composable** : Contrôle granulaire par page avec API flexible

Les deux approches peuvent coexister pour une sécurité renforcée.

## Intégration dans une page existante

```vue
&lt;script setup lang="ts"&gt;
// Dans une page existante du module Stock
import { usePageBlocker } from '~/composables/usePageBlocker'

// Protection de la page
const { isBlocked, isLoading } = usePageBlocker('Stock')

// Votre logique existante...
&lt;/script&gt;

&lt;template&gt;
  &lt;div&gt;
    &lt;!-- Loader pendant la vérification --&gt;
    &lt;div v-if="isLoading"&gt;Chargement...&lt;/div&gt;
    
    &lt;!-- Contenu existant (la redirection se fait automatiquement si bloqué) --&gt;
    &lt;div v-else&gt;
      &lt;!-- Votre contenu existant --&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/template&gt;
```