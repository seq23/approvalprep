#!/usr/bin/env node
import { readJson, textOf } from '../lib/safe-harbor-utils.mjs';
const audit=readJson('data/governance/safe_harbor_audit_ledger.json',{decisions:[]});
for (const d of audit.decisions||[]) if (['SAFE_AUTOPUBLISH','REWRITTEN_AND_AUTOPUBLISHED'].includes(d.decision) && d.checks?.requiredDisclosures!=='pass') throw new Error(`autopublish missing required disclosure ${d.path}`);
console.log('[validate:required-disclosures] OK');
