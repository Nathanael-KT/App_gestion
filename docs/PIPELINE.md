# Pipeline CI/CD Automatique

Ce projet dispose d'un pipeline CI/CD automatique qui se déclenche lors des merges sur la branche `main`.

## 🚀 Fonctionnement du Pipeline

### Déclencheurs

- ✅ Push sur la branche `main`
- ✅ Pull Request vers `main` (tests uniquement)

### Étapes du Pipeline

#### 1. **Tests** 🧪

- Installation des dépendances
- Linting du code
- Vérification des types TypeScript

#### 2. **Migration Base de Données** 🗄️

- Connexion à Supabase
- Exécution des migrations pendantes
- Vérification du statut des migrations

#### 3. **Build** 🔨

- Construction de l'application Nuxt
- Optimisation pour la production
- Création des artifacts de déploiement

#### 4. **Déploiement** 🌐

- Déploiement automatique sur Deno Deploy
- Configuration des variables d'environnement
- Vérification du déploiement

#### 5. **Notification** 📱

- Statut de réussite/échec
- URL de l'application déployée

## ⚙️ Configuration Initiale

### 1. Secrets GitHub Requis

Le pipeline nécessite les secrets suivants dans votre repository GitHub :

```bash
# Supabase
SUPABASE_URL                 # URL de votre projet Supabase
SUPABASE_ANON_KEY           # Clé publique Supabase
SUPABASE_SERVICE_ROLE_KEY   # Clé de service Supabase (admin)
SUPABASE_PROJECT_ID         # ID du projet Supabase
SUPABASE_DB_PASSWORD        # Mot de passe de la base de données

# Deno Deploy
DENO_DEPLOY_TOKEN           # Token d'accès Deno Deploy
```

### 2. Configuration Automatique

Utilisez le script fourni pour configurer automatiquement tous les secrets :

```bash
./scripts/setup-github-secrets.sh
```

### 3. Configuration Manuelle

Si vous préférez configurer manuellement :

1. Allez dans **Settings** > **Secrets and variables** > **Actions**
2. Cliquez sur **New repository secret**
3. Ajoutez chaque secret avec sa valeur

## 🔧 Récupération des Informations

### Supabase

1. Connectez-vous à [supabase.com](https://supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Settings** > **API**
4. Copiez l'URL et les clés
5. Pour le PROJECT_ID : visible dans l'URL ou Settings > General

### Deno Deploy

1. Connectez-vous à [dash.deno.com](https://dash.deno.com)
2. Allez dans **Account** > **Access Tokens**
3. Créez un nouveau token avec les permissions de déploiement

## 📋 Utilisation

### Déploiement Automatique

1. Créez une branche pour vos modifications
2. Committez vos changements
3. Créez une Pull Request vers `main`
4. Une fois mergée, le déploiement se lance automatiquement

### Monitoring

- Consultez l'onglet **Actions** de votre repository GitHub
- Suivez les logs de chaque étape
- Recevez des notifications en cas d'échec

## 🛠️ Structure des Fichiers

```
.github/
└── workflows/
    └── deploy.yml          # Configuration du pipeline CI/CD

scripts/
└── setup-github-secrets.sh # Script de configuration automatique

supabase/
├── migrations/             # Migrations de base de données
└── config.toml            # Configuration Supabase
```

## 🔍 Dépannage

### Erreurs Communes

#### Migration échoue

- Vérifiez les credentials Supabase
- Assurez-vous que le projet est accessible
- Vérifiez la syntaxe SQL des migrations

#### Build échoue

- Vérifiez les erreurs TypeScript
- Assurez-vous que toutes les dépendances sont installées
- Vérifiez la configuration Nuxt

#### Déploiement échoue

- Vérifiez le token Deno Deploy
- Assurez-vous que le projet existe
- Vérifiez les variables d'environnement

### Logs et Debug

- Consultez les Actions GitHub pour les logs détaillés
- Activez le mode debug en ajoutant `ACTIONS_STEP_DEBUG: true` aux secrets
- Utilisez `echo` dans le workflow pour débugger

## 🎯 URLs de Production

- **Application** : https://app-gestion-prod.deno.dev
- **Dashboard Deno** : https://dash.deno.com/projects/app-gestion-prod
- **Actions GitHub** : https://github.com/jeobran69367/App_gestion/actions

## 📞 Support

En cas de problème :

1. Vérifiez les logs GitHub Actions
2. Consultez la documentation Supabase/Deno Deploy
3. Vérifiez la configuration des secrets
