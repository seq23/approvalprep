#!/usr/bin/env node
import fs from "node:fs";
const reports = JSON.parse(fs.readFileSync("data/reports/public_report_registry.json", "utf8"));
const drafts = reports.reports.map((report) => ({ id: report.id, subject: report.title, summary: report.summary, url: `https://approvalprep.com${report.path}` }));
fs.writeFileSync("data/repurposing/newsletter_drafts.json", JSON.stringify({ schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), drafts }, null, 2) + "\n");
console.log(`[repurpose:newsletter] OK drafts=${drafts.length}`);
