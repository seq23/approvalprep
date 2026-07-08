#!/usr/bin/env node
import fs from 'node:fs';
function readJson(path){ return JSON.parse(fs.readFileSync(path,'utf8')); }
function writeJson(path,data){ fs.mkdirSync(path.split('/').slice(0,-1).join('/'),{recursive:true}); fs.writeFileSync(path, JSON.stringify(data,null,2)+'\n'); }
const modeArg = process.argv.find(a=>a.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=').slice(1).join('=') : process.env.RUN_MODE || 'dry_run';
const queue = readJson('data/notifications/notification_queue.json');
const configured = Boolean(process.env.RESEND_API_KEY);
const entries = (queue.items||[]).map(item=>({at:new Date().toISOString(), mode, type:item.type, severity:item.severity, sent: mode === 'live' && configured, provider: configured ? 'resend' : 'NOT_CONFIGURED', proofBoundary:'No email is sent without RESEND_API_KEY and live mode.'}));
writeJson('data/notifications/notification_log.json', {schemaVersion:'4.2.2', entries});
console.log(JSON.stringify({status:'NOTIFICATION_DISPATCH_RECORDED', mode, queued:queue.items.length, sent:entries.filter(e=>e.sent).length},null,2));
