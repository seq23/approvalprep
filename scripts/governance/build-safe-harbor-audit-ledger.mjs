#!/usr/bin/env node
import { readJson, writeJson } from "../lib/safe-harbor-utils.mjs";
const ledger=readJson('data/governance/safe_harbor_audit_ledger.json',{decisions:[]});
const map=new Map(); for (const d of ledger.decisions||[]) map.set(d.contentId,d);
ledger.decisions=[...map.values()]; ledger.summary={}; for (const d of ledger.decisions) ledger.summary[d.decision]=(ledger.summary[d.decision]||0)+1;
ledger.generatedAt=new Date().toISOString(); writeJson('data/governance/safe_harbor_audit_ledger.json',ledger);
console.log(`[governance:safe-harbor-audit] OK decisions=${ledger.decisions.length}`);
