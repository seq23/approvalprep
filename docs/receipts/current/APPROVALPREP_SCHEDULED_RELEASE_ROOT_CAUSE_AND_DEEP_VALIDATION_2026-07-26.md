# ApprovalPrep Scheduled Release Root Cause and Deep Validation — 2026-07-26

## Scope

This receipt covers the scheduled-content push failure, the cross-workflow writer repair, cumulative low-risk content release, faux workflow tracing, and isolated local validation for `approvalprep`.

## Root Cause

The content job completed its local generation and created commit `808a26f`, but another process advanced `origin/main` after checkout. The workflow then used a plain `git push`, so GitHub correctly rejected the stale non-fast-forward update. The runner was ephemeral, which meant the unpublished local commit disappeared when the job ended.

The repository had ten workflows capable of writing to `main`. Workflow-specific concurrency groups did not serialize those writers against one another, and two daily workflows were scheduled at the same minute.

## Repair

- All ten `main` writers now use shared concurrency group `approvalprep-main-writer` with `cancel-in-progress: false`.
- Every writer checks out `main` with full history and synchronizes to the latest remote state before generation.
- Every writer uses `scripts/workflows/safe-push-main.sh`.
- Safe push fetches, rebases, retries within a bounded loop, and never force-pushes.
- A real rebase conflict exits safely without overwriting remote history.
- Scheduled Content Release moved to `07:10 UTC`; Citation OS Daily moved to `10:37 UTC`.

## Actual Content Release

The previous generator replaced the answer library with the same first routes. The corrected generator is cumulative, low-risk only, duplicate-resistant, and capped at three new pages per day.

Release `content-release-2026-07-26` added:

1. `/blog/what-should-i-know-about-apartment-application-readiness-checklist`
2. `/blog/what-should-i-know-about-proof-of-income-packet-checklist`
3. `/blog/what-should-i-know-about-business-funding-document-checklist`

The cumulative answer library contains 33 records. A same-day rerun returns `NOOP_ALREADY_RELEASED`; it does not create duplicate pages or duplicate ledger entries.

## Workflow Transaction

The scheduled workflow now performs:

`sync latest main -> install -> governance/self-heal -> content release -> production build -> validate:all -> safe automation validation -> commit -> safe rebase/push`

The content-release transaction performs:

`yield evaluation -> fanout -> freeze restore -> cumulative generation -> self-heal -> sitemap -> freeze -> clear scope -> authority validation -> KPI truth validation`

## Validation Results

- `validate:all`: PASS
- 97 individual `validate:*` commands, excluding the aggregate command: 97 PASS / 0 FAIL
- Workflow YAML parsing: 16 PASS
- Workflow trace: 16 workflows, 10 serialized writers, 110 faux scenarios, PASS
- Main-writer isolated Git simulations: 5 PASS
- Browserless accessibility: PASS
- Browserless product-flow E2E: PASS
- Content release: PASS, cumulative=33, fixtureAdded=3, idempotent=true
- Authority scale: 100,000 fanout records, 8 frozen outputs, zero drift, PASS
- Sitemap: 103 URLs

## Local Environment Blocker

The repository lockfile was restored byte-for-byte and was not changed for delivery. The container package gateway repeatedly returned HTTP 503 for locked npm tarballs, including `zod@3.25.76`, `youch-core@0.3.3`, and `yocto-queue@1.2.2`. Because `npm ci` could not complete, a real Astro production build could not be executed in this container.

No dependency substitution was committed. Browserless, route, content, schema, product-flow, authority, workflow, and all registered validators passed. The local updater/GitHub runner must execute the locked dependency install and Astro build using the normal npm registry path.

## Truthful Status

**Deep isolated validation passed for every executable repository validator and workflow simulation. Locked dependency installation and the real Astro build remain unproven in this container because of the external package-gateway outage.**
