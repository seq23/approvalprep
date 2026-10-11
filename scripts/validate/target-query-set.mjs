#!/usr/bin/env node
// validate:target-query-set - every target is measured, and the file is current.
// Hard-fails when: the file is missing or holds 0 targets; a target lacks a known
// source or a positive measured number; a dropped entry lacks a reason or is also
// a target; or the file differs from a rebuild from its inputs (stale).
import fs from "node:fs";
import { build, OUT, HISTORY, norm } from "../search_intelligence/build-target-query-set.mjs";

const SOURCES = new Set(["gsc_search_analytics", "gsc_search_analytics_history", "measured_demand", "evidence_queries"]);
const errors = [];
const fail = (m) => errors.push(m);
if (!fs.existsSync(OUT)) { console.error(`[target-query-set] FAIL ${OUT} is missing`); process.exit(1); }
const doc = JSON.parse(fs.readFileSync(OUT, "utf8"));
const targets = doc.targets || [];
if (!targets.length) fail("0 targets: a target set that measures nothing steers nothing");
for (const t of targets) {
  if (!SOURCES.has(t.source)) fail(`target "${t.query}" has source ${t.source}`);
  if (!(Number(t.measurement?.value) > 0)) fail(`target "${t.query}" has no positive measured number`);
  if (!t.measurement?.metric) fail(`target "${t.query}" names no metric`);
}
const targetKeys = new Set(targets.map((t) => norm(t.query)));
for (const d of doc.dropped || []) {
  if (!d.reason) fail(`dropped "${d.query}" has no reason`);
  if (targetKeys.has(norm(d.query)) && d.source !== "gsc_search_analytics") fail(`"${d.query}" is both a target and dropped`);
}
if (doc.target_count !== targets.length) fail(`target_count ${doc.target_count} != ${targets.length}`);
// Every query in the Search Console history must be a target: a measurement never expires.
const history = fs.existsSync(HISTORY) ? JSON.parse(fs.readFileSync(HISTORY, "utf8")) : null;
if (!history || !Object.keys(history.queries || {}).length) fail(`${HISTORY} is missing or empty: Search Console has measured queries for this site`);
for (const h of Object.values(history?.queries || {})) if (!targetKeys.has(norm(h.query))) fail(`history query "${h.query}" is not a target`);
const fresh = build();
if (JSON.stringify(fresh) !== JSON.stringify(doc)) fail("target_query_set.json is stale against its inputs: run npm run search-intelligence:targets");
if (errors.length) { console.error(`[target-query-set] FAIL\n- ${errors.join("\n- ")}`); process.exit(1); }
console.log(`[target-query-set] OK targets=${targets.length} ${JSON.stringify(doc.targets_by_source)} dropped=${doc.dropped_count}`);
