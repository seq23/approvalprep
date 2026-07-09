#!/usr/bin/env node
import fs from "node:fs";
for (const file of ["data/citations/citation_candidates.json", "data/citations/confirmed_citations.json", "data/citations/mention_watchlist.json"]) {
  if (!fs.existsSync(file)) throw new Error(`${file} missing`);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!data.schemaVersion) throw new Error(`${file} missing schemaVersion`);
}
const confirmed = JSON.parse(fs.readFileSync("data/citations/confirmed_citations.json", "utf8")).citations || [];
for (const citation of confirmed) {
  for (const key of ["sourceUrl", "targetUrl", "firstSeenAt", "evidenceSource"]) {
    if (!citation[key]) throw new Error(`confirmed citation missing ${key}`);
  }
}
const candidates = JSON.parse(fs.readFileSync("data/citations/citation_candidates.json", "utf8")).candidates || [];
for (const candidate of candidates) {
  if (candidate.status === "confirmed") throw new Error("citation candidates may not claim confirmed status");
  if (!candidate.targetUrl && !candidate.targetRoute) throw new Error("candidate missing targetUrl/targetRoute");
}
console.log(`[validate:citation-ledger] OK candidates=${candidates.length} confirmed=${confirmed.length}`);
