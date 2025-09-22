#!/bin/bash

# =============================================================================
# Script de déploiement manuel pour Deno Deploy
# =============================================================================

set -e

echo "🚀 Déploiement de l'App Gestion vers Deno Deploy"
echo "================================================="

# Vérifier que les variables d'environnement sont définies
if [ -z "$NUXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ NUXT_PUBLIC_SUPABASE_URL n'est pas définie"
    exit 1
fi

if [ -z "$NUXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ NUXT_PUBLIC_SUPABASE_ANON_KEY n'est pas définie"
    exit 1
fi

if [ -z "$NUXT_PUBLIC_SITE_URL" ]; then
    echo "❌ NUXT_PUBLIC_SITE_URL n'est pas définie"
    exit 1
fi

echo "✅ Variables d'environnement vérifiées"

# Installer les dépendances
echo "📦 Installation des dépendances..."
pnpm install --frozen-lockfile

# Build de l'application
echo "🔨 Build de l'application..."
pnpm build

# Vérifier que le build a réussi
if [ ! -f ".output/server/index.mjs" ]; then
    echo "❌ Le build a échoué - fichier index.mjs non trouvé"
    exit 1
fi

echo "✅ Build réussi"

# Déploiement vers Deno Deploy
echo "🌐 Déploiement vers Deno Deploy..."

# Installer deployctl si pas déjà installé
if ! command -v deployctl &> /dev/null; then
    echo "📥 Installation de deployctl..."
    deno install --allow-read --allow-write --allow-env --allow-net --allow-run --no-check -r -f https://deno.land/x/deploy/deployctl.ts
fi

# Déployer (remplacer 'app-gestion' par le nom de votre projet)
deployctl deploy --project=app-gestion .output/server/index.mjs

echo "✅ Déploiement terminé avec succès!"
echo "🌟 Votre application est disponible sur : $NUXT_PUBLIC_SITE_URL"

# Instructions post-déploiement
echo ""
echo "📋 Vérifications post-déploiement :"
echo "1. Vérifiez que l'application fonctionne sur $NUXT_PUBLIC_SITE_URL"
echo "2. Testez la connexion avec Supabase"
echo "3. Vérifiez les logs dans le dashboard Deno Deploy"
echo "4. Testez les fonctionnalités critiques (auth, CRUD, etc.)"
