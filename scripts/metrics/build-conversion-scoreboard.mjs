#!/usr/bin/env node
import fs from 'node:fs';
function read(file, fallback){ try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch { return fallback; } }
const schema = read('data/metrics/conversion_events_schema.json', { allowedEvents:[], blockedFields:[] });
const report = read('data/metrics/conversion_report.json', { summary:{ liveEventsImported:0 } });
const downloadProof = read('reports/ops/local-checkout-download-e2e.json', {});
const metrics = [
  { label:'Allowed privacy-safe event types', value:schema.allowedEvents?.length || 0, source:'conversion_events_schema', claimType:'structural' },
  { label:'Blocked sensitive fields', value:schema.blockedFields?.length || 0, source:'conversion_events_schema', claimType:'structural' },
  { label:'Live conversion events imported', value:report.summary?.liveEventsImported || 0, source:'conversion_report', claimType:'live_or_zero' },
  { label:'Runtime tracking endpoint present', value:fs.existsSync('functions/api/track-event.js') ? 1 : 0, source:'functions/api/track-event.js', claimType:'structural' },
  { label:'Checkout/download E2E proof present', value:(downloadProof.status || downloadProof.result) ? 1 : 0, source:'reports/ops/local-checkout-download-e2e.json', claimType:'proof_artifact' }
];
fs.writeFileSync('data/metrics/conversion_scoreboard.json', JSON.stringify({ schemaVersion:'1.0.0', generatedAt:new Date().toISOString(), warning:'Conversion tracking is privacy-safe structural instrumentation. Live conversion volume is not claimed without deployed runtime events.', metrics }, null, 2)+'\n');
console.log('[metrics:conversion-scoreboard] OK');
