#!/usr/bin/env node
import { readJson, fail } from "./_common.mjs";
const manifest = readJson("data/routes/route_manifest.json");
const paths = new Set();
for (const route of manifest.routes) {
  if (!route.path.startsWith("/")) fail("[routes] bad path " + route.path);
  if (paths.has(route.path)) fail("[routes] duplicate path " + route.path);
  paths.add(route.path);
  if (!route.family || typeof route.index !== "boolean") fail("[routes] incomplete route " + route.path);
}
for (const required of ["/", "/pricing", "/letter-of-explanation", "/admin", "/download", "/checkout/success"]) {
  if (!paths.has(required)) fail("[routes] missing required route " + required);
}
console.log("[routes] OK");
