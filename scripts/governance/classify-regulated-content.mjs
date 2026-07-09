#!/usr/bin/env node
import { readJson, writeJson } from "../lib/safe-harbor-utils.mjs";
const policy=readJson('data/governance/regulated_autopublish_policy.json');
const manifest=readJson('data/routes/route_manifest.json',{routes:[]});
const pats=(policy.regulatedPathPatterns||[]).map(x=>new RegExp(x,'i'));
let changed=0;
for (const r of manifest.routes||[]) {
  const regulated = r.risk==='regulated'||r.risk==='high'||pats.some(re=>re.test(`${r.path} ${r.family||''} ${r.title||''}`));
  if (regulated && !r.safeHarborEligible) { r.safeHarborEligible=true; r.safeHarborRiskReason='regulated_path_or_family_pattern'; changed++; }
}
writeJson('data/routes/route_manifest.json', manifest);
console.log(`[governance:classify-regulated] OK changed=${changed}`);
