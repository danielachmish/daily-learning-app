# Daily Learning App V1

A production-ready V1 daily learning mobile app (Android + iPhone) with a companion admin panel, subscriptions, and dedications. See `docs/` for the full specification.

> **Note:** this project was moved from a folder path containing Hebrew characters to `C:\Projects\daily-learning-app` because npm/Node silently failed to fully install `node_modules` for the React Native/Next.js dependency trees at the original location. The real cause was Windows long paths being disabled (`LongPathsEnabled=0`), not the non-ASCII path itself — deeply nested `node_modules` paths exceeded 260 characters. Enabling long paths (`HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled=1`) plus a reboot fixed it. Keep working from this location going forward.

## Project structure

```txt
apps/
  mobile/   React Native + Expo + Expo Router (TypeScript)
  admin/    Next.js admin panel (TypeScript)
packages/
  shared/   Shared types, constants, and validation used by both apps
supabase/
  migrations/   Database migrations (empty — Phase 1)
  functions/    Edge Functions: payment-webhook, create-checkout-session, admin-actions (placeholders)
docs/
  00_Product_Spec.md
  01_Architecture.md
  02_Database.md
  03_BuildPlan.md
  04_ClaudeRules.md
  05_Prompts.md
```

## Getting started

```bash
npm install
```

This installs dependencies for all workspaces (`apps/mobile`, `apps/admin`, `packages/shared`) from the repo root.

### Run mobile

```bash
cd apps/mobile
npm run start
```

Opens Expo Dev Tools; scan the QR code with Expo Go, or press `a` / `i` for an emulator.

### Run admin

```bash
cd apps/admin
npm run dev
```

Admin panel runs at http://localhost:3000.

## Recommended workflow

1. Read the docs in `docs/` (start with Prompt 0 in `docs/05_Prompts.md`).
2. Work one build phase at a time — do not ask Claude Code to build the whole app in one prompt.
3. Each phase should compile, typecheck, and be manually testable before moving on.
