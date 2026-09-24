#!/usr/bin/env bash
# Deploys the admin panel to Vercel (project "daily-learning-admin").
#
# Run from the repo root, using the .vercel/project.json link that lives
# there — Vercel needs the actual repo-root context to resolve this
# monorepo's npm workspaces correctly (the project's rootDirectory is
# configured server-side as "apps/admin", and sourceFilesOutsideRootDirectory
# is enabled so it can still see the root package.json / package-lock.json
# and the linked @daily-learning/shared package).
#
# Deliberately uses Vercel's own REMOTE/cloud build — NOT `vercel build`
# run locally first. A local build on Windows fails with:
#   EPERM: operation not permitted, symlink '..\X.func' -> '...\Y.func'
# because Vercel dedupes identical serverless function bundles with
# symlinks, and Windows blocks creating those without Developer Mode or
# admin rights. A plain `vercel deploy` (no prior local build) just
# uploads the source and lets Vercel's own Linux build servers handle it
# — sidesteps the Windows-only problem entirely, and is the standard way
# to deploy a real Next.js app like this one (unlike the mobile app,
# which needs a special local Expo export step — see deploy-web.sh).
#
# ⚠️ This project must NEVER have Vercel's GitHub git integration
# connected (Project Settings → Git). See apps/mobile/scripts/deploy-web.sh
# for exactly why — that exact failure mode broke the mobile app's
# production site on 2026-09-23. This script must stay the only thing
# that deploys daily-learning-admin.
set -euo pipefail
cd "$(dirname "$0")/../../.."   # repo root, where .vercel/project.json links to this project

echo "Deploying admin panel to Vercel..."
npx vercel deploy --prod
