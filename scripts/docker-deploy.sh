#!/bin/bash

# Script de déploiement Docker local
set -e

echo "🐳 Déploiement Docker - App Gestion"
echo "=================================="

# Couleurs pour l'affichage
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction d'affichage avec couleur
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérification des prérequis
if ! command -v docker &> /dev/null; then
    print_error "Docker n'est pas installé!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose n'est pas installé!"
    exit 1
fi

# Vérification du fichier .env
if [ ! -f ".env" ]; then
    print_warning "Fichier .env non trouvé, création d'un exemple..."
    cat > .env << EOF
# Variables d'environnement pour Docker
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
EOF
    print_warning "Veuillez modifier le fichier .env avec vos vraies variables d'environnement"
    exit 1
fi

print_status "Arrêt des conteneurs existants..."
docker-compose down --remove-orphans

print_status "Construction de l'image Docker..."
docker-compose build --no-cache

print_status "Démarrage des services..."
docker-compose up -d

print_status "Vérification du statut des conteneurs..."
sleep 5
docker-compose ps

print_status "Vérification de la santé de l'application..."
for i in {1..30}; do
    if curl -f http://localhost:3000/ > /dev/null 2>&1; then
        print_status "Application démarrée avec succès!"
        echo "🌐 Application accessible sur: http://localhost:3000"
        break
    else
        echo "Tentative $i/30 - En attente du démarrage..."
        sleep 2
    fi
    
    if [ $i -eq 30 ]; then
        print_error "L'application n'a pas démarré dans les temps"
        echo "Logs de l'application:"
        docker-compose logs app
        exit 1
    fi
done

echo ""
echo "📋 Commandes utiles:"
echo "  docker-compose logs -f app    # Voir les logs en temps réel"
echo "  docker-compose restart app    # Redémarrer l'application"
echo "  docker-compose down           # Arrêter tous les services"
echo "  docker-compose up -d          # Redémarrer tous les services"

print_status "Déploiement terminé avec succès!"
