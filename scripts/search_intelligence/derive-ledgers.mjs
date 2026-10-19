#!/usr/bin/env node
// search-intelligence:derive - rebuild every ledger validate:all compares against
// its inputs, in the order those inputs require.
//
// target_query_set.json and consolidation_candidates.json are derived from the
// 28-day Search Console rows (data/intelligence/gsc_search_analytics.json), the
// route manifest, generated answers and the built site. Their validators rebuild
// and hard-fail on any difference, so a lane that writes one of those inputs and
// then runs validate:all without re-deriving is red by construction. 19 Oct 2026:
// Citation OS Weekly's intelligence:gsc collected a 9th query row and the lane
// failed "target_query_set.json is stale against its inputs" - the free-sources
// lane re-derived after ingest, the weekly and daily sequences never did.
// validate:derived-ledger-lanes keeps every such lane calling this script.
import { spawnSync } from "node:child_process";

export const DERIVE_STEPS = ["search-intelligence:targets", "build", "search-intelligence:consolidation"];

if (import.meta.url === `file://${process.argv[1]}`) {
for (const step of DERIVE_STEPS) {
  const r = spawnSync("npm", ["run", step], { stdio: "inherit", shell: false });
  if (r.status !== 0) { console.error(`[search-intelligence:derive] FAIL ${step} exited ${r.status}`); process.exit(r.status || 1); }
}
console.log(`[search-intelligence:derive] OK steps=${DERIVE_STEPS.join(",")}`);
}
