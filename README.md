# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

# 🚀 App Gestion - Application de Gestion d'Entreprise

Une application complète de gestion d'entreprise construite avec **Nuxt 3**, **Supabase** et déployée sur **Vercel**.

🔧 **Mise à jour Pipeline** : Fix appliqué pour GitHub Actions issue #232 - Garantit la création d'artifacts même en cas d'erreur de build.

## ✨ Fonctionnalités

- 📊 **Tableau de bord** avec métriques en temps réel
- 🛍️ **Gestion des stocks** et inventaire
- 👥 **Gestion des clients** et CRM
- 📋 **Gestion des commandes** et livraisons
- 🧾 **Facturation** et paiements
- 💰 **Gestion de caisse** et rapports
- 👤 **Gestion des utilisateurs** et rôles
- 🏢 **Configuration multi-magasins**

## 🔧 Technologies Utilisées

- **Frontend**: Nuxt 3, Vue 3, TailwindCSS, Nuxt UI
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Déploiement**: Vercel
- **CI/CD**: GitHub Actions

## 🚀 Pipeline CI/CD Automatique

### Déclenchement Automatique

Le pipeline se déclenche automatiquement lors d'un **merge sur la branche `main`** et exécute :

1. **🧪 Tests et Vérifications**
   - Linting du code
   - Vérification des types TypeScript

2. **�️ Migration de Base de Données**
   - Application automatique des migrations Supabase
   - Vérification de l'état de la base de données

3. **🏗️ Build de l'Application**
   - Build optimisé pour la production
   - Configuration des variables d'environnement

4. **🚀 Déploiement en Production**
   - Déploiement automatique sur Vercel
   - Configuration des variables d'environnement
   - Vérification de la disponibilité

### Configuration des Secrets GitHub

Les secrets suivants doivent être configurés dans votre repository GitHub :

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PROJECT_ID=your-project-id
SUPABASE_DB_PASSWORD=your-db-password

# Vercel
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id
```

### Utilisation du Script de Configuration

Un script automatisé est disponible pour configurer les secrets :

```bash
chmod +x scripts/setup-github-secrets.sh
./scripts/setup-github-secrets.sh
```

## �️ Installation et Développement Local

### Prérequis

- Node.js 18+
- pnpm
- Supabase CLI
- Git

### Installation

```bash
# Cloner le repository
git clone https://github.com/jeobran69367/App_gestion.git
cd App_gestion

# Installer les dépendances
pnpm install

# Configurer les variables d'environnement
cp .env.example .env

# Démarrer le serveur de développement
pnpm dev
```

### Commandes Disponibles

```bash
# Développement
pnpm dev                 # Serveur de développement
pnpm build              # Build pour la production
pnpm preview            # Prévisualiser le build

# Tests et Qualité
pnpm lint               # Linter le code
pnpm lint:fix           # Corriger automatiquement
pnpm typecheck          # Vérification TypeScript

# Base de Données
pnpm db:migrate         # Appliquer les migrations
pnpm db:reset           # Réinitialiser la DB
pnpm db:seed            # Réinitialiser avec données de test

