# Dockerfile pour l'application Nuxt.js
FROM node:20-alpine AS base

# Installation des dépendances système
RUN apk add --no-cache libc6-compat

# Configuration de pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Étape de construction des dépendances
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Étape de construction de l'application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables d'environnement pour la construction
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY
ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
ENV NUXT_SUPABASE_URL=$SUPABASE_URL
ENV NUXT_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Construction de l'application
RUN pnpm build

# Étape de production
FROM base AS runner
WORKDIR /app

# Création d'un utilisateur non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nuxt

# Copie des fichiers de production
COPY --from=builder --chown=nuxt:nodejs /app/.output ./.output
COPY --from=builder --chown=nuxt:nodejs /app/package.json ./package.json

USER nuxt

# Exposition du port
EXPOSE 3000

# Variables d'environnement
ENV NODE_ENV=production
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0

# Commande de démarrage
CMD ["node", ".output/server/index.mjs"]
