#!/usr/bin/env node
import fs from 'node:fs';
const now = new Date().toISOString();
const schema = JSON.parse(fs.readFileSync('data/metrics/conversion_events_schema.json','utf8'));
const scoreboard = JSON.parse(fs.readFileSync('data/metrics/conversion_scoreboard.json','utf8'));
const report = {
  schemaVersion:'1.0.0',
  mode:'static_readiness',
  generatedAt:now,
  warning:'No live runtime conversion import is claimed here. Runtime events require deployed /api/track-event and D1 table availability.',
  summary:{
    allowedEvents:schema.allowedEvents.length,
    blockedFields:schema.blockedFields.length,
    scoreboardMetrics:(scoreboard.metrics || []).length,
    runtimeEndpoint:'/api/track-event',
    d1Table:'conversion_events'
  },
  events:[]
};
fs.writeFileSync('data/metrics/conversion_report.json', JSON.stringify(report,null,2)+'\n');
console.log('[metrics:conversion-report] OK mode=static_readiness');
