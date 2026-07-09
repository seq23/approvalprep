#!/usr/bin/env node
import fs from "node:fs";
const out = "data/citations/citation_candidates.json";
const data = JSON.parse(fs.readFileSync(out, "utf8"));
const importPath = process.env.APPROVALPREP_CITATION_IMPORT || "data/external/imports/citation_candidates.json";
let imported = [];
if (fs.existsSync(importPath)) {
  const raw = JSON.parse(fs.readFileSync(importPath, "utf8"));
  imported = Array.isArray(raw) ? raw : (raw.candidates || []);
}
const existing = new Map((data.candidates || []).map((item) => [item.id || `${item.sourceUrl}|${item.targetUrl}`, item]));
for (const item of imported) {
  const key = item.id || `${item.sourceUrl || "manual"}|${item.targetUrl || "unknown"}`;
  existing.set(key, { status: "candidate", evidenceSource: "manual_import", ...item, id: key });
}
data.generatedAt = new Date().toISOString();
data.candidates = [...existing.values()];
fs.writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
console.log(`[citations:import] candidates=${data.candidates.length} imported=${imported.length}`);
