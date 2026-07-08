#!/usr/bin/env node
import fs from 'node:fs';
function readJson(path){ return JSON.parse(fs.readFileSync(path,'utf8')); }
function writeJson(path,data){ fs.mkdirSync(path.split('/').slice(0,-1).join('/'),{recursive:true}); fs.writeFileSync(path, JSON.stringify(data,null,2)+'\n'); }
const policy = readJson('data/notifications/notification_policy.json');
const owner = readJson('data/admin/owner_exception_registry.json');
const blocks = readJson('data/automation/final_block_log.json');
const items = [
  ...(owner.items||[]).map(i=>({type:'owner_exception', severity:'immediate', channel:['github_issue','email_when_configured'], item:i})),
  ...(blocks.blocks||[]).map(i=>({type:'final_block', severity:'immediate', channel:['github_issue'], item:i}))
];
writeJson('data/notifications/notification_queue.json', {schemaVersion:'4.2.2', generatedAt:new Date().toISOString(), defaultPolicy:policy.default, items});
console.log(JSON.stringify({status:'NOTIFICATION_QUEUE_BUILT', items:items.length},null,2));
