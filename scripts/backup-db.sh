#!/usr/bin/env bash
# Manual backup of the linked Supabase Cloud project.
# Needed because the Free plan has zero automatic backup retention —
# see https://supabase.com/docs/guides/platform/backups.
#
# Usage: run from the repo root: ./scripts/backup-db.sh
# Produces two timestamped files in backups/ (gitignored — copy them
# somewhere off this machine regularly, e.g. an external drive or cloud
# storage, since a local-only backup doesn't protect against this
# computer failing).

set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p backups
STAMP=$(date +%Y%m%d-%H%M%S)

echo "Dumping schema..."
npx supabase db dump --linked -f "backups/schema-$STAMP.sql"

echo "Dumping data..."
npx supabase db dump --linked --data-only -f "backups/data-$STAMP.sql"

echo "Done: backups/schema-$STAMP.sql and backups/data-$STAMP.sql"
