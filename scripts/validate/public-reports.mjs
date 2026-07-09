#!/usr/bin/env node
import fs from "node:fs";
const fail = (message) => { console.error(message); process.exit(1); };
const registry = JSON.parse(fs.readFileSync("data/reports/public_report_registry.json", "utf8"));
const sources = JSON.parse(fs.readFileSync("data/reports/public_report_sources.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("data/routes/route_manifest.json", "utf8"));
const sourceIds = new Set(sources.sources.map((source) => source.id));
const routePaths = new Set(manifest.routes.map((route) => route.path));
if (!Array.isArray(registry.reports) || registry.reports.length < 3) fail("[public-reports] too few reports");
for (const report of registry.reports) {
  if (!report.path?.startsWith("/reports/")) fail(`[public-reports] bad path ${report.id}`);
  if (report.status === "published_by_contract" && !routePaths.has(report.path)) fail(`[public-reports] missing route ${report.path}`);
  if (!report.methodology) fail(`[public-reports] missing methodology ${report.id}`);
  if (/research proves|study proves|survey proves|guarantees/i.test(report.methodology)) fail(`[public-reports] unsafe methodology ${report.id}`);
  if (!Array.isArray(report.sections) || report.sections.length < 3) fail(`[public-reports] thin report ${report.id}`);
  for (const id of report.sourceIds || []) if (!sourceIds.has(id)) fail(`[public-reports] missing source ${id}`);
  const text = JSON.stringify(report).toLowerCase();
  for (const phrase of ["guaranteed approval", "guarantees approval", "approval guaranteed", "credit repair service"]) if (text.includes(phrase)) fail(`[public-reports] prohibited claim ${phrase} in ${report.id}`);
}
console.log(`[public-reports] OK reports=${registry.reports.length}`);
