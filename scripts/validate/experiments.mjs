#!/usr/bin/env node
import { readJson, exists, fail } from './_common.mjs';
const registry = readJson('data/experiments/experiment_registry.json');
const results = readJson('data/experiments/experiment_results.json');
if (!Array.isArray(registry.experiments)) fail('[experiments] registry experiments missing');
const ids = new Set();
for (const exp of registry.experiments) {
  if (!exp.id || !exp.status || !exp.surface || !Array.isArray(exp.variants) || exp.variants.length < 2) fail('[experiments] incomplete experiment '+(exp.id||''));
  if (ids.has(exp.id)) fail('[experiments] duplicate id '+exp.id); ids.add(exp.id);
  if (exp.status !== 'approved' && exp.autoApplyEligible === true) fail('[experiments] non-approved experiment cannot auto apply '+exp.id);
  if (exp.requiresApproval !== true) fail('[experiments] experiments must be approval-gated '+exp.id);
}
if (results.mode !== 'no_live_results_yet') fail('[experiments] results must not imply live proof yet');
if (!exists('scripts/experiments/build-experiment-queue.mjs') || !exists('scripts/experiments/apply-approved-experiments.mjs')) fail('[experiments] scripts missing');
console.log(`[experiments] OK experiments=${registry.experiments.length}`);
