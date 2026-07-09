#!/usr/bin/env node
import { readJson, writeJson } from "../lib/safe-harbor-utils.mjs";
const reg=readJson('data/governance/prohibited_claims_registry.json');
const ledger=readJson('data/governance/safe_harbor_rewrite_ledger.json',{schemaVersion:'1.0.0',rewrites:[]});
const copy=readJson('data/content/generated_route_copy.json',{routes:{}});
let count=0;
for (const [path,obj] of Object.entries(copy.routes||{})) {
  let s=JSON.stringify(obj); const before=s;
  for (const p of reg.rewriteablePatterns||[]) s=s.replace(new RegExp(p.pattern,'ig'), p.replacement);
  if (s!==before) { copy.routes[path]=JSON.parse(s); ledger.rewrites.push({contentId:path,path,beforeHash:before.length,afterHash:s.length,rewrittenAt:new Date().toISOString()}); count++; }
}
ledger.generatedAt=new Date().toISOString(); writeJson('data/content/generated_route_copy.json',copy); writeJson('data/governance/safe_harbor_rewrite_ledger.json',ledger);
console.log(`[governance:safe-harbor-rewrite] OK rewrites=${count}`);
