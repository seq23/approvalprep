#!/usr/bin/env node
import fs from "node:fs";
const reports = JSON.parse(fs.readFileSync("data/reports/public_report_registry.json", "utf8"));
const snippets = reports.reports.map((report) => ({ id: report.id, text: `${report.title}: ${report.summary} ApprovalPrep reports are educational and do not guarantee outcomes.` }));
fs.mkdirSync("data/repurposing", { recursive: true });
fs.writeFileSync("data/repurposing/social_snippets.json", JSON.stringify({ schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), snippets }, null, 2) + "\n");
console.log(`[repurpose:social] OK snippets=${snippets.length}`);
