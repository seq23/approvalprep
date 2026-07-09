#!/usr/bin/env node
import fs from "node:fs";
const fail = (msg) => { console.error(msg); process.exit(1); };
const readJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const opportunities = readJson("data/content/page_opportunities.json");
const registry = readJson("data/content/page_registry.json");
const routeCopy = readJson("data/content/generated_route_copy.json");
const manifest = readJson("data/routes/route_manifest.json");
if (!Array.isArray(opportunities.opportunities)) fail("[page-factory] opportunities missing");
if (!Array.isArray(registry.pages)) fail("[page-factory] registry pages missing");
if (!routeCopy.routes || typeof routeCopy.routes !== "object") fail("[page-factory] generated route copy missing");
const pathSet = new Set();
const querySet = new Set();
for (const item of opportunities.opportunities) {
  if (!item.id || !item.path || !item.title || !item.primaryQuery) fail("[page-factory] incomplete opportunity " + (item.id || item.path));
  if (pathSet.has(item.path)) fail("[page-factory] duplicate opportunity path " + item.path);
  pathSet.add(item.path);
  if (querySet.has(item.primaryQuery)) fail("[page-factory] duplicate opportunity primaryQuery " + item.primaryQuery);
  querySet.add(item.primaryQuery);
  if ((item.risk === "regulated" || item.path.includes("credit")) && item.autoPublishEligible === true) fail("[page-factory] regulated opportunity cannot be auto-publish eligible " + item.path);
}
const manifestPaths = new Set(manifest.routes.map((route) => route.path));
for (const page of registry.pages) {
  if (!page.id || !page.path || !page.status || !page.risk) fail("[page-factory] incomplete page registry record " + (page.path || page.id));
  if (page.status === "published_by_contract") {
    if (!manifestPaths.has(page.path)) fail("[page-factory] published page missing manifest route " + page.path);
    const copy = routeCopy.routes[page.path];
    if (!copy || !copy.heading || !copy.shortAnswer || !Array.isArray(copy.steps) || copy.steps.length < 3 || !Array.isArray(copy.faq) || copy.faq.length < 2) fail("[page-factory] published page has thin generated copy " + page.path);
  }
  if (page.risk === "regulated" && page.status === "published_by_contract") fail("[page-factory] regulated page auto-published " + page.path);
}
console.log(`[page-factory] OK opportunities=${opportunities.opportunities.length} pages=${registry.pages.length}`);
