#!/usr/bin/env node
import fs from 'node:fs';
const snapshot = JSON.parse(fs.readFileSync('data/health/growth_health_snapshot.json','utf8'));
if(!Array.isArray(snapshot.panels) || snapshot.panels.length < 5){ console.error('[growth-health] Missing health panels'); process.exit(1); }
for(const panel of snapshot.panels){
  for(const field of ['name','score','status','reason','nextAction','autoFixPossible','approvalRequired']) if(panel[field] === undefined){ console.error(`[growth-health] ${panel.name||'panel'} missing ${field}`); process.exit(1); }
  if(typeof panel.score !== 'number' || panel.score < 0 || panel.score > 100){ console.error(`[growth-health] ${panel.name} invalid score`); process.exit(1); }
}
console.log('[growth-health] OK');
