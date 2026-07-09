#!/usr/bin/env node
import { readJson, writeJson, arr, metricItem } from "./lib.mjs";
const owned = readJson("data/intelligence/owned_site_crawl.json", { pages: [] });
const cloudflare = readJson("data/intelligence/cloudflare_crawler_logs.json", { mode: "unavailable", visits: [] });
const visits = arr(cloudflare, "visits");
const metrics = [
  metricItem("Owned crawl pages", arr(owned, "pages").length, "owned_crawl", "structural"),
  metricItem("Cloudflare crawler visits", visits.length, "cloudflare", cloudflare.mode === "live" ? "live_provider" : "unavailable"),
  metricItem("AI crawler visits", visits.filter((v) => /gpt|claude|perplexity|applebot|ccbot|common/i.test(`${v.bot || v.userAgent || ""}`)).length, "cloudflare", cloudflare.mode === "live" ? "live_provider" : "unavailable")
];
writeJson("data/metrics/crawler_scoreboard.json", {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  warning: "Cloudflare crawler data is unavailable until Cloudflare log ingestion is configured. Owned crawl data is not the same as external bot visits.",
  metrics
});
console.log(`[metrics:crawler-scoreboard] wrote ${metrics.length} metrics`);
