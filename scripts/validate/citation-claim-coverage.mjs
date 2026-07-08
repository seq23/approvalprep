#!/usr/bin/env node
import { readJson, fail } from "./_common.mjs";
const sources = new Set(readJson("data/citations/source_registry.json").sources.map((s) => s.source_id));
const routes = new Set(readJson("data/routes/route_manifest.json").routes.map((r) => r.path));
for (const claim of readJson("data/citations/claim_registry.json").claims) {
  if (!routes.has(claim.page_route)) fail("[claims] unknown route " + claim.page_route);
  if ((claim.risk_class === "regulated" || claim.citation_mode === "required") && !claim.source_ids.length) fail("[claims] missing source " + claim.claim_id);
  for (const source of claim.source_ids) if (!sources.has(source)) fail("[claims] unknown source " + source);
}
console.log("[claims] OK");
