#!/usr/bin/env node
import fs from "node:fs";
const registry = JSON.parse(fs.readFileSync("data/reports/public_report_registry.json", "utf8"));
const routes = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const routeSet = new Set(routes.routes.map((route) => route.path));
for (const report of registry.reports) {
  if (report.status === "published_by_contract" && !routeSet.has(report.path)) throw new Error(`published report missing route: ${report.path}`);
}
fs.mkdirSync("data/workflow_traces", { recursive: true });
fs.writeFileSync("data/workflow_traces/public-reports.json", JSON.stringify({ schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), reports: registry.reports.length }, null, 2) + "\n");
console.log(`[reports:data] OK reports=${registry.reports.length}`);
