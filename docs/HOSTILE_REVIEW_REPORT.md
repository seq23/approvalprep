# Hostile Review Report

Date: 2026-07-07

Scope: ApprovalPrep v4 baseline after initial structural packaging.

## Findings Fixed

### 1. Static Astro POST API handlers

Severity: HARD_FAIL

The first v4 artifact placed Stripe and Resend POST handlers under `src/pages/api` while `astro.config.mjs` uses `output: "static"`. That is not the right static-first Cloudflare Pages boundary.

Fix:

- Removed `src/pages/api/create-checkout-session.ts`.
- Removed `src/pages/api/verify-download.ts`.
- Removed `src/pages/api/resend-download-email.ts`.
- Added Cloudflare Pages Functions under `functions/api/`.
- Strengthened `scripts/validate/payment-download.mjs` so static Astro POST API handlers hard-fail.

### 2. GitHub workflows used `npm ci` without a lockfile

Severity: HARD_FAIL

The first v4 artifact had no `package-lock.json`, but workflows called `npm ci`. That would fail CI before validation.

Fix:

- Changed workflows to `npm install`.
- Strengthened `scripts/validate/repo-structure.mjs` to hard-fail if a workflow uses `npm ci` without a lockfile.

### 3. Validator path bug after strengthening

Severity: HARD_FAIL

The strengthened workflow validator initially double-joined absolute paths.

Fix:

- Corrected the validator to read absolute paths from the shared walker.

## Repeat Checks

Passed:

- `npm run validate:all`
- JSON parse check for all `.json` files
- `node --check` for all JS/MJS files under `scripts/` and `functions/`
- Stale reference scan for removed `src/pages/api` files

Still not proven:

- Astro production build, because npm registry access was blocked in this workspace.
- Real Stripe checkout.
- Real Resend email delivery.
- Real IndexNow/Bing/GSC submission.
- Real ranking, indexing, or AI citation visibility.
