# Configuration Secrets GitHub pour NuxtHub

Pour utiliser le nouveau workflow simplifié avec NuxtHub, vous devez configurer ces secrets dans GitHub :

## Secrets existants (à conserver) :

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_ACCESS_TOKEN`

## Nouveaux secrets à ajouter pour NuxtHub :

- `NUXT_HUB_USER_TOKEN` : Token d'utilisateur NuxtHub
- `NUXT_HUB_PROJECT_KEY` : Clé du projet NuxtHub

## Comment obtenir les tokens NuxtHub :

1. **Créer un compte NuxtHub** : https://hub.nuxt.com
2. **Créer un projet** dans votre dashboard NuxtHub
3. **Obtenir le User Token** :
   - Aller dans les paramètres de votre compte
   - Générer un token d'accès personnel
4. **Obtenir la Project Key** :
   - Aller dans les paramètres de votre projet
   - Copier la clé du projet

## Ajout des secrets dans GitHub :

1. Aller dans votre repo GitHub
2. Settings → Secrets and variables → Actions
3. Cliquer sur "New repository secret"
4. Ajouter chaque secret avec sa valeur

## Test du déploiement :

Après avoir configuré les secrets :

1. Faire un commit sur la branche `main`
2. Le workflow se déclenchera automatiquement
3. Vérifier les logs dans l'onglet "Actions" de GitHub
4. L'URL de déploiement sera disponible dans votre dashboard NuxtHub

## Avantages de cette nouvelle approche :

- ✅ **Plus simple** : 100 lignes vs 400+ lignes précédemment
- ✅ **Plus rapide** : Déploiement direct sans conversion Deno
- ✅ **Plus fiable** : Moins de points de défaillance
- ✅ **Natif Nuxt** : Optimisé spécifiquement pour Nuxt
- ✅ **Cache intelligent** : pnpm cache intégré
- ✅ **Migrations automatiques** : Supabase intégré
