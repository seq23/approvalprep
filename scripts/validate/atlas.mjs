#!/usr/bin/env node
import { readJson, fail } from "./_common.mjs";
const families = new Set(readJson("data/atlas/page_family_registry.json").pageFamilies.map((f) => f.id));
for (const row of readJson("data/atlas/route_admission_manifest.json").routes) {
  if (!families.has(row.family)) fail("[atlas] unknown family " + row.family);
  if (!row.status.startsWith("ADMITTED")) fail("[atlas] non-admitted route " + row.route);
}
const fanout = readJson("data/atlas/fanout_query_map.json");
if (!fanout.rules.some((r) => r.rule === "No thin fanout" && r.severity === "HARD_FAIL")) fail("[atlas] missing thin fanout hard fail");
console.log("[atlas] OK");
