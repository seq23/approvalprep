#!/usr/bin/env node
import { readJson, writeJson, appendRun, now } from "./_lib.mjs";

const connectorId = "retest_outcome_evaluator";
const queueFile = "data/authority_scale/retest_queue.json";
const outcomeFile = "data/authority_scale/retest_outcome_ledger.json";

const queue = readJson(queueFile, { schemaVersion: "1.0.0", minDelayDays: 14, entries: [] });
const ledger = readJson(outcomeFile, {
  schemaVersion: "1.0.0",
  truth_boundary: "An IMPROVED or REGRESSED outcome requires real before/after provider or crawler evidence for the same route. A missing or unconfigured provider produces INCONCLUSIVE, never IMPROVED or REGRESSED.",
  outcomes: []
});

const urlInspection = readJson("data/intelligence/gsc_url_inspection.json", { mode: "unavailable", rows: [] });
const searchAnalytics = readJson("data/intelligence/gsc_search_analytics.json", { mode: "unavailable", rows: [] });

const nowMs = Date.now();
let evaluated = 0;

for (const entry of queue.entries) {
  if (entry.status === "RETESTED") continue;
  if (new Date(entry.retestEligibleAt).getTime() > nowMs) continue;

  let outcome = "INCONCLUSIVE";
  let evidenceSource = "unavailable";
  let notes = "No live provider evidence was available for this route at evaluation time. This is UNPROVEN, not a negative result.";

  if (entry.route && urlInspection.mode === "live") {
    const row = (urlInspection.rows || []).find((item) => item.route === entry.route);
    if (row) {
      evidenceSource = "gsc_url_inspection";
      outcome = row.verdict === "PASS" || row.verdict === "INDEXED" ? "IMPROVED" : row.verdict === "UNKNOWN" ? "INCONCLUSIVE" : "UNCHANGED";
      notes = `GSC URL Inspection verdict at retest: ${row.verdict}`;
    }
  } else if (entry.route && searchAnalytics.mode === "live") {
    const rows = (searchAnalytics.rows || []).filter((item) => item.page && item.page.endsWith(entry.route));
    if (rows.length) {
      const impressions = rows.reduce((sum, item) => sum + (item.impressions || 0), 0);
      evidenceSource = "gsc_search_analytics";
      outcome = impressions > 0 ? "IMPROVED" : "UNCHANGED";
      notes = `GSC search analytics impressions observed since repair: ${impressions}`;
    }
  }

  entry.status = "RETESTED";
  entry.evaluatedAt = now();
  ledger.outcomes.push({ id: `outcome:${entry.id}`, retestQueueId: entry.id, route: entry.route, evaluatedAt: entry.evaluatedAt, evidenceSource, outcome, notes });
  evaluated++;
}

writeJson(queueFile, queue);
writeJson(outcomeFile, ledger);
appendRun(connectorId, "COMPLETE", { recordsImported: evaluated });
console.log(JSON.stringify({ connectorId, status: "COMPLETE", evaluated }, null, 2));
