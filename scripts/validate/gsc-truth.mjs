#!/usr/bin/env node
// The daily Search Console record must exist, be whole, and keep being
// collected daily.
//
// Three things had to be true for this repository to carry measured demand, and
// only the first two were:
//   1. the connector works - fixed when it learned to read the service-account
//      JSON the portfolio actually issues;
//   2. a query that leaves the rolling 28-day window is remembered - the query
//      history does that;
//   3. the collection happens every day. It did not. The connector's weekly
//      ceiling was 3 against a daily schedule, so it ran about three days in
//      seven (8 collections in the 20 days to 25 Oct 2026, one gap of five
//      days) and recorded BUDGET_HELD on the rest, which is not a failure and
//      left every workflow green. Nothing read the gap.
//
// So this asserts all three: the file, its shape, and the ceiling and schedule
// that keep it daily. It does not fail on a stale file - Search Console can
// refuse a credential for a day and that is not this repository's defect - but
// a lane that has been silent for two weeks is no longer a lane, and that does
// fail. The committed record carries collection.status either way.
import fs from "node:fs";
import path from "node:path";
import { readJson, fail } from "./_common.mjs";
import { OUT, SOURCES, STALE_AFTER_DAYS } from "../search_intelligence/build-gsc-truth.mjs";

const NAME = "gsc-truth";
// Long enough that one refused credential or one skipped run is not an alarm;
// short enough that a lane held off by a ceiling cannot sit unnoticed again.
const INERT_AFTER_DAYS = 14;
const CONNECTOR = "google_search_console_search_analytics";
const WORKFLOW = ".github/workflows/intelligence-ingest-free-sources.yml";

const failures = [];
const root = process.cwd();

// 1. The record itself --------------------------------------------------------
if (!fs.existsSync(path.join(root, OUT))) fail(`[${NAME}] FAIL: ${OUT} does not exist; nothing was checked`);
const truth = readJson(OUT);
for (const key of ["schema_version", "site", "collected_on", "collection", "totals", "window_queries", "history"]) {
  if (truth[key] === undefined) failures.push(`${OUT} has no ${key}`);
}
if (!Array.isArray(truth.window_queries)) failures.push(`${OUT}.window_queries is not an array`);
if (!Array.isArray(truth.history)) failures.push(`${OUT}.history is not an array`);
if (!["COLLECTED", "STALE", "NEVER_COLLECTED"].includes(truth.collection?.status)) {
  failures.push(`${OUT}.collection.status is ${JSON.stringify(truth.collection?.status)}`);
}
// Rule 0: a record of nothing is not a record. Search Console has measured
// queries for this site since 11 Sep 2026; a history that has emptied means the
// history was dropped, not that the measurements stopped.
if (Array.isArray(truth.history) && truth.history.length === 0) {
  failures.push(`${OUT}.history is empty; every query ever measured was dropped`);
}
for (const q of (truth.history || []).slice(0, 200)) {
  if (!q.query || q.impressions_28d === undefined || !q.last_seen_window) {
    failures.push(`${OUT}: a history entry lacks query, impressions_28d or last_seen_window (${JSON.stringify(q).slice(0, 80)})`);
    break;
  }
}
const staleDays = truth.collection?.stale_days;
if (typeof staleDays === "number" && staleDays > INERT_AFTER_DAYS) {
  failures.push(
    `the Search Console snapshot is ${staleDays} days old (last fetched ${truth.collection.source_fetched_at}); ` +
      `the daily lane has stopped collecting. Check ${WORKFLOW} and the GSC_SERVICE_ACCOUNT_JSON secret.`
  );
}

// 2. The record is built from the two measured sources ------------------------
for (const [name, file] of Object.entries(SOURCES)) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`${OUT} source ${name} (${file}) is missing`);
}

// 3. The cadence that keeps it daily ------------------------------------------
const budgets = readJson("data/intelligence/provider_budget.json").budgets || {};
const ceiling = budgets[CONNECTOR];
if (!ceiling) failures.push(`data/intelligence/provider_budget.json has no ${CONNECTOR} budget`);
else {
  if (Number(ceiling.dailyCeiling) < 1) failures.push(`${CONNECTOR} dailyCeiling is ${ceiling.dailyCeiling}; the lane runs daily`);
  if (Number(ceiling.weeklyCeiling) < 7) {
    failures.push(
      `${CONNECTOR} weeklyCeiling is ${ceiling.weeklyCeiling}, below the 7 a daily schedule needs: ` +
        "the connector would record BUDGET_HELD on the remaining days and the record would not be daily"
    );
  }
}

const workflow = fs.existsSync(path.join(root, WORKFLOW)) ? fs.readFileSync(path.join(root, WORKFLOW), "utf8") : "";
if (!workflow) failures.push(`${WORKFLOW} is missing; nothing collects daily`);
else {
  if (!/cron:\s*["'][^"']*\*\s+\*\s+\*["']/.test(workflow)) failures.push(`${WORKFLOW} has no daily cron`);
  if (!workflow.includes("search-intelligence:gsc-truth")) failures.push(`${WORKFLOW} does not run search-intelligence:gsc-truth`);
  if (!workflow.includes("data/search_intelligence")) failures.push(`${WORKFLOW} does not commit data/search_intelligence`);
}

if (failures.length) fail(`[${NAME}] FAIL: ${failures.length}\n - ` + failures.join("\n - "));
console.log(
  `[${NAME}] OK ${OUT} status=${truth.collection.status} stale_days=${staleDays} ` +
    `window_queries=${truth.totals.window_queries} history=${truth.totals.history_queries} ` +
    `ceiling=${ceiling.dailyCeiling}/day ${ceiling.weeklyCeiling}/week fresh_within=${STALE_AFTER_DAYS}d inert_after=${INERT_AFTER_DAYS}d`
);
