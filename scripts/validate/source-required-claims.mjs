#!/usr/bin/env node
import { readJson } from '../lib/safe-harbor-utils.mjs';
const audit=readJson('data/governance/safe_harbor_audit_ledger.json',{decisions:[]});
for (const d of audit.decisions||[]) if (['SAFE_AUTOPUBLISH','REWRITTEN_AND_AUTOPUBLISHED'].includes(d.decision) && d.checks?.sourceRequiredClaims!=='pass') throw new Error(`autopublish has unsourced source-required claim ${d.path}`);
console.log('[validate:source-required-claims] OK');
