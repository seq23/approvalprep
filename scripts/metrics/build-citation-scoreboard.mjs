#!/usr/bin/env node
import { readJson, writeJson, arr, sourceState, metricItem } from "./lib.mjs";

const targets = readJson("data/atoms/citation_targets.json", { targets: [] });
const opportunities = readJson("data/intelligence/citation_opportunity_registry.json", { opportunities: [] });
const claimRegistry = readJson("data/citations/claim_registry.json", { claims: [] });
const sourceRegistry = readJson("data/citations/source_registry.json", { sources: [] });
const gsc = readJson("data/intelligence/gsc_search_analytics.json", { mode: "unavailable", rows: [] });
const bing = readJson("data/intelligence/bing_webmaster.json", { mode: "unavailable", rows: [] });
const indexnow = readJson("data/intelligence/indexnow_intelligence_receipts.json", { mode: "unavailable", receipts: [] });

const claims = arr(claimRegistry, "claims");
const sourcedClaims = claims.filter((claim) => claim.sourceId || claim.source_id || (claim.sources || []).length);
const metrics = [
  metricItem("Citation targets", arr(targets, "targets").length),
  metricItem("Citation opportunities", arr(opportunities, "opportunities").length),
  metricItem("Claims in registry", claims.length),
  metricItem("Claims with source coverage", sourcedClaims.length),
  metricItem("Sources in registry", arr(sourceRegistry, "sources").length),
  metricItem("GSC live rows", arr(gsc, "rows").length, "gsc", sourceState("gsc", gsc).live ? "live_provider" : "unavailable"),
  metricItem("Bing live rows", arr(bing, "rows").length, "bing", sourceState("bing", bing).live ? "live_provider" : "unavailable"),
  metricItem("IndexNow receipts", arr(indexnow, "receipts").length, "indexnow", "submission_receipt")
];

writeJson("data/metrics/citation_scoreboard.json", {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  status: "measurement_foundation",
  warning: "Confirmed citations are not claimed here unless imported into an approved citation ledger. This scoreboard measures citation readiness and available provider telemetry only.",
  sourceStates: [sourceState("gsc", gsc), sourceState("bing", bing), sourceState("indexnow", indexnow)],
  metrics
});
console.log(`[metrics:citation-scoreboard] wrote ${metrics.length} metrics`);
