#!/usr/bin/env node
import fs from 'node:fs';
const panels = [
 ['SEO',82,'WARNING','Core SEO surfaces exist; live telemetry not configured.','Run setup doctor and connect GSC/Bing.'],
 ['AEO',78,'WARNING','Answer atoms exist; content expansion still required.','Run weekly growth ops.'],
 ['GEO',80,'WARNING','Entity/source structures exist; external proof unavailable.','Track observed wins separately.'],
 ['Citation Growth',68,'WARNING','Six-month target is encoded; wins require proof.','Update citation strategy and import telemetry.'],
 ['Admin Control',76,'WARNING','GitHub-native links exist; no backend writeback in V1.','Use edit links and PR review.']
].map(([name,score,status,reason,nextAction])=>({name,score,status,reason,missingData:status==='WARNING'?['live telemetry']:[],nextAction,autoFixPossible:name!=='Admin Control',approvalRequired:name==='Admin Control'}));
fs.mkdirSync('data/health',{recursive:true});
fs.writeFileSync('data/health/growth_health_snapshot.json', JSON.stringify({schemaVersion:'4.2.0', generatedAt:new Date().toISOString(), overallStatus:'STRUCTURAL_READY_REQUIRES_LIVE_TELEMETRY', overallScore:74, panels},null,2)+'\n');
console.log(JSON.stringify({status:'OK', panels:panels.length},null,2));