# Déploiement
pnpm deploy:prod        # Déploiement manuel en production
```

## 🌐 URLs de Production

- **Application**: https://app-gestion-prod.deno.dev
- **Dashboard Deno Deploy**: https://dash.deno.com/projects/app-gestion-prod

## 📁 Structure du Projet

```
App_gestion/
├── 📱 app/                          # Code source de l'application
│   ├── components/                  # Composants Vue réutilisables
│   ├── composables/                 # Logique métier réutilisable
│   ├── layouts/                     # Layouts de page
│   ├── middleware/                  # Middleware de routage
│   ├── pages/                       # Pages de l'application
│   └── types/                       # Types TypeScript
├── 🚀 .github/workflows/            # Pipeline CI/CD
├── 🗄️ supabase/                     # Configuration et migrations DB
├── 📜 scripts/                      # Scripts d'automatisation
├── 🔧 nuxt.config.ts               # Configuration Nuxt
└── 📦 package.json                 # Dépendances et scripts
```

## � Configuration des Variables d'Environnement

### Fichiers d'Environnement

- `.env.example` : Template des variables
- `.env` : Variables locales (non versionnées)
- `.env.production` : Variables de production (générées automatiquement)

### Variables Requises

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
NUXT_SUPABASE_URL=https://your-project.supabase.co
NUXT_SUPABASE_ANON_KEY=your-anon-key

# Optionnel pour l'administration
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🔄 Workflow de Déploiement

1. **Développement Local**

   ```bash
   git checkout -b feature/nouvelle-fonctionnalite
   # Développer votre fonctionnalité
   git commit -m "feat: nouvelle fonctionnalité"
   ```

2. **Tests et Validation**

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm build  # Test du build local
   ```

3. **Merge vers Main**

   ```bash
   git checkout main
   git merge feature/nouvelle-fonctionnalite
   git push origin main
   ```

4. **Déploiement Automatique**
   - Le pipeline CI/CD se déclenche automatiquement
   - Migration de la base de données
   - Build et déploiement en production
   - Notification de succès/échec

## 🆘 Dépannage

### Problèmes Courants

1. **Erreurs de Build**

   ```bash
   pnpm clean  # Nettoyer le cache
   pnpm install
   pnpm build
   ```

2. **Problèmes de Base de Données**

   ```bash
   supabase db reset  # Réinitialiser la DB locale
   supabase db push   # Appliquer les migrations
   ```

3. **Erreurs de Déploiement**
   - Vérifier les secrets GitHub
   - Consulter les logs du workflow
   - Vérifier les variables d'environnement

### Logs et Monitoring

```bash
# Logs de déploiement Deno
deployctl logs --project=app-gestion-prod

# Logs Supabase
supabase logs
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit vos changements (`git commit -m 'feat: add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou problème :

