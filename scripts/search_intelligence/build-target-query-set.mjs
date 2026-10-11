#!/usr/bin/env node
// Target query set, from MEASURED sources only.
//
// Search Console (11 Sep-8 Oct 2026) showed 10 impressions for 3 queries, and
// the repo's query lists carried 14 queries with no number at all
// (data/queries/evidence/evidence_queries.json, search_volume null). A target
// list nobody measured steers everything downstream at nothing.
//
// A target exists only when something measured it:
//   - gsc_search_analytics: a query row in data/intelligence/gsc_search_analytics.json
//     (rolling 28 days, query + page), with impressions > 0;
//   - measured_demand: a record in data/demand/measured_demand.json with volume > 0;
//   - evidence_queries: a record in data/queries/evidence/evidence_queries.json with
//     search_volume > 0.
// Every target carries its source and number. A candidate with no number is
// DROPPED and listed with the reason, never kept with a null.
// validate:target-query-set fails the file on any target without both, and on a
// file that is stale against its inputs.
import { readJson, writeJson } from "../intelligence/_lib.mjs";

export const OUT = "data/search_intelligence/target_query_set.json";
export const SOURCES = {
  gsc: "data/intelligence/gsc_search_analytics.json",
  demand: "data/demand/measured_demand.json",
  evidence: "data/queries/evidence/evidence_queries.json",
  manifest: "data/routes/route_manifest.json"
};
const STOP = new Set(["a", "an", "the", "of", "for", "to", "my", "your", "do", "does", "how", "what", "is"]);
export const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s) => norm(s).split(" ").filter((t) => t && !STOP.has(t));
const pathOf = (url) => { try { return new URL(url).pathname.replace(/\/+$/, "") || "/"; } catch { return null; } };

export function build() {
  const gsc = readJson(SOURCES.gsc, { rows: [] });
  const demand = readJson(SOURCES.demand, { records: [] });
  const evidence = readJson(SOURCES.evidence, { queries: [] });
  const routes = (readJson(SOURCES.manifest, { routes: [] }).routes || []).filter((r) => r.type === "public" && r.index);
  // The page that should answer a query: the route whose path tokens equal the
  // query's tokens (stopwords aside). No match is recorded as null, not guessed.
  const routeFor = (q) => {
    const want = tokens(q).sort().join(" ");
    const hit = routes.find((r) => tokens(r.path.replace(/[/-]/g, " ")).sort().join(" ") === want);
    return hit ? hit.path : null;
  };
  const targets = new Map();
  const dropped = [];
  const add = (t) => {
    const key = norm(t.query);
    if (!key) return;
    const prev = targets.get(key);
    if (prev) { prev.other_measurements.push({ source: t.source, ...t.measurement }); return; }
    targets.set(key, { query: t.query, query_normalized: key, source: t.source, measurement: t.measurement, expected_owned_route: t.expected_owned_route ?? routeFor(t.query), other_measurements: [] });
  };
  const window = gsc.window ? `${gsc.window.startDate}..${gsc.window.endDate}` : "rolling 28 days";
  // Search Console first: it is this site's own measurement.
  for (const row of gsc.rows || []) {
    if (!row.query) continue;
    const impressions = Number(row.impressions) || 0;
    if (impressions <= 0) { dropped.push({ query: row.query, source: "gsc_search_analytics", reason: "zero impressions in the 28-day window" }); continue; }
    add({ query: row.query, source: "gsc_search_analytics", measurement: { metric: "impressions_28d", value: impressions, clicks: Number(row.clicks) || 0, position: Number(row.position) || null, window, collected_at: gsc.fetchedAt }, expected_owned_route: pathOf(row.page) });
  }
  for (const r of demand.records || []) {
    const v = Number(r.volume);
    if (!(v > 0)) { dropped.push({ query: r.query, source: "measured_demand", reason: "no measured monthly volume (owner seed or null)" }); continue; }
    add({ query: r.query, source: "measured_demand", measurement: { metric: "search_volume_monthly_us", value: v, provider: demand.provenance?.source || "semrush", pulled_at: demand.provenance?.pulled_at || null } });
  }
  for (const q of evidence.queries || []) {
    const v = Number(q.search_volume);
    if (!(v > 0)) { if (!targets.has(norm(q.query))) dropped.push({ query: q.query, source: "evidence_queries", reason: "search_volume is null: no measured number" }); continue; }
    add({ query: q.query, source: "evidence_queries", measurement: { metric: "search_volume_monthly_us", value: v, provider: q.search_volume_source || q.source_type || null } });
  }
  const list = [...targets.values()].sort((a, b) => (a.source === b.source ? b.measurement.value - a.measurement.value : a.source === "gsc_search_analytics" ? -1 : b.source === "gsc_search_analytics" ? 1 : 0));
  const bySource = list.reduce((acc, t) => { acc[t.source] = (acc[t.source] || 0) + 1; return acc; }, {});
  return {
    schema_version: "1.0",
    measurement_rule: "Every target carries a source and a positive measured number. Anything unmeasured is dropped with its reason, never kept with a null.",
    sources: Object.values(SOURCES).slice(0, 3),
    gsc_window: window,
    gsc_collected_at: gsc.fetchedAt || null,
    target_count: list.length,
    targets_by_source: bySource,
    truth_boundary: "A target is a query this site intends to answer. Its number is the measurement that admitted it, not evidence of ranking or indexing.",
    targets: list,
    dropped_count: dropped.length,
    dropped
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const doc = build();
  writeJson(OUT, doc);
  console.log(`target-query-set: ${doc.target_count} measured targets ${JSON.stringify(doc.targets_by_source)}; ${doc.dropped_count} dropped as unmeasured`);
}
