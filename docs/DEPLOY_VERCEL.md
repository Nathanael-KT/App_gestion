# Deploy on Vercel

Ce guide remplace le workflow Deno Deploy.

## 1) Preconditions

- Vercel project created and linked to this repository
- Supabase production project ready
- Node 20+ and pnpm available in CI

## 2) Environment Variables in Vercel

Configure these variables in Vercel Project Settings -> Environment Variables:

- NUXT_PUBLIC_SUPABASE_URL
- NUXT_PUBLIC_SUPABASE_ANON_KEY
- NUXT_PUBLIC_SITE_URL
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_KEY

Notes:
- `NUXT_PUBLIC_*` variables are exposed client-side.
- Keep service role keys out of public runtime variables.

## 3) GitHub Secrets for CI Deploy

Add these secrets in GitHub Actions:

- VERCEL_TOKEN
- VERCEL_ORG_ID
- VERCEL_PROJECT_ID
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_PROJECT_ID
- SUPABASE_ACCESS_TOKEN

## 4) Local Manual Deploy

Use the script:

```bash
./deploy.sh
```

The script will:

1. Validate required env vars
2. Pull Vercel project configuration
3. Build Vercel artifacts
4. Deploy with prebuilt output

## 5) CI/CD Deploy

Workflow file:

- `.github/workflows/deploy.yml`

Deployment path on `main`:

1. Test and typecheck
2. Optional Supabase migration handling
3. Build and push Docker image (kept as secondary artifact)
4. Pull/build/deploy on Vercel

## 6) Nuxt Runtime

`nuxt.config.ts` no longer forces Deno preset.

- For Vercel CI: `NITRO_PRESET=vercel` is set by `pnpm build:vercel`
- For local dev: standard Nuxt server behavior remains unchanged