- 📧 Email : jeobran69367@gmail.com
- 🐛 Issues : [GitHub Issues](https://github.com/jeobran69367/App_gestion/issues)

---

**Développé avec ❤️ par l'équipe App Gestion**

## 🚀 Déploiement Automatique

Ce projet dispose d'un **pipeline CI/CD automatique** qui se déclenche lors des merges sur `main` :

- ✅ **Tests** et validation du code
- 🗄️ **Migrations** automatiques de la base de données
- 🔨 **Build** optimisé pour la production
- 🌐 **Déploiement** automatique sur Deno Deploy

**URL de production** : https://app-gestion-prod.deno.dev

## ⚙️ Configuration Initiale

### 1. Installation des dépendances

```bash
pnpm install
```

### 2. Configuration des secrets pour le CI/CD

```bash
# Script automatique de configuration
pnpm run setup:secrets

# Ou manuellement dans GitHub Settings > Secrets
```

### 3. Variables d'environnement

Copiez `.env.example` vers `.env.local` et configurez vos variables Supabase.

## 🛠️ Développement

### Serveur de développement

```bash
pnpm dev
```

L'application sera disponible sur `http://localhost:3000`

### Scripts disponibles

```bash
# Développement
pnpm dev                    # Serveur de développement
pnpm build                  # Build de production
pnpm preview               # Aperçu de la build

# Tests et qualité
pnpm lint                  # Linting du code
pnpm typecheck            # Vérification TypeScript

# Base de données
pnpm db:migrate           # Appliquer les migrations
pnpm db:reset             # Réinitialiser la DB
pnpm db:seed              # Réinitialiser avec données de test

# Déploiement
pnpm deploy:prod          # Déploiement manuel en production
```

## 🗄️ Base de Données

L'application utilise **Supabase** comme backend :

- 🔐 **Authentification** intégrée
- 📊 **PostgreSQL** avec Row Level Security
- 🔄 **Migrations** automatiques via le pipeline
- 📱 **API auto-générée** et temps réel

### Migrations

Les migrations sont dans `supabase/migrations/` et sont **appliquées automatiquement** par le pipeline
(`.github/workflows/deploy.yml`, job `Database Migration`) à chaque merge sur `main` :

1. Le job détecte les nouveaux fichiers `supabase/migrations/*.sql` du push.
2. `supabase db push` (CLI officielle) applique **toutes** les migrations en attente et les enregistre
   dans `supabase_migrations.schema_migrations` — cohérent avec les `supabase db push` manuels.

> ℹ️ Ce job est **indépendant des tests/lint** : un échec de test ne bloque plus l'application des
> migrations (correction de l'issue #90).

**Secrets GitHub requis** (Settings > Secrets and variables > Actions) :
- `SUPABASE_ACCESS_TOKEN` — token personnel Supabase (avec droits sur le projet)
- `SUPABASE_PROJECT_ID` — référence du projet (ex : `abcdefghijk`)
- `SUPABASE_DB_PASSWORD` — mot de passe `postgres` du projet

En cas de besoin, le workflow manuel `Supabase Repair And Push` (`workflow_dispatch`) permet de
réparer l'historique des migrations et de tout repousser.

## 🏗️ Architecture

```
app/                     # Code de l'application Nuxt
├── components/         # Composants Vue réutilisables
├── composables/       # Logic métier et hooks
├── layouts/           # Layouts de pages
├── middleware/        # Middleware de routage
├── pages/            # Pages et routes automatiques
└── types/            # Types TypeScript

supabase/             # Configuration et migrations DB
├── migrations/       # Migrations SQL
└── config.toml      # Configuration Supabase

.github/              # Pipeline CI/CD
└── workflows/
    └── deploy.yml    # Workflow de déploiement automatique

scripts/              # Scripts utilitaires
docs/                # Documentation
```

## 📋 Pipeline CI/CD

Le pipeline automatique comprend :

1. **Tests** 🧪
   - Linting ESLint
   - Vérification TypeScript
   - Tests unitaires (si présents)

2. **Migration DB** 🗄️
   - Connexion à Supabase
   - Application des migrations pendantes
   - Vérification du statut

3. **Build** 🔨
   - Build Nuxt optimisé
   - Génération des assets
   - Préparation pour Deno Deploy

4. **Déploiement** 🌐
   - Déploiement automatique sur Deno Deploy
   - Configuration des variables d'environnement
   - Vérification de la disponibilité

### Configuration requise

**Secrets GitHub nécessaires :**

- `SUPABASE_URL` - URL du projet Supabase
- `SUPABASE_ANON_KEY` - Clé publique Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Clé de service (migrations)
- `SUPABASE_PROJECT_ID` - ID du projet
- `SUPABASE_DB_PASSWORD` - Mot de passe DB
- `DENO_DEPLOY_TOKEN` - Token Deno Deploy

## 🚀 Utilisation

### Déploiement automatique

1. Créez une branche pour vos modifications
2. Committez et poussez vos changements
3. Créez une Pull Request vers `main`
4. Une fois mergée → **Déploiement automatique** ! 🎉

### Monitoring

- **GitHub Actions** : Logs et statut des déploiements
- **Deno Deploy Dashboard** : Monitoring de l'application
- **Supabase Dashboard** : Monitoring de la base de données

## 🔧 Technologies

- **Frontend** : Nuxt 3, Vue 3, TypeScript
- **UI** : Nuxt UI, Tailwind CSS, Lucide Icons
- **Backend** : Supabase (PostgreSQL + Auth + API)
- **Déploiement** : Deno Deploy
- **CI/CD** : GitHub Actions
- **Outils** : ESLint, Husky, PNPM

## 📞 Support

- 📖 **Documentation** : Voir `docs/PIPELINE.md`
- 🐛 **Issues** : GitHub Issues
- 💬 **Discussions** : GitHub Discussions

---

**Développé avec ❤️ pour simplifier la gestion d'entreprise**

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
