#!/usr/bin/env node
import fs from 'node:fs';
const queue = JSON.parse(fs.readFileSync('data/admin/content_queue_index.json','utf8'));
if(!Array.isArray(queue.items) || queue.items.length === 0){ console.error('[admin-action-links] Queue is empty'); process.exit(1); }
for(const item of queue.items){
  for(const f of ['githubEditUrl','githubHistoryUrl','sourceFile','publishDateField']) if(!item[f]) { console.error(`[admin-action-links] ${item.id} missing ${f}`); process.exit(1); }
  if(!item.githubEditUrl.includes('/edit/') || !item.githubHistoryUrl.includes('/commits/')) { console.error(`[admin-action-links] ${item.id} has invalid GitHub links`); process.exit(1); }
}
const registry = JSON.parse(fs.readFileSync('data/admin/admin_action_registry.json','utf8'));
if(registry.realBackendWriteback !== false){ console.error('[admin-action-links] V1 must not imply backend writeback'); process.exit(1); }
console.log('[admin-action-links] OK');
