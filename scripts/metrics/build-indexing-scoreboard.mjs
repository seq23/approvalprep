#!/usr/bin/env node
import { readJson, writeJson, arr, countPublicRoutes, sourceState, metricItem } from "./lib.mjs";
const manifest = readJson("data/routes/route_manifest.json", { routes: [] });
const submissions = readJson("data/seo/submission_registry.json", { submissions: [] });
const receipts = readJson("data/seo/indexing_receipts.json", { receipts: [] });
const gscInspect = readJson("data/intelligence/gsc_url_inspection.json", { mode: "unavailable", rows: [] });
const indexnow = readJson("data/intelligence/indexnow_intelligence_receipts.json", { mode: "unavailable", receipts: [] });
const publicRoutes = countPublicRoutes(manifest);
const metrics = [
  metricItem("Public indexed routes in manifest", publicRoutes),
  metricItem("SEO submission registry rows", arr(submissions, "submissions").length),
  metricItem("Indexing receipts", arr(receipts, "receipts").length),
  metricItem("GSC inspection rows", arr(gscInspect, "rows").length, "gsc_url_inspection", sourceState("gsc_url_inspection", gscInspect).live ? "live_provider" : "unavailable"),
  metricItem("IndexNow intelligence receipts", arr(indexnow, "receipts").length, "indexnow", "submission_receipt")
];
writeJson("data/metrics/indexing_scoreboard.json", {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  warning: "Manifest, sitemap, and submission counts do not prove search indexing. Live indexing requires provider data.",
  sourceStates: [sourceState("gsc_url_inspection", gscInspect), sourceState("indexnow", indexnow)],
  metrics
});
console.log(`[metrics:indexing-scoreboard] wrote ${metrics.length} metrics`);
