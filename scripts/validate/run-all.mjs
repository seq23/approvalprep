#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { validateRegistryDefinition, decisionFor } from './orchestrator-lib.mjs';

const root = process.cwd();
const registry = JSON.parse(fs.readFileSync(path.join(root, '_repo_validation_registry.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const definitionErrors = validateRegistryDefinition(registry, pkg, root);
if (definitionErrors.length) {
  console.error(`[validate:all] registry definition invalid: ${definitionErrors.join(' | ')}`);
  process.exit(1);
}

const outDir = path.join(root, 'reports', 'validation');
fs.mkdirSync(outDir, { recursive:true });
const inventory = {
  schemaVersion:'1.0.0',
  orchestratorSource:'_repo_validation_registry.json',
  validatorCount:registry.validators.length,
  hardFailCount:registry.validators.filter(v=>v.severity==='HARD_FAIL').length,
  strongWarningCount:registry.validators.filter(v=>v.severity==='STRONG_WARNING').length,
  validators:registry.validators.map((v,index)=>({order:index+1,id:v.id,npmScript:v.npmScript,entrypoint:v.entrypoint,severity:v.severity,blocksRelease:v.blocksRelease,group:v.group||null})),
};
fs.writeFileSync(path.join(outDir,'execution-inventory.json'), JSON.stringify(inventory,null,2)+'\n');

const results = [];
function writeSummary(status) {
  const summary = {
    schemaVersion:'1.0.0',
    status,
    orchestratorSource:'_repo_validation_registry.json',
    executed:results.length,
    passed:results.filter(r=>r.decision==='PASS').length,
    warnings:results.filter(r=>r.decision==='WARN').length,
    hardFailures:results.filter(r=>r.decision==='BLOCK').length,
    results,
  };
  fs.writeFileSync(path.join(outDir,'validation-summary.json'), JSON.stringify(summary,null,2)+'\n');
}

for (const validator of registry.validators) {
  console.log(`\n[validate:all] ${validator.id} (${validator.severity}) -> npm run ${validator.npmScript}`);
  const started = Date.now();
  const result = spawnSync('npm', ['run','--silent',validator.npmScript], { stdio:'inherit', shell:false, cwd:root });
  const exitCode = Number.isInteger(result.status) ? result.status : 1;
  const decision = decisionFor(validator, exitCode);
  results.push({ id:validator.id, npmScript:validator.npmScript, severity:validator.severity, blocksRelease:validator.blocksRelease, exitCode, decision, durationMs:Date.now()-started });
  if (decision === 'BLOCK') {
    writeSummary('FAIL');
    console.error(`[validate:all] HARD FAIL ${validator.id}`);
    process.exit(exitCode || 1);
  }
  if (decision === 'WARN') console.warn(`[validate:all] STRONG WARNING ${validator.id}; continuing by policy`);
}
writeSummary(results.some(r=>r.decision==='WARN') ? 'PASS_WITH_WARNINGS' : 'PASS');
console.log(`[validate:all] OK validators=${results.length} warnings=${results.filter(r=>r.decision==='WARN').length}`);
