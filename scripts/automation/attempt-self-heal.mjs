#!/usr/bin/env node
// Triage the delegated-authority queue and PROPOSE a repair for each route.
//
// What this is and is not
// -----------------------
// This stage repairs nothing. It reads data/admin/content_queue_index.json,
// matches each contract-blocked route against
// data/governance/delegated_authority_contract.json, and records which approved
// rewrite WOULD apply. That is triage, and it is genuinely useful, but it is not
// a repair and it used to be written down as one: every row carried
// `result: 'SELF_HEAL_ATTEMPTED_FIXTURE_SAFE'` and `canProgress: true`, and
// revalidate-after-self-heal.mjs then wrote those same routes into
// data/automation/republication_queue.json as `self_healed_by_contract` with
// `publishEligible: true` - a page marked healed and publishable when not one
// byte of it had been touched. The contract this stage reads lists
// `publish_fixture_data_as_real` under absoluteForbidden. It was doing that to
// itself.
//
// The actual repair loop is scripts/selfheal/heal-until-clean.mjs (`npm run
// selfheal`), which runs the 112-validator registry chain, executes the
// repairCommand each blocking validator declares, and re-validates. That is what
// the release workflow now runs. This file keeps its place in the chain only
// because data/automation/self_heal_attempts.json is a real input:
// scripts/validate/self-heal-progressions.mjs reads it, and
// revalidate-after-self-heal.mjs derives final_block_log.json from it. So it
// stays - as a proposal ledger that says so in every field.
//
// Rule 0: this stage never exits 0 having quietly done nothing. It ends on a
// named outcome - PROPOSALS_RECORDED or NO_QUEUE_ITEMS_ELIGIBLE - and prints it.
import fs from 'node:fs';
function readJson(path){ return JSON.parse(fs.readFileSync(path,'utf8')); }
function writeJson(path,data){ fs.mkdirSync(path.split('/').slice(0,-1).join('/'),{recursive:true}); fs.writeFileSync(path, JSON.stringify(data,null,2)+'\n'); }
const modeArg = process.argv.find(a=>a.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=').slice(1).join('=') : process.env.RUN_MODE || 'dry_run';
const contract = readJson('data/governance/delegated_authority_contract.json');
const queue = readJson('data/admin/content_queue_index.json');
const REPAIRED_BY = 'npm run selfheal (scripts/selfheal/heal-until-clean.mjs)';
const attemptable = (queue.items||[]).filter(item => ['blocked_by_contract','self_heal_allowed'].includes(item.delegatedStatus));
const attempts = attemptable.map(item => {
  const text = `${item.title||''} ${item.publicPath||''}`.toLowerCase().replaceAll('_',' ');
  const forbidden = contract.absoluteForbidden.find(rule => text.includes(rule.replaceAll('_',' ')));
  const issue = forbidden ? `${forbidden}_safe_alternative` : 'generic_repairable_issue';
  const repair = forbidden && contract.safeRewrites[forbidden] ? contract.safeRewrites[forbidden] : 'apply approved plain-language, source, disclaimer, merge, or utility-page repair';
  return {
    at:new Date().toISOString(), mode, title:item.title, route:item.publicPath, issue,
    proposedRepair:repair,
    originalStatus:item.delegatedStatus,
    result:'REPAIR_PROPOSED_NOT_APPLIED',
    // The contract permits this route to progress once a repair is actually
    // applied. It is not a statement that one was.
    canProgress:true,
    applied:false,
    appliedRepairAvailableFrom:REPAIRED_BY,
  };
});
writeJson('data/automation/self_heal_attempts.json', {
  schemaVersion:'4.3.0',
  stage:'triage_only',
  appliesRepairs:false,
  repairsAppliedBy:REPAIRED_BY,
  attempts,
});
const log = readJson('data/automation/self_healing_log.json');
log.schemaVersion = '4.3.0';
log.entries = [...(log.entries||[]), ...attempts.map(a=>({at:a.at, mode, status:'SELF_HEAL_ATTEMPTED', route:a.route, result:a.result}))];
writeJson('data/automation/self_healing_log.json', log);

// A named terminal outcome on every path. An empty queue is a legitimate stop,
// but it is stated rather than passed over in silence.
const outcome = attempts.length ? 'PROPOSALS_RECORDED' : 'NO_QUEUE_ITEMS_ELIGIBLE';
const reason = attempts.length
  ? `${attempts.length} contract-blocked route(s) matched an approved rewrite; none applied here`
  : `no item in data/admin/content_queue_index.json carries delegatedStatus blocked_by_contract or self_heal_allowed (${(queue.items||[]).length} item(s) scanned)`;
console.log(JSON.stringify({status:'SELF_HEAL_PROPOSALS_RECORDED', outcome, reason, mode, proposals:attempts.length, appliesRepairs:false, repairsAppliedBy:REPAIRED_BY},null,2));
