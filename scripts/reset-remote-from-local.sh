#!/usr/bin/env bash
set -euo pipefail

# Resets remote PUBLIC schema.
# Modes:
# - SYNC_MODE=local-db (default): backup remote + restore from local DB dump.
# - SYNC_MODE=migrations: backup remote + rebuild remote from repo migrations.
# WARNING: destructive operation on remote public schema.

REMOTE_DB_URL="${REMOTE_DB_URL:-${SUPABASE_DB_URL:-}}"
LOCAL_DB_URL="${LOCAL_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
SYNC_MODE="${SYNC_MODE:-migrations}"
APPLY_SEED="${APPLY_SEED:-true}"

if [ -z "${REMOTE_DB_URL}" ]; then
  echo "REMOTE_DB_URL (or SUPABASE_DB_URL) is required."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required."
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required."
  exit 1
fi

if [ "$SYNC_MODE" = "local-db" ]; then
  echo "This will DESTROY remote schema 'public' and replace it with LOCAL DB data."
elif [ "$SYNC_MODE" = "migrations" ]; then
  echo "This will DESTROY remote schema 'public' and rebuild it from MIGRATIONS + optional seed."
else
  echo "SYNC_MODE must be one of: local-db, migrations"
  exit 1
fi

echo "Remote URL host: $(echo "$REMOTE_DB_URL" | sed -E 's#(postgres(ql)?://)([^@]+@)?([^/:]+).*#\4#')"
read -r -p "Type RESET_REMOTE_PUBLIC to continue: " confirm
if [ "$confirm" != "RESET_REMOTE_PUBLIC" ]; then
  echo "Aborted."
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d_%H%M%S)"
REMOTE_BACKUP="$BACKUP_DIR/remote_before_reset_${TS}.sql"
LOCAL_DUMP="$BACKUP_DIR/local_public_${TS}.sql"

if [ "$SYNC_MODE" = "local-db" ]; then
  echo "[1/5] Testing local database connection..."
  psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -c "select 1;" >/dev/null
else
  echo "[1/5] Using migrations mode (no local DB required)..."
fi

echo "[2/5] Backing up remote database (public schema)..."
pg_dump "$REMOTE_DB_URL" --schema=public --no-owner --no-privileges > "$REMOTE_BACKUP"

if [ "$SYNC_MODE" = "local-db" ]; then
  echo "[3/5] Dumping local database (public schema)..."
  pg_dump "$LOCAL_DB_URL" --schema=public --no-owner --no-privileges > "$LOCAL_DUMP"
else
  echo "[3/5] Skipping local dump (migrations mode)..."
fi

echo "[4/5] Resetting remote public schema..."
psql "$REMOTE_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;
SQL

if [ "$SYNC_MODE" = "local-db" ]; then
  echo "[5/5] Restoring local public schema into remote..."
  psql "$REMOTE_DB_URL" -v ON_ERROR_STOP=1 -f "$LOCAL_DUMP"
else
  if ! command -v supabase >/dev/null 2>&1; then
    echo "supabase CLI is required in migrations mode."
    exit 1
  fi

  echo "[5/5] Applying schema migrations to remote..."
  supabase db push --db-url "$REMOTE_DB_URL"

  if [ "$APPLY_SEED" = "true" ] && [ -f "supabase/seed.sql" ]; then
    echo "Applying seed file supabase/seed.sql..."
    psql "$REMOTE_DB_URL" -v ON_ERROR_STOP=1 -f "supabase/seed.sql"
  else
    echo "Seed skipped (APPLY_SEED=$APPLY_SEED or supabase/seed.sql missing)."
  fi
fi

echo "Done."
echo "Remote backup: $REMOTE_BACKUP"
if [ "$SYNC_MODE" = "local-db" ]; then
  echo "Local dump used: $LOCAL_DUMP"
else
  echo "Mode used: migrations"
fi
