#!/usr/bin/env node
import { readJson, fail } from "./_common.mjs";

const manifest = readJson("data/routes/route_manifest.json").routes.filter((route) => route.type !== "admin");
const families = new Set(readJson("data/atlas/page_family_registry.json").pageFamilies.map((family) => family.id));
const admittedRoutes = readJson("data/atlas/route_admission_manifest.json").routes;
const queryUniverse = readJson("data/atlas/query_universe.json").queries;
const matrixRows = readJson("data/atlas/query_matrix.json").rows;
const fanout = readJson("data/atlas/fanout_query_map.json");
const queryIds = new Set(queryUniverse.map((query) => query.query_id));

for (const route of admittedRoutes) {
  if (!families.has(route.family)) fail("[atlas] unknown family " + route.family);
  if (!route.status.startsWith("ADMITTED")) fail("[atlas] non-admitted route " + route.route);
}

for (const route of manifest) {
  if (!admittedRoutes.find((row) => row.route === route.path)) fail("[atlas] route missing from admission manifest " + route.path);
}

if (!fanout.rules.some((rule) => rule.rule === "No thin fanout" && rule.severity === "HARD_FAIL")) fail("[atlas] missing thin fanout hard fail");
if (queryUniverse.length < 200) fail("[atlas] query universe is too small for current route surface");
if (matrixRows.length !== queryUniverse.length) fail("[atlas] query matrix must mirror query universe");

for (const route of manifest.filter((item) => item.index)) {
  const routeQueries = queryUniverse.filter((query) => query.route_owner === route.path);
  if (routeQueries.length < 5) fail(`[atlas] indexed route has thin query coverage: ${route.path}`);
  const parent = fanout.parent_queries.find((item) => item.route_owner === route.path);
  if (!parent || parent.children.length < 4) fail(`[atlas] route missing fanout children: ${route.path}`);
  for (const child of parent.children) {
    if (!queryIds.has(child)) fail(`[atlas] fanout child missing from query universe: ${child}`);
  }
}

for (const query of queryUniverse.filter((item) => item.risk_level === "regulated")) {
  if (!query.source_ids?.length || !query.claim_ids?.length) fail("[atlas] regulated query missing source or claim mapping " + query.query_id);
}

console.log(`[atlas] OK routes=${admittedRoutes.length} queries=${queryUniverse.length} fanoutParents=${fanout.parent_queries.length}`);
