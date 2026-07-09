#!/usr/bin/env node
import fs from "node:fs";
const importPath = process.env.APPROVALPREP_BACKLINK_IMPORT || "data/external/imports/confirmed_backlinks.json";
const out = "data/citations/confirmed_citations.json";
const ledger = JSON.parse(fs.readFileSync(out, "utf8"));
let imported = [];
if (fs.existsSync(importPath)) {
  const raw = JSON.parse(fs.readFileSync(importPath, "utf8"));
  imported = Array.isArray(raw) ? raw : (raw.citations || raw.backlinks || []);
}
const byKey = new Map((ledger.citations || []).map((item) => [`${item.sourceUrl}|${item.targetUrl}`, item]));
for (const item of imported) {
  if (!item.sourceUrl || !item.targetUrl) continue;
  byKey.set(`${item.sourceUrl}|${item.targetUrl}`, { status: "confirmed", evidenceSource: "backlink_repo_import", firstSeenAt: new Date().toISOString(), ...item });
}
ledger.generatedAt = new Date().toISOString();
ledger.citations = [...byKey.values()];
fs.writeFileSync(out, JSON.stringify(ledger, null, 2) + "\n");
console.log(`[handoff:import-backlinks] imported=${imported.length} confirmed=${ledger.citations.length}`);
