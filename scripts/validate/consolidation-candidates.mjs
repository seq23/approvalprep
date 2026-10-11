#!/usr/bin/env node
// validate:consolidation-candidates - the ledger is current and ships no redirect.
// Hard-fails when: the file is missing or differs from a rebuild against the
// built site, the sitemap, the 28-day GSC rows and index coverage; a candidate
// has impressions, is not thin, names no hub, or names a hub that is itself a
// candidate or not in the sitemap; the status is not LEDGER_ONLY_NO_REDIRECTS;
// or any candidate path is redirected in public/_redirects.
import fs from "node:fs";
import { build, OUT, THIN_WORDS } from "../search_intelligence/build-consolidation-candidates.mjs";
import { requireBuildOutput } from "./_common.mjs";

const errors = [];
const fail = (m) => errors.push(m);
requireBuildOutput("consolidation-candidates");
if (!fs.existsSync(OUT)) { console.error(`[consolidation-candidates] FAIL ${OUT} is missing`); process.exit(1); }
const doc = JSON.parse(fs.readFileSync(OUT, "utf8"));
if (doc.status !== "LEDGER_ONLY_NO_REDIRECTS") fail(`status ${doc.status}`);
const cands = doc.candidates || [];
const candPaths = new Set(cands.map((c) => c.path));
for (const c of cands) {
  if (c.impressions_28d !== 0) fail(`${c.path} has ${c.impressions_28d} impressions`);
  if (!(c.words < THIN_WORDS)) fail(`${c.path} has ${c.words} words, not thin`);
  if (!c.fold_into_hub || candPaths.has(c.fold_into_hub)) fail(`${c.path} folds into ${c.fold_into_hub}, which is missing or itself a candidate`);
}
const redirects = fs.existsSync("public/_redirects") ? fs.readFileSync("public/_redirects", "utf8").split("\n").map((l) => l.trim().split(/\s+/)[0].replace(/\/+$/, "")) : [];
for (const r of redirects) if (candPaths.has(r)) fail(`${r} is a consolidation candidate and already redirected: this ledger ships no redirects`);
let fresh;
try { fresh = build(); } catch (e) { fail(e.message); }
if (fresh && JSON.stringify(fresh) !== JSON.stringify(doc)) fail("consolidation_candidates.json is stale against the built site and its inputs: run npm run search-intelligence:consolidation after npm run build");
if (errors.length) { console.error(`[consolidation-candidates] FAIL\n- ${errors.join("\n- ")}`); process.exit(1); }
console.log(`[consolidation-candidates] OK candidates=${cands.length} hubs=${Object.keys(doc.candidates_by_hub).length} thin_without_hub=${doc.thin_without_hub.length} urls=${doc.url_count}`);
