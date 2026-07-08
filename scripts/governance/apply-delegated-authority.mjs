#!/usr/bin/env node
import fs from 'node:fs';
function readJson(path){ return JSON.parse(fs.readFileSync(path,'utf8')); }
function writeJson(path,data){ fs.mkdirSync(path.split('/').slice(0,-1).join('/'),{recursive:true}); fs.writeFileSync(path, JSON.stringify(data,null,2)+'\n'); }
const modeArg = process.argv.find(a=>a.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=').slice(1).join('=') : process.env.RUN_MODE || 'dry_run';
const contract = readJson('data/governance/delegated_authority_contract.json');
const queuePath = 'data/admin/content_queue_index.json';
const queue = readJson(queuePath);
const items = Array.isArray(queue.items) ? queue.items : [];
const decisions = items.map(item => {
  const text = `${item.title||''} ${item.publicPath||''} ${item.riskLevel||''} ${item.status||''}`.toLowerCase().replaceAll('_',' ');
  const ownerException = contract.ownerExceptions.find(rule => text.includes(rule.replaceAll('_',' ')));
  const forbidden = contract.absoluteForbidden.find(rule => text.includes(rule.replaceAll('_',' ')));
  let delegatedStatus = 'approved_by_contract';
  let nextAction = 'execute_and_log';
  if (ownerException) { delegatedStatus = 'owner_exception'; nextAction = 'create_owner_exception'; }
  else if (forbidden) { delegatedStatus = 'blocked_by_contract'; nextAction = 'attempt_safe_alternative_before_final_block'; }
  else if ((item.riskLevel||'').toLowerCase() === 'high') { delegatedStatus = 'self_heal_allowed'; nextAction = 'attempt_self_heal_then_revalidate'; }
  return {...item, delegatedStatus, nextAction, decidedBy:'delegated_authority_contract_v4.2.2'};
});
writeJson(queuePath, {...queue, schemaVersion:'4.2.2', contractMode:mode, items:decisions});
const ownerExceptions = decisions.filter(d=>d.delegatedStatus === 'owner_exception').map(d=>({at:new Date().toISOString(), title:d.title, route:d.publicPath, reason:d.nextAction, sourceFile:d.sourceFile, githubEditUrl:d.githubEditUrl, githubHistoryUrl:d.githubHistoryUrl}));
writeJson('data/admin/owner_exception_registry.json', {schemaVersion:'4.2.2', items:ownerExceptions});
console.log(JSON.stringify({status:'DELEGATED_AUTHORITY_APPLIED', mode, items:decisions.length, ownerExceptions:ownerExceptions.length},null,2));
