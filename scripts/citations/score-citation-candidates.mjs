#!/usr/bin/env node
import fs from "node:fs";
const file = "data/citations/citation_candidates.json";
const data = JSON.parse(fs.readFileSync(file, "utf8"));
for (const item of data.candidates || []) {
  const riskPenalty = item.risk === "regulated" ? 25 : item.risk === "high" ? 15 : 0;
  const evidenceBoost = item.evidenceSource && item.evidenceSource !== "repo_static_target" ? 15 : 0;
  item.score = Math.max(0, Math.min(100, Number(item.priority || 50) + evidenceBoost - riskPenalty));
  item.scoreBasis = "priority plus evidence boost minus risk penalty; not a confirmation of citation.";
}
data.generatedAt = new Date().toISOString();
fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
console.log(`[citations:score] candidates=${(data.candidates || []).length}`);
