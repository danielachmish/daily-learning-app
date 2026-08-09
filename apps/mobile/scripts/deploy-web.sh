#!/usr/bin/env bash
# Builds the production web export and deploys it to Vercel.
#
# Exports to a fresh directory OUTSIDE the git repo every run — for two
# independent reasons:
#   1. On Windows, "dist" can end up with a lingering file handle
#      (antivirus, an editor, a leftover process) that makes deleting it
#      fail with EBUSY. A fresh directory name sidesteps that.
#   2. When the output dir lives inside the monorepo's git working tree
#      (e.g. apps/mobile/dist-build-*), the Vercel CLI walks up to the
#      parent .git and attaches its HEAD commit's author to the
#      deployment. That author is a GitHub noreply address Vercel can't
#      match to a team member, so it silently blocks the deploy (it sits
#      at status "UNKNOWN"/"Building…" forever and Vercel emails "Failed
#      CLI deployment ... they're not a member of the team"). Building
#      completely outside any git tree means there's no git metadata to
#      attach, so this check never triggers.
# The Vercel project link is kept in .vercel-web-project/ (persisted
# outside any build output) and copied into each fresh export before
# deploying.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="$(mktemp -d -t daily-learning-web-deploy-XXXXXX)"

echo "Building production web export to $OUT..."
# .env.production alone isn't reliably picked up ahead of .env (and Metro's
# cache can silently keep a stale value even when it is) — export the
# production values inline and force a clean cache to be certain the
# right backend ends up in the bundle, not whatever local/LAN URL .env
# points at for day-to-day dev.
set -a
source .env.production
set +a
npx expo export --platform web --clear --output-dir "$OUT"
node scripts/inject-pwa-head.js "$OUT"

echo "Restoring Vercel project link..."
mkdir -p "$OUT/.vercel"
cp .vercel-web-project/project.json "$OUT/.vercel/project.json"

echo "Adding SPA fallback routing (client-side routes 404 on direct load otherwise)..."
cat > "$OUT/vercel.json" << 'EOF'
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
EOF

echo "Deploying to Vercel..."
npx vercel --prod --yes --cwd "$OUT"

echo "Cleaning up temporary build directory..."
rm -rf "$OUT" 2>/dev/null || true
