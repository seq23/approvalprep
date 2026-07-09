#!/usr/bin/env node
import { readJson } from '../lib/safe-harbor-utils.mjs';
const manifest=readJson('data/routes/route_manifest.json',{routes:[]}); const audit=readJson('data/governance/safe_harbor_audit_ledger.json',{decisions:[]}); const by=new Map((audit.decisions||[]).map(d=>[d.path,d]));
for (const r of manifest.routes||[]) if (r.safeHarborEligible && r.index!==false && !by.has(r.path)) throw new Error(`regulated public route missing Safe Harbor audit: ${r.path}`);
console.log(`[validate:safe-harbor-autopublish] OK audited=${audit.decisions.length}`);
