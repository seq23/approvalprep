#!/usr/bin/env node
// Derive the final-block log and the republication queue from the triage
// proposals written by attempt-self-heal.mjs.
//
// This revalidates nothing - it never did. It reads a proposal ledger and
// reshapes it. It used to mark every proposed route `self_healed_by_contract`
// and `publishEligible: true`, which asserted a repair that had not happened;
// the queue now says `self_heal_proposed_by_contract` and `publishEligible:
// false`, because the stage that actually applies a repair and then re-runs the
// validator registry is `npm run selfheal`
// (scripts/selfheal/heal-until-clean.mjs), which the release workflow runs.
//
// Rule 0: ends on a named outcome and prints it, including when the proposal
// ledger is empty.
import fs from 'node:fs';
function readJson(path){ return JSON.parse(fs.readFileSync(path,'utf8')); }
function writeJson(path,data){ fs.mkdirSync(path.split('/').slice(0,-1).join('/'),{recursive:true}); fs.writeFileSync(path, JSON.stringify(data,null,2)+'\n'); }
const attempts = readJson('data/automation/self_heal_attempts.json').attempts || [];
const finalBlocks = attempts.filter(a => a.canProgress === false).map(a => ({at:new Date().toISOString(), route:a.route, reason:'SELF_HEAL_FAILED', attempt:a}));
writeJson('data/automation/final_block_log.json', {schemaVersion:'4.3.0', blocks:finalBlocks});
const queue = readJson('data/automation/republication_queue.json');
queue.schemaVersion='4.3.0';
queue.items = attempts.filter(a=>a.canProgress).map(a=>({
  route:a.route,
  status:'self_heal_proposed_by_contract',
  source:'self_heal_triage',
  publishEligible:false,
  publishBlockedReason:'proposal only - no repair applied by this stage',
  requiresOwner:false,
}));
writeJson('data/automation/republication_queue.json', queue);

const outcome = attempts.length ? 'DERIVED_FROM_PROPOSALS' : 'NO_PROPOSALS_TO_DERIVE_FROM';
const reason = attempts.length
  ? `${attempts.length} proposal(s) reshaped into ${finalBlocks.length} final block(s) and ${queue.items.length} queued route(s)`
  : 'data/automation/self_heal_attempts.json carried no proposals, so both derived files were written empty';
console.log(JSON.stringify({status:'SELF_HEAL_PROPOSALS_DERIVED', outcome, reason, appliesRepairs:false, proposals:attempts.length, finalBlocks:finalBlocks.length, queued:queue.items.length},null,2));
