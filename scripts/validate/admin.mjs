#!/usr/bin/env node
import { readJson, exists, fail } from "./_common.mjs";
if (!exists("src/pages/admin.astro")) fail("[admin] missing admin page");
const growth = readJson("data/admin/growth_health.json").panels.map((p) => p.name);
for (const panel of ["SEO Health", "AEO Health", "GEO Health", "Query Universe", "Citation Targets", "Citation Wins", "Citation Gaps", "Indexing", "Self-Healing Log", "Blockers"]) {
  if (!growth.includes(panel)) fail("[admin] missing growth panel " + panel);
}
console.log("[admin] OK");
