#!/usr/bin/env node
import fs from "node:fs";
const targets = JSON.parse(fs.readFileSync("data/atoms/citation_targets.json", "utf8")).targets || [];
const existingPath = "data/citations/mention_watchlist.json";
const existing = fs.existsSync(existingPath) ? JSON.parse(fs.readFileSync(existingPath, "utf8")) : { schemaVersion: "1.0.0", watchlist: [] };
const byTerm = new Map((existing.watchlist || []).map((item) => [item.term, item]));
for (const term of ["ApprovalPrep", "approvalprep.com", "ApprovalPrep Letter Writing Studio"]) {
  if (!byTerm.has(term)) byTerm.set(term, { id: `watch-${String(byTerm.size + 1).padStart(3,"0")}`, term, type: "brand", status: "active", createdAt: new Date().toISOString() });
}
for (const target of targets.slice(0, 50)) {
  if (target.query && !byTerm.has(target.query)) byTerm.set(target.query, { id: `watch-${String(byTerm.size + 1).padStart(3,"0")}`, term: target.query, type: "query_target", status: "active", targetRoute: target.route || "/", createdAt: new Date().toISOString() });
}
fs.writeFileSync(existingPath, JSON.stringify({ schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), watchlist: [...byTerm.values()] }, null, 2) + "\n");
console.log(`[citations:watchlist] terms=${byTerm.size}`);
