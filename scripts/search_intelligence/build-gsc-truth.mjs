#!/usr/bin/env node
// data/search_intelligence/gsc_truth.json — the committed daily record of what
// Search Console measured for approvalprep.com.
//
// The repository already collected the two halves and kept them in two places:
// the rolling 28-day query+page rows (data/intelligence/gsc_search_analytics.json,
// written by the connector) and the query history that outlives the window
// (data/search_intelligence/gsc_query_history.json, written by the target set).
// Nothing joined them, so there was no one file to read, and nothing recorded
// whether today's collection actually happened: on 25 Oct 2026 the 28-day
// snapshot was 13 days old and every daily run in between had recorded
// BUDGET_HELD behind a weekly ceiling of 3, with a green workflow log either way.
//
// This writes that one file, and writes it on every run whether the connector
// answered or not, so the gap between "collected today" and "last collected on
// the 13th" is visible in the committed tree instead of being invisible in it.
// collection.status is COLLECTED or STALE; stale_days is measured, not inferred.
//
// Guarded by scripts/validate/gsc-truth.mjs.
import { fileURLToPath } from "node:url";
import { readJson, writeJson } from "../intelligence/_lib.mjs";

export const OUT = "data/search_intelligence/gsc_truth.json";
export const SOURCES = {
  analytics: "data/intelligence/gsc_search_analytics.json",
  history: "data/search_intelligence/gsc_query_history.json"
};
// The connector's own freshness bar. The Search Readiness checklist asks for a
// file committed within 3 days; one missed day is a hiccup, two is a lane that
// has stopped, so the record says STALE from the third.
export const STALE_AFTER_DAYS = 3;

const day = (iso) => String(iso || "").slice(0, 10);

export function buildTruth({ analytics, history, now = new Date() }) {
  const rows = Array.isArray(analytics?.rows) ? analytics.rows : [];
  const queries = history && typeof history.queries === "object" ? history.queries : {};
  const fetchedAt = analytics?.fetchedAt || null;
  const staleDays = fetchedAt ? Math.floor((now.getTime() - new Date(fetchedAt).getTime()) / 86400000) : null;
  const window = analytics?.window
    ? { start_date: analytics.window.startDate, end_date: analytics.window.endDate, days: analytics.window.days }
    : null;
  const byQuery = new Map();
  for (const row of rows) {
    const key = String(row.query || "").trim();
    if (!key) continue;
    const seen = byQuery.get(key) || { query: key, clicks: 0, impressions: 0, pages: [] };
    seen.clicks += Number(row.clicks || 0);
    seen.impressions += Number(row.impressions || 0);
    if (row.page && !seen.pages.includes(row.page)) seen.pages.push(row.page);
    byQuery.set(key, seen);
  }
  const window_queries = [...byQuery.values()].sort((a, b) => b.impressions - a.impressions || a.query.localeCompare(b.query));
  return {
    schema_version: "1.0",
    rule:
      "The daily Search Console record for approvalprep.com: the rolling 28-day query+page rows as collected, " +
      "and every query ever measured. A query that leaves the 28-day window stays in history with the window it " +
      "was last seen in - a measurement does not expire because the window moved.",
    site: "approvalprep.com",
    collected_on: day(now.toISOString()),
    collection: {
      // The connector's own last successful fetch, not the time this file was written.
      source_fetched_at: fetchedAt,
      status: staleDays === null ? "NEVER_COLLECTED" : staleDays <= STALE_AFTER_DAYS ? "COLLECTED" : "STALE",
      stale_days: staleDays,
      mode: analytics?.mode ?? null,
      errors: Array.isArray(analytics?.errors) ? analytics.errors : []
    },
    window,
    totals: {
      window_queries: window_queries.length,
      window_rows: rows.length,
      window_impressions: window_queries.reduce((sum, q) => sum + q.impressions, 0),
      window_clicks: window_queries.reduce((sum, q) => sum + q.clicks, 0),
      history_queries: Object.keys(queries).length
    },
    window_queries,
    history: Object.values(queries).sort((a, b) => String(a.query).localeCompare(String(b.query)))
  };
}

// scripts/validate/gsc-truth.mjs imports OUT, SOURCES and STALE_AFTER_DAYS from
// here so the two cannot name different files. Running the build is the entry
// point's job only.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const truth = buildTruth({ analytics: readJson(SOURCES.analytics), history: readJson(SOURCES.history) });
  writeJson(OUT, truth);
  console.log(
    `[gsc-truth] ${truth.collection.status} window=${truth.window ? `${truth.window.start_date}..${truth.window.end_date}` : "none"} ` +
      `queries=${truth.totals.window_queries} impressions=${truth.totals.window_impressions} history=${truth.totals.history_queries} ` +
      `source_fetched_at=${truth.collection.source_fetched_at ?? "never"}`
  );
}
