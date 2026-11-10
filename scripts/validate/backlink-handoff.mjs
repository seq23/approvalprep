#!/usr/bin/env node
// validate:backlink-handoff (restored 10 Nov 2026, hostile review: claim safety only).
// Every backlink need's safeCitationSnippet never says "guaranteed approval" or "credit repair
// service", and every need carries doNotUseClaims. Zero needs fails.
import fs from "node:fs";
const file = "data/backlink_handoff/backlink_needs.json";
if (!fs.existsSync(file)) throw new Error(`${file} missing`);
const needs = JSON.parse(fs.readFileSync(file, "utf8")).needs || [];
if (!needs.length) throw new Error("backlink handoff has no needs");
const errors = [];
for (const need of needs) {
  if (need.doNotUseClaims === undefined) errors.push(`backlink need ${need.targetUrl} missing doNotUseClaims`);
  if (typeof need.safeCitationSnippet !== "string") errors.push(`backlink need ${need.targetUrl} has no safeCitationSnippet`);
  else if (/guaranteed approval|credit repair service/i.test(need.safeCitationSnippet)) errors.push(`unsafe handoff snippet for ${need.targetUrl}: says "guaranteed approval" or "credit repair service"`);
}
if (errors.length) { console.error(`[validate:backlink-handoff] FAIL\n- ${errors.join("\n- ")}`); process.exit(1); }
console.log(`[validate:backlink-handoff] OK needs=${needs.length}`);
