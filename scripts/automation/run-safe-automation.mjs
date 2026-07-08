#!/usr/bin/env node
import fs from 'node:fs';
const modeArg = process.argv.find(a=>a.startsWith('--mode=')); const mode = modeArg ? modeArg.split('=')[1] : 'dry_run';
const policy = JSON.parse(fs.readFileSync('data/automation/automation_policy.json','utf8'));
const entry = {at:new Date().toISOString(), mode, status:'NO_AUTO_CHANGES_APPLIED', allowedAutoSafeCount:policy.autoSafe.length, proofBoundary:'Regulated/legal/payment/download/prompt changes are never auto-published.'};
const log = JSON.parse(fs.readFileSync('data/automation/self_healing_log.json','utf8'));
log.entries.push(entry);
fs.writeFileSync('data/automation/self_healing_log.json', JSON.stringify(log,null,2)+'\n');
fs.writeFileSync('data/automation/republication_queue.json', JSON.stringify({schemaVersion:'4.2.0', mode, items:[]},null,2)+'\n');
fs.writeFileSync('data/automation/autopublish_audit_log.json', JSON.stringify({schemaVersion:'4.2.0', entries:[entry]},null,2)+'\n');
console.log(JSON.stringify(entry,null,2));
