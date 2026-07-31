#!/usr/bin/env node
import fs from "node:fs";
const plan = JSON.parse(fs.readFileSync("data/content/consolidation_plan.json", "utf8"));
const approved = (plan.candidates || []).filter((item) => item.status === "approved");
const redirects = JSON.parse(fs.readFileSync("data/routes/redirects.json", "utf8"));
for (const item of approved) {
  if (!item.sourceRoute || !item.targetRoute) throw new Error("approved consolidation missing sourceRoute or targetRoute");
  if (item.sourceRoute === item.targetRoute) throw new Error(`approved consolidation loops ${item.sourceRoute}`);
  if (!redirects.redirects.some((r) => (r.source || r.from) === item.sourceRoute && (r.destination || r.to) === item.targetRoute)) {
    redirects.redirects.push({
      source: item.sourceRoute,
      destination: item.targetRoute,
      statusCode: 301,
      preserveQuery: true,
      reason: "Approved content consolidation",
      createdAt: (item.approvedAt || new Date().toISOString()).slice(0, 10),
      owner: "approved_consolidation"
    });
  }
}
redirects.generatedAt = new Date().toISOString();
fs.writeFileSync("data/routes/redirects.json", JSON.stringify(redirects, null, 2) + "\n");
fs.writeFileSync("data/workflow_traces/lifecycle-consolidation-application.json", JSON.stringify({ schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), mode: "approval_gated", appliedCount: approved.length }, null, 2) + "\n");
console.log(`[content:apply-consolidations] applied=${approved.length}`);
