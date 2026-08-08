#!/usr/bin/env node
import { readJson, fail } from "./_common.mjs";

const budgetFile = readJson("data/intelligence/provider_budget.json");
if (!budgetFile || !budgetFile.budgets) fail("[provider-cost-controls] missing data/intelligence/provider_budget.json budgets");

const required = [
  "google_search_console_search_analytics",
  "google_url_inspection",
  "bing_webmaster",
  "competitor_public_crawler",
  "competitor_sitemap_discovery",
  "cloudflare_crawler_logs",
  "indexnow"
];
for (const id of required) {
  const limits = budgetFile.budgets[id];
  if (!limits) fail(`[provider-cost-controls] missing budget ceiling for connector ${id}`);
  if (!(limits.dailyCeiling > 0) || !(limits.weeklyCeiling > 0)) fail(`[provider-cost-controls] invalid ceiling for ${id}`);
  if (limits.dailyCeiling > 5 || limits.weeklyCeiling > 25) fail(`[provider-cost-controls] ceiling too high for near-zero-cost operation: ${id}`);
}

console.log(`[provider-cost-controls] OK connectors=${required.length}`);
