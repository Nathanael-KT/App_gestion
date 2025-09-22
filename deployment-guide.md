# Guide de déploiement - App Gestion avec Deno Deploy et Supabase

## 🎯 Architecture de déploiement

### Frontend + API : Deno Deploy

- Hébergement de l'application Nuxt.js
- Edge computing global
- Serverless automatique

### Backend : Supabase (Production)

- Base de données PostgreSQL
- Authentification
- API REST/GraphQL automatique
- Real-time subscriptions
- Storage pour les fichiers

## 📋 Checklist de déploiement

### Phase 1 : Préparation Supabase Production

#### 1.1 Créer un projet Supabase en production

```bash
# Se connecter à Supabase
npx supabase login

# Créer un nouveau projet (via dashboard)
# Ou lier un projet existant
npx supabase link --project-ref YOUR_PROJECT_REF
```

#### 1.2 Migrer la base de données vers la production

```bash
# Pousser les migrations vers production
npx supabase db push

# Ou générer les migrations si nécessaire
npx supabase db diff --schema public > supabase/migrations/$(date +%Y%m%d%H%M%S)_production_schema.sql
npx supabase db push
```

#### 1.3 Configurer les variables d'environnement production

Créer `.env.production` :

```env
# Supabase Production
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Configuration Nuxt
NUXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key

# URLs de redirection (production)
NUXT_PUBLIC_SITE_URL=https://your-app.deno.dev
```

### Phase 2 : Préparation pour Deno Deploy

#### 2.1 Optimiser la configuration Nuxt pour Deno Deploy

Modifier `nuxt.config.ts` :

```typescript
export default defineNuxtConfig({
  // ... configuration existante

  nitro: {
    preset: "deno-deploy",
    // Optimisations pour Deno Deploy
    experimental: {
      wasm: true,
    },
  },

  // SSR requis pour Deno Deploy
  ssr: true,

  // Optimisations de build
  build: {
    transpile: ["@supabase/supabase-js"],
  },

  runtimeConfig: {
    // Variables côté serveur
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

    public: {
      // Variables côté client
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL,
    },
  },
});
```

#### 2.2 Créer le fichier de déploiement Deno

Créer `deno.json` :

```json
{
  "tasks": {
    "start": "deno run --allow-net --allow-read --allow-env .output/server/index.mjs"
  },
  "imports": {
    "@/": "./",
    "~/": "./"
  }
}
```

#### 2.3 Optimiser les composables pour la production

Vérifier que tous les composables utilisent correctement :

- `useRuntimeConfig()` pour les variables d'environnement
- `useSupabaseClient()` pour les appels API
- Gestion d'erreur appropriée

### Phase 3 : Build et déploiement

#### 3.1 Build pour production

```bash
# Build optimisé pour Deno Deploy
npm run build

# Ou avec pnpm
pnpm build
```

#### 3.2 Test local avec Deno

```bash
# Installer Deno si pas encore fait
curl -fsSL https://deno.land/install.sh | sh

# Tester localement
deno run --allow-net --allow-read --allow-env .output/server/index.mjs
```

#### 3.3 Déploiement sur Deno Deploy

**Option 1 : Via GitHub Actions (Recommandé)**
Créer `.github/workflows/deploy.yml`

**Option 2 : Via Deno Deploy CLI**

```bash
# Installer deployctl
deno install --allow-read --allow-write --allow-env --allow-net --allow-run --no-check -r -f https://deno.land/x/deploy/deployctl.ts

# Déployer
deployctl deploy --project=your-app-name .output/server/index.mjs
```

**Option 3 : Via l'interface web Deno Deploy**

- Connecter le repository GitHub
- Configurer le build automatique

### Phase 4 : Configuration post-déploiement

#### 4.1 Configurer les variables d'environnement sur Deno Deploy

Dans le dashboard Deno Deploy, ajouter :

- `NUXT_PUBLIC_SUPABASE_URL`
- `NUXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NUXT_PUBLIC_SITE_URL`

#### 4.2 Configurer Supabase pour le domaine de production

Dans Supabase Dashboard > Authentication > URL Configuration :

- Site URL : `https://your-app.deno.dev`
- Redirect URLs : `https://your-app.deno.dev/**`

#### 4.3 Configurer les politiques RLS (Row Level Security)

S'assurer que toutes les tables ont les bonnes politiques de sécurité configurées.

## 🔧 Optimisations recommandées

### Performance

1. **Lazy loading des composants lourds**
2. **Optimisation des images** (déjà configuré avec @nuxt/image)
3. **Mise en cache appropriée**
4. **Splitting du code**

### Sécurité

1. **Validation côté serveur** pour toutes les API
2. **Politiques RLS strictes** sur Supabase
3. **Variables d'environnement sécurisées**
4. **HTTPS uniquement**

### Monitoring

1. **Logs Deno Deploy**
2. **Métriques Supabase**
3. **Alertes de performance**
4. **Monitoring des erreurs**

## 🚨 Points d'attention

### Limites Deno Deploy (gratuit)

- 100,000 requêtes/mois
- 1GB de transfert/mois
- 10ms de temps de démarrage à froid

### Limites Supabase (gratuit)

- 500MB de base de données
- 1GB de stockage
- 2GB de transfert/mois

### Montée en charge

Planifier la migration vers les plans payants selon la croissance :

- Deno Deploy Pro : $10/mois
- Supabase Pro : $25/mois

## 📝 Maintenance

### Sauvegarde

```bash
# Backup automatique de la DB
npx supabase db dump --db-url "postgresql://..." > backup.sql
```

### Updates

```bash
# Mise à jour des dépendances
pnpm update

# Nouvelles migrations
npx supabase migration new update_name
npx supabase db push
```

### Monitoring quotidien

1. Vérifier les logs d'erreur
2. Monitorer l'usage des ressources
3. Vérifier la performance des requêtes
