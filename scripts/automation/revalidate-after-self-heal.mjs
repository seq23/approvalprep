#!/usr/bin/env node
import fs from 'node:fs';
function readJson(path){ return JSON.parse(fs.readFileSync(path,'utf8')); }
function writeJson(path,data){ fs.mkdirSync(path.split('/').slice(0,-1).join('/'),{recursive:true}); fs.writeFileSync(path, JSON.stringify(data,null,2)+'\n'); }
const attempts = readJson('data/automation/self_heal_attempts.json').attempts || [];
const finalBlocks = attempts.filter(a => a.canProgress === false).map(a => ({at:new Date().toISOString(), route:a.route, reason:'SELF_HEAL_FAILED', attempt:a}));
writeJson('data/automation/final_block_log.json', {schemaVersion:'4.2.2', blocks:finalBlocks});
const queue = readJson('data/automation/republication_queue.json');
queue.schemaVersion='4.2.2';
queue.items = attempts.filter(a=>a.canProgress).map(a=>({route:a.route, status:'self_healed_by_contract', source:'self_heal_revalidation', publishEligible:true, requiresOwner:false}));
writeJson('data/automation/republication_queue.json', queue);
console.log(JSON.stringify({status:'SELF_HEAL_REVALIDATED', attempts:attempts.length, finalBlocks:finalBlocks.length, publishEligible:queue.items.length},null,2));
