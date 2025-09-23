# Guide de Déploiement Docker - App Gestion

Ce guide explique comment déployer l'application App Gestion en utilisant Docker.

## 🐳 Architecture de Déploiement

L'application utilise maintenant Docker pour le déploiement, offrant plusieurs avantages :

- **Portabilité** : L'application fonctionne de manière identique sur tous les environnements
- **Isolation** : L'application est isolée dans son propre conteneur
- **Scalabilité** : Facilité de mise à l'échelle horizontale
- **Cohérence** : Même environnement de développement et de production

## 📋 Prérequis

- Docker (version 20.0+)
- Docker Compose (version 2.0+)
- Accès au GitHub Container Registry (GHCR)

## 🚀 Déploiement Local

### 1. Configuration des Variables d'Environnement

Créez un fichier `.env` à la racine du projet :

```bash
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Déploiement avec Docker Compose

```bash
# Construction et démarrage
docker-compose up -d

# Vérification des logs
docker-compose logs -f app

# Arrêt
docker-compose down
```

### 3. Déploiement avec le Script Automatisé

```bash
# Utilisation du script de déploiement
./scripts/docker-deploy.sh
```

## 🌐 Déploiement en Production

### Pipeline CI/CD GitHub Actions

Le workflow automatisé fait les étapes suivantes :

1. **Tests** : Exécution des tests et vérifications de type
2. **Migrations** : Application des migrations Supabase
3. **Build** : Construction de l'image Docker
4. **Push** : Publication sur GitHub Container Registry
5. **Deploy** : Instructions de déploiement

### Variables Secrets GitHub

Configurez ces secrets dans votre repository GitHub :

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_ACCESS_TOKEN`

## 📦 Images Docker

### Registry

Les images sont stockées sur GitHub Container Registry :

- **Registry** : `ghcr.io`
- **Image** : `ghcr.io/jeobran69367/app_gestion`

### Tags Disponibles

- `latest` : Dernière version de la branche main
- `main` : Version de la branche main
- `<sha>` : Version spécifique basée sur le commit SHA

## 🖥️ Déploiement sur Serveur

### Option 1 : Docker Run

```bash
# Pull de l'image
docker pull ghcr.io/jeobran69367/app_gestion:latest

# Arrêt de l'ancien conteneur
docker stop app-gestion || true
docker rm app-gestion || true

# Démarrage du nouveau conteneur
docker run -d --name app-gestion \
  -p 3000:3000 \
  -e SUPABASE_URL=your_supabase_url \
  -e SUPABASE_ANON_KEY=your_supabase_anon_key \
  -e NUXT_SUPABASE_URL=your_supabase_url \
  -e NUXT_SUPABASE_ANON_KEY=your_supabase_anon_key \
  --restart unless-stopped \
  ghcr.io/jeobran69367/app_gestion:latest
```

### Option 2 : Docker Compose Production

Créez un `docker-compose.prod.yml` sur votre serveur :

```yaml
version: "3.8"

services:
  app:
    image: ghcr.io/jeobran69367/app_gestion:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - NUXT_SUPABASE_URL=${SUPABASE_URL}
      - NUXT_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    restart: unless-stopped
    healthcheck:
      test:
        [
          "CMD",
          "wget",
          "--no-verbose",
          "--tries=1",
          "--spider",
          "http://localhost:3000/",
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped
```

## 🔧 Configuration Nginx (Optionnel)

Pour utiliser Nginx comme proxy inverse, le fichier `nginx.conf` est déjà fourni avec :

- Compression Gzip
- Headers de sécurité
- Proxy vers l'application Nuxt
- Health checks

## 📊 Monitoring et Logs

### Logs de l'Application

```bash
# Logs en temps réel
docker logs -f app-gestion

# Logs avec Docker Compose
docker-compose logs -f app
```

### Health Check

L'application expose un endpoint de santé :

- **URL** : `http://localhost:3000/`
- **Méthode** : GET
- **Réponse** : 200 OK si l'application fonctionne

## 🛠️ Dépannage

### Problèmes Courants

1. **Port déjà utilisé**

   ```bash
   # Vérifier les processus utilisant le port 3000
   lsof -i :3000

   # Utiliser un autre port
   docker run -p 3001:3000 ...
   ```

2. **Variables d'environnement manquantes**

   ```bash
   # Vérifier les variables dans le conteneur
   docker exec app-gestion env | grep SUPABASE
   ```

3. **Problèmes de build**
   ```bash
   # Build local pour débugger
   docker build -t app-gestion-local .
   ```

### Commandes Utiles

```bash
# État des conteneurs
docker ps

# Inspection d'un conteneur
docker inspect app-gestion

# Exécution de commandes dans le conteneur
docker exec -it app-gestion sh

# Nettoyage des images inutilisées
docker image prune -f
```

## 🔄 Mise à Jour

### Automatique (CI/CD)

Les mises à jour sont automatiques à chaque push sur la branche `main`.

### Manuel

```bash
# Pull de la nouvelle image
docker pull ghcr.io/jeobran69367/app_gestion:latest

# Redémarrage avec la nouvelle image
docker-compose down
docker-compose up -d
```

## 📚 Ressources

- [Documentation Docker](https://docs.docker.com/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Nuxt.js Deployment](https://nuxt.com/docs/getting-started/deployment)
- [Supabase Documentation](https://supabase.com/docs)

---

**Note** : Assurez-vous que tous les secrets et variables d'environnement sont correctement configurés avant le déploiement en production.
