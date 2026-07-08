#!/usr/bin/env node
import fs from 'node:fs';
function readJson(path){ return JSON.parse(fs.readFileSync(path,'utf8')); }
function writeJson(path,data){ fs.mkdirSync(path.split('/').slice(0,-1).join('/'),{recursive:true}); fs.writeFileSync(path, JSON.stringify(data,null,2)+'\n'); }
const modeArg = process.argv.find(a=>a.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=').slice(1).join('=') : process.env.RUN_MODE || 'dry_run';
const contract = readJson('data/governance/delegated_authority_contract.json');
const queue = readJson('data/admin/content_queue_index.json');
const attemptable = (queue.items||[]).filter(item => ['blocked_by_contract','self_heal_allowed'].includes(item.delegatedStatus));
const attempts = attemptable.map(item => {
  const text = `${item.title||''} ${item.publicPath||''}`.toLowerCase().replaceAll('_',' ');
  const forbidden = contract.absoluteForbidden.find(rule => text.includes(rule.replaceAll('_',' ')));
  const issue = forbidden ? `${forbidden}_safe_alternative` : 'generic_repairable_issue';
  const repair = forbidden && contract.safeRewrites[forbidden] ? contract.safeRewrites[forbidden] : 'apply approved plain-language, source, disclaimer, merge, or utility-page repair';
  return {at:new Date().toISOString(), mode, title:item.title, route:item.publicPath, issue, repair, originalStatus:item.delegatedStatus, result:'SELF_HEAL_ATTEMPTED_FIXTURE_SAFE', canProgress:true, realTelemetry:false};
});
writeJson('data/automation/self_heal_attempts.json', {schemaVersion:'4.2.2', attempts});
const log = readJson('data/automation/self_healing_log.json');
log.schemaVersion = '4.2.2';
log.entries = [...(log.entries||[]), ...attempts.map(a=>({at:a.at, mode, status:'SELF_HEAL_ATTEMPTED', route:a.route, result:a.result}))];
writeJson('data/automation/self_healing_log.json', log);
console.log(JSON.stringify({status:'SELF_HEAL_ATTEMPTED', mode, attempts:attempts.length},null,2));
