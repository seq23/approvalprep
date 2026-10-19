#!/usr/bin/env node
// validate:derived-ledger-lanes - every lane that rewrites an input of a derived
// search-intelligence ledger re-derives it before validating, and commits it.
//
// target_query_set.json and consolidation_candidates.json are rebuilt from their
// inputs by validate:target-query-set / validate:consolidation-candidates and
// fail on any difference. 19 Oct 2026, Citation OS Weekly: intelligence:gsc
// collected a 9th Search Console row, the weekly sequence never re-derived, and
// validate:all went red with "target_query_set.json is stale against its inputs".
// Hard-fails when:
//   - a run-package-sequence sequence ending in validate:all does not run
//     search-intelligence:derive immediately before it;
//   - a workflow that runs a Search Console ingest (intelligence:gsc, directly or
//     through any npm composite or sequence) runs no re-derive after it;
//   - such a workflow commits to main with a `git add` that leaves out a derived
//     ledger (so main would hold new inputs beside an old ledger);
//   - zero sequences or zero ingesting workflows are found (the guard sees nothing).
import fs from "node:fs";
import path from "node:path";
import { OUT as TARGETS, HISTORY } from "../search_intelligence/build-target-query-set.mjs";
import { OUT as CONSOLIDATION } from "../search_intelligence/build-consolidation-candidates.mjs";

const DERIVED = [TARGETS, HISTORY, CONSOLIDATION];
const WRITER = "intelligence:gsc";
const DERIVE = "search-intelligence:derive";
const errors = [];
const fail = (m) => errors.push(m);

const scripts = JSON.parse(fs.readFileSync("package.json", "utf8")).scripts || {};
if (scripts[DERIVE] !== "node scripts/search_intelligence/derive-ledgers.mjs") fail(`package.json ${DERIVE} does not run scripts/search_intelligence/derive-ledgers.mjs`);

// Sequences: parse the literal arrays out of the runner (importing it would run it).
const runnerSrc = fs.readFileSync("scripts/workflows/run-package-sequence.mjs", "utf8");
const sequences = {};
for (const m of runnerSrc.matchAll(/^\s*(\w+):\s*\[([^\]]*)\]/gm)) sequences[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
const validating = Object.entries(sequences).filter(([, steps]) => steps.includes("validate:all"));
if (!validating.length) fail("no run-package-sequence sequence ends in validate:all: the guard sees no lane");
for (const [name, steps] of validating) {
  const v = steps.indexOf("validate:all");
  if (steps[v - 1] !== DERIVE) fail(`sequence ${name} runs validate:all without ${DERIVE} immediately before it`);
}

// Ordered leaf expansion of an npm script, through `npm run X` and sequences.
function expand(name, seen = []) {
  if (seen.includes(name)) return [];
  const cmd = scripts[name];
  if (!cmd) return [name];
  const out = [name];
  for (const part of cmd.split("&&").map((s) => s.trim())) {
    const npm = part.match(/^npm\s+run\s+(\S+)/);
    if (npm) { out.push(...expand(npm[1], [...seen, name])); continue; }
    const seq = part.match(/run-package-sequence\.mjs\s+(\w+)/);
    if (seq) for (const s of sequences[seq[1]] || []) out.push(...expand(s, [...seen, name]));
  }
  return out;
}
const isDerive = (n) => n === DERIVE || n === "search-intelligence:targets";

let ingestingLanes = 0;
const wfDir = ".github/workflows";
for (const file of fs.readdirSync(wfDir).filter((f) => /\.ya?ml$/.test(f)).sort()) {
  const text = fs.readFileSync(path.join(wfDir, file), "utf8");
  // Flatten every `npm run X` the workflow types, in file order, into leaf steps.
  const flat = [];
  for (const line of text.split("\n")) {
    if (/^\s*#/.test(line)) continue;
    for (const m of line.matchAll(/npm\s+run\s+([\w:.-]+)/g)) flat.push(...expand(m[1]));
  }
  const lastWriter = flat.lastIndexOf(WRITER);
  if (lastWriter < 0) continue;
  ingestingLanes += 1;
  if (!flat.slice(lastWriter + 1).some(isDerive)) fail(`${file} runs ${WRITER} and never re-derives after it: run npm run ${DERIVE}`);
  for (const line of text.split("\n")) {
    if (!/^\s*git add\s/.test(line)) continue;
    for (const d of DERIVED) {
      const covered = line.split(/\s+/).some((p) => p === d || p === path.dirname(d) || p === `${path.dirname(d)}/` || p === `${path.dirname(d)}/*.json`);
      if (!covered) fail(`${file} commits Search Console inputs but its git add leaves out ${d}`);
    }
  }
}
if (!ingestingLanes) fail(`no workflow runs ${WRITER}: the guard sees no ingesting lane`);

if (errors.length) { console.error(`[derived-ledger-lanes] FAIL\n- ${errors.join("\n- ")}`); process.exit(1); }
console.log(`[derived-ledger-lanes] OK sequences=${validating.length} ingestingLanes=${ingestingLanes} derived=${DERIVED.length}`);
