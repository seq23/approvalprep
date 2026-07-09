#!/usr/bin/env node
import fs from "node:fs";
const report = JSON.parse(fs.readFileSync("data/intelligence/content_decay_report.json", "utf8"));
const approved = (report.items || []).filter((item) => item.status === "approved_for_safe_refresh");
fs.writeFileSync("data/workflow_traces/lifecycle-refresh-application.json", JSON.stringify({
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  mode: "approval_gated",
  appliedCount: 0,
  approvedCount: approved.length,
  note: "Batch 6 records lifecycle approval state only. It does not rewrite content without explicit approved records."
}, null, 2) + "\n");
console.log(`[content:apply-refreshes] approval-gated applied=0 approved=${approved.length}`);
