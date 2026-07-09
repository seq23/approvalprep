#!/usr/bin/env node
import fs from 'node:fs';
const registry = JSON.parse(fs.readFileSync('data/experiments/experiment_registry.json','utf8'));
const results = JSON.parse(fs.readFileSync('data/experiments/experiment_results.json','utf8'));
results.generatedAt = new Date().toISOString();
results.queuedCandidates = registry.experiments.filter((item) => item.status === 'candidate').map((item) => ({ id:item.id, surface:item.surface, requiresApproval:item.requiresApproval, autoApplyEligible:item.autoApplyEligible }));
fs.writeFileSync('data/experiments/experiment_results.json', JSON.stringify(results,null,2)+'\n');
console.log(`[experiments:queue] OK candidates=${results.queuedCandidates.length}`);
