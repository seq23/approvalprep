#!/usr/bin/env node
import fs from 'node:fs';
import { readJson, fail } from './_common.mjs';
import { validateRegistryDefinition } from './orchestrator-lib.mjs';

const registry = readJson('_repo_validation_registry.json');
const dataRegistry = readJson('data/validation/validator_registry.json');
const matrix = readJson('_repo_validation_matrix.json');
const pkg = readJson('package.json');
const errors = validateRegistryDefinition(registry, pkg);
if (errors.length) fail(`[validation-registry] ${errors.join(' | ')}`);
if (dataRegistry.generatedFrom !== '_repo_validation_registry.json') fail('[validation-registry] data mirror does not declare canonical source');
if (JSON.stringify(registry.validators) !== JSON.stringify(dataRegistry.validators)) fail('[validation-registry] generated data mirror diverges from root canonical registry');

const ids = new Set(registry.validators.map(item=>item.id));
for (const [profile, validators] of Object.entries(matrix.profiles)) {
  if (profile === 'live_provider_smoke') continue;
  for (const id of validators) {
    if (id === 'build') continue;
    if (!ids.has(id)) fail(`[validation-registry] matrix references unknown validator ${id}`);
  }
}
for (const required of ['public-page-depth','atlas-query-fanout','seo-aeo-geo-surfaces','admin-dashboard','e2e-user-journey','product-flow-e2e','workflow-data-trace','automation-safety','runtime-product-admin','validator-orchestrator-self-test']) {
  if (!ids.has(required)) fail('[validation-registry] required validator missing '+required);
}
if (!fs.readFileSync('scripts/validate/run-all.mjs','utf8').includes("_repo_validation_registry.json")) fail('[validation-registry] run-all is not registry-driven');
console.log(`[validation-registry] OK validators=${registry.validators.length} hard=${registry.validators.filter(v=>v.severity==='HARD_FAIL').length} warnings=${registry.validators.filter(v=>v.severity==='STRONG_WARNING').length}`);
