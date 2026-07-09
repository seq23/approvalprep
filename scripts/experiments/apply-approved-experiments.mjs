#!/usr/bin/env node
import fs from 'node:fs';
const registry = JSON.parse(fs.readFileSync('data/experiments/experiment_registry.json','utf8'));
const approved = registry.experiments.filter((item) => item.status === 'approved' && item.autoApplyEligible === true);
const trace = { schemaVersion:'1.0.0', generatedAt:new Date().toISOString(), applied:[], skipped:registry.experiments.length - approved.length, rule:'Only approved and autoApplyEligible experiments can be applied. Batch 9 ships no automatic copy mutations.' };
fs.writeFileSync('data/workflow_traces/experiments-application.json', JSON.stringify(trace,null,2)+'\n');
console.log(`[experiments:apply-approved] OK applied=${trace.applied.length} skipped=${trace.skipped}`);
