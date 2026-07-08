#!/usr/bin/env node
import fs from 'node:fs';
function readJson(path){ return JSON.parse(fs.readFileSync(path,'utf8')); }
function writeJson(path,data){ fs.mkdirSync(path.split('/').slice(0,-1).join('/'),{recursive:true}); fs.writeFileSync(path, JSON.stringify(data,null,2)+'\n'); }
const queue = readJson('data/admin/content_queue_index.json');
const items = (queue.items||[]).filter(i=>i.delegatedStatus === 'owner_exception').map(i=>({title:i.title, route:i.publicPath, file:i.sourceFile, reason:i.nextAction, githubEditUrl:i.githubEditUrl, githubHistoryUrl:i.githubHistoryUrl}));
writeJson('data/admin/owner_exception_registry.json', {schemaVersion:'4.2.2', items});
console.log(JSON.stringify({status:'OWNER_EXCEPTION_INDEX_BUILT', items:items.length},null,2));
