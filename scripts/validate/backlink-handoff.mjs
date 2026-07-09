#!/usr/bin/env node
import fs from "node:fs";
const files = ["data/backlink_handoff/backlink_needs.json", "data/backlink_handoff/anchor_targets.json", "data/backlink_handoff/citation_snippets.json", "data/backlink_handoff/repo_contract.json", "data/backlink_handoff/priority_pages.csv"];
for (const file of files) if (!fs.existsSync(file)) throw new Error(`${file} missing`);
for (const file of files.filter((f) => f.endsWith(".json"))) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!data.schemaVersion) throw new Error(`${file} missing schemaVersion`);
}
const needs = JSON.parse(fs.readFileSync("data/backlink_handoff/backlink_needs.json", "utf8")).needs || [];
if (!needs.length) throw new Error("backlink handoff has no needs");
for (const need of needs) {
  for (const key of ["targetUrl", "targetTitle", "priority", "risk", "suggestedAnchorText", "safeCitationSnippet", "doNotUseClaims"]) {
    if (need[key] === undefined) throw new Error(`backlink need missing ${key}`);
  }
  if (/guaranteed approval|credit repair service/i.test(need.safeCitationSnippet)) throw new Error(`unsafe handoff snippet for ${need.targetUrl}`);
}
console.log(`[validate:backlink-handoff] OK needs=${needs.length}`);
