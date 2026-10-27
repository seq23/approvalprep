#!/usr/bin/env node
// validate:publication-freeze - the new-page freeze is a config flag the cycle reads.
// (Behaviour - frozen holds unmeasured pages, a measured query releases exactly its
// page - is exercised against the real generator in validate:content-release.)
// Hard-fails when:
//   1. data/cadence/policy.json new_page_publication is missing or malformed;
//   2. scripts/content/generate-candidate.mjs no longer calls freezeDecision();
//   3. freezeDecision() itself lets an unmeasured query through while frozen, holds a
//      measured one, or holds anything when unfrozen (direct unit proof);
//   4. history: a release on or after frozen_at published a page whose query was not
//      a measured target in data/search_intelligence/target_query_set.json;
//   5. scheduled-content-release.yml has no schedule: the flag would then govern a
//      cycle that never runs, and a measured page would never publish by itself.
import fs from "node:fs";
import { loadFreeze, measuredTargets, freezeDecision, RELEASE_RULES, norm, containsQuery } from "../lib/publication_freeze.mjs";

const errors = [];
const fail = (m) => errors.push(m);
const freeze = loadFreeze();
if (!freeze || typeof freeze !== "object") fail("data/cadence/policy.json has no new_page_publication block");
else {
  if (typeof freeze.frozen !== "boolean") fail("new_page_publication.frozen must be true or false");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(freeze.frozen_at || ""))) fail("new_page_publication.frozen_at must be YYYY-MM-DD");
  if (!RELEASE_RULES.has(freeze.release_rule)) fail(`new_page_publication.release_rule must be one of ${[...RELEASE_RULES].join(", ")}`);
}
const gen = fs.readFileSync("scripts/content/generate-candidate.mjs", "utf8");
if (!/freezeDecision\(candidate, freeze, targets\)/.test(gen) || !/if \(!decision\.allowed\)/.test(gen)) fail("generate-candidate.mjs no longer gates candidates through freezeDecision()");

const t = new Map([["measured question", { source: "gsc_search_analytics", measurement: { value: 3 } }]]);
const on = { frozen: true, frozen_at: "2026-10-09", release_rule: "measured_target_only" };
if (freezeDecision({ title: "Unmeasured question?" }, on, t).allowed) fail("freezeDecision allowed an unmeasured query while frozen");
if (!freezeDecision({ title: "Measured question?" }, on, t).allowed) fail("freezeDecision held a measured query while frozen");
if (!freezeDecision({ title: "Unmeasured question?" }, { ...on, frozen: false }, t).allowed) fail("freezeDecision held a page while unfrozen");
if (!freezeDecision({ title: "What should I know about a measured question?", measuredQuery: { query: "measured question" } }, on, t).allowed) fail("freezeDecision held a medium page built around a measured query");
if (freezeDecision({ title: "What should I know about something else?", measuredQuery: { query: "measured question" } }, on, t).allowed) fail("freezeDecision allowed a page whose title does not contain its declared measured query");
if (freezeDecision({ title: "What should I know about unmeasured question?", measuredQuery: { query: "unmeasured question" } }, on, t).allowed) fail("freezeDecision allowed a declared query that is not measured");

const targets = measuredTargets();
const answers = JSON.parse(fs.readFileSync("data/content/generated_answers.json", "utf8")).answers || [];
const byId = new Map(answers.map((a) => [a.id, a]));
const releases = JSON.parse(fs.readFileSync("data/release/release_ledger.json", "utf8")).releases || [];
let checked = 0;
for (const r of releases) {
  if (!freeze?.frozen || !(r.date >= freeze.frozen_at)) continue;
  for (const id of r.publishedIds || []) {
    checked += 1;
    const a = byId.get(id);
    const declared = a?.measuredQuery?.query;
    const measuredKey = declared && containsQuery(a.title, declared) ? norm(declared) : norm(a?.title);
    if (!a || !targets.has(measuredKey)) fail(`release ${r.id} published "${a?.title || id}" on or after frozen_at ${freeze.frozen_at} without a measured target`);
  }
}
const wf = fs.readFileSync(".github/workflows/scheduled-content-release.yml", "utf8");
if (!/^\s+schedule:\s*\n\s+- cron:/m.test(wf)) fail("scheduled-content-release.yml has no schedule: the freeze flag governs a cycle that never runs");

if (errors.length) { console.error(`[publication-freeze] FAIL\n- ${errors.join("\n- ")}`); process.exit(1); }
console.log(`[publication-freeze] OK frozen=${freeze.frozen} since=${freeze.frozen_at} rule=${freeze.release_rule} measuredTargets=${targets.size} postFreezePublicationsChecked=${checked}`);
