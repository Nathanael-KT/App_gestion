# 🐳 Docker Deployment Setup - App Gestion

## Résumé des Changements

L'application App Gestion a été migratée d'un déploiement Deno Deploy vers une architecture Docker pour plus de flexibilité et de portabilité.

### ✅ Problèmes Résolus

1. **Erreur YAML ligne 234** : Caractères Unicode invalides supprimés
2. **Workflow GitHub Actions** : Complètement reécrit pour Docker
3. **Architecture de déploiement** : Migration vers Docker/containers

### 🚀 Nouveaux Fichiers Créés

- `Dockerfile` - Image Docker optimisée pour Nuxt.js
- `.dockerignore` - Optimisation du contexte de build
- `docker-compose.yml` - Orchestration des services
- `nginx.conf` - Configuration proxy inverse (optionnel)
- `scripts/docker-deploy.sh` - Script de déploiement automatisé
- `docs/DOCKER-DEPLOYMENT.md` - Documentation complète

### 🔧 Workflow GitHub Actions

Le nouveau workflow (`deploy.yml`) :

1. **Tests** ✅ - Lint, TypeCheck
2. **Migrations** ✅ - Supabase DB migrations
3. **Build** 🐳 - Construction image Docker
4. **Push** 📦 - Publication sur GitHub Container Registry
5. **Deploy** 🚀 - Instructions de déploiement

### 📦 Registry

- **Registry** : `ghcr.io` (GitHub Container Registry)
- **Image** : `ghcr.io/jeobran69367/app_gestion`
- **Tags** : `latest`, `main`, `<commit-sha>`

## 🎯 Déploiement Rapide

### Local (Développement)

```bash
# 1. Configuration
cp .env.example .env
# Éditer .env avec vos vraies valeurs

# 2. Déploiement automatique
./scripts/docker-deploy.sh
```

### Production (Serveur)

```bash
# 1. Pull de l'image
docker pull ghcr.io/jeobran69367/app_gestion:latest

# 2. Démarrage
docker run -d --name app-gestion \
  -p 3000:3000 \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_ANON_KEY=your_key \
  --restart unless-stopped \
  ghcr.io/jeobran69367/app_gestion:latest
```

## 🔐 Secrets GitHub

Configurez ces secrets dans votre repository :

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_ACCESS_TOKEN`

## 📋 Commandes Utiles

```bash
# Logs en temps réel
docker logs -f app-gestion

# Redémarrage
docker restart app-gestion

# Arrêt et suppression
docker stop app-gestion && docker rm app-gestion

# Docker Compose (développement)
docker-compose up -d        # Démarrage
docker-compose logs -f app  # Logs
docker-compose down         # Arrêt
```

## 🆘 Support

Consultez la documentation complète dans `docs/DOCKER-DEPLOYMENT.md` pour :

- Configuration détaillée
- Dépannage
- Options avancées
- Monitoring

---

**Note** : L'ancienne méthode Deno Deploy est maintenant remplacée par Docker. Tous les fichiers de configuration sont prêts pour la production.
