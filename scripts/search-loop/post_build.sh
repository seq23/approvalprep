#!/usr/bin/env bash
# Search loop post-build (runs only when the engine published pages): fold the new
# /questions/ pages into the sitemap and the built site, measure them with the
# cadence gate, then record them as the accepted baseline. The engine paces itself
# (10/day, +5/week while most are indexed, cap 30, halves when indexing falls -
# owner ruling 1 Nov 2026); data/cadence/policy.json new_pages_per_week is set to
# that cap times seven, so the gate is the backstop above the engine, not a second
# throttle. Check first, accept second: an over-cap day stops here and never commits.
set -Eeuo pipefail
npm run seo:sitemap
npm run routes:redirects
npm run build
npm run cadence:gate
npm run cadence:gate -- --accept --reason "search-loop run ${GITHUB_RUN_ID:-local} on $(date -u +%F): engine pages under /questions/ passed the engine gate and the cadence gate; recording the published URL set as the baseline."
