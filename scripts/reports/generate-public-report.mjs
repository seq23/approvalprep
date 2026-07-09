#!/usr/bin/env node
import fs from "node:fs";
const registry = JSON.parse(fs.readFileSync("data/reports/public_report_registry.json", "utf8"));
for (const report of registry.reports) {
  if (!report.methodology || !Array.isArray(report.sections) || report.sections.length < 3) throw new Error(`thin public report: ${report.id}`);
}
fs.mkdirSync("data/workflow_traces", { recursive: true });
fs.writeFileSync("data/workflow_traces/public-report-generation.json", JSON.stringify({ schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), status: "REPORT_REGISTRY_VALIDATED", count: registry.reports.length }, null, 2) + "\n");
console.log(`[reports:public] OK reports=${registry.reports.length}`);
