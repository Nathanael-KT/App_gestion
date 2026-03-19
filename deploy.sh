#!/bin/bash

# =============================================================================
# Script de déploiement manuel pour Vercel
# =============================================================================

set -e

echo "🚀 Déploiement de l'App Gestion vers Vercel"
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

# Vérifier les variables Vercel nécessaires pour un mode non interactif
if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ VERCEL_TOKEN n'est pas définie"
    echo "   Créez un token sur https://vercel.com/account/tokens"
    exit 1
fi

if [ -z "$VERCEL_ORG_ID" ]; then
    echo "❌ VERCEL_ORG_ID n'est pas définie"
    exit 1
fi

if [ -z "$VERCEL_PROJECT_ID" ]; then
    echo "❌ VERCEL_PROJECT_ID n'est pas définie"
    exit 1
fi

echo "✅ Variables Vercel vérifiées"

echo "📦 Installation des dépendances..."
pnpm install --frozen-lockfile

# Synchroniser la configuration du projet Vercel
echo "🔗 Synchronisation du projet Vercel..."
pnpm dlx vercel@latest pull --yes --environment=production --token="$VERCEL_TOKEN"

# Build local Vercel pour éviter les surprises en production
echo "🔨 Build Vercel..."
pnpm dlx vercel@latest build --prod --token="$VERCEL_TOKEN"

# Déploiement vers Vercel
echo "🌐 Déploiement vers Vercel..."
pnpm dlx vercel@latest deploy --prebuilt --prod --token="$VERCEL_TOKEN"

echo "✅ Déploiement terminé avec succès!"
echo "🌟 Votre application est disponible sur : $NUXT_PUBLIC_SITE_URL"

# Instructions post-déploiement
echo ""
echo "📋 Vérifications post-déploiement :"
echo "1. Vérifiez que l'application fonctionne sur $NUXT_PUBLIC_SITE_URL"
echo "2. Testez la connexion avec Supabase"
echo "3. Vérifiez les logs dans le dashboard Vercel"
echo "4. Testez les fonctionnalités critiques (auth, CRUD, etc.)"
