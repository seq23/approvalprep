#!/usr/bin/env node
import { decisionFor, validateRegistryDefinition, simulateSequence } from './orchestrator-lib.mjs';

function assert(condition, message) { if (!condition) throw new Error(`[validate:orchestrator-self-test] ${message}`); }
const hard = { id:'hard', npmScript:'validate:hard', entrypoint:'package.json', severity:'HARD_FAIL', blocksRelease:true, blockReason:'fixture' };
const warn = { id:'warn', npmScript:'validate:warn', entrypoint:'package.json', severity:'STRONG_WARNING', blocksRelease:false, blockReason:'fixture' };
const pkg = { scripts: { 'validate:hard':'node hard.js', 'validate:warn':'node warn.js' } };

assert(decisionFor(warn, 1) === 'WARN', 'warning failure must continue');
assert(decisionFor(hard, 1) === 'BLOCK', 'hard failure must block');
assert(decisionFor(hard, 0) === 'PASS', 'successful hard validator must pass');
let sim = simulateSequence([warn, warn], [1,1]);
assert(sim.blocked === false && sim.events.length === 2, 'multiple warnings must not block');
sim = simulateSequence([warn, hard, warn], [1,1,1]);
assert(sim.blocked === true && sim.events.length === 2, 'hard failure after warning must stop sequence');

const valid = { schemaVersion:'2.0.0', validators:[hard,warn] };
assert(validateRegistryDefinition(valid,pkg).length === 0, 'valid registry fixture rejected');
const duplicate = { schemaVersion:'2.0.0', validators:[hard,{...hard}] };
assert(validateRegistryDefinition(duplicate,pkg).some(e=>e.startsWith('duplicate_id:')), 'duplicate registry id not detected');
const missing = { schemaVersion:'2.0.0', validators:[{...hard,npmScript:'validate:missing'}] };
assert(validateRegistryDefinition(missing,pkg).some(e=>e.startsWith('missing_npm_script:')), 'missing npm script not detected');
const badWarning = { schemaVersion:'2.0.0', validators:[{...warn,blocksRelease:true}] };
assert(validateRegistryDefinition(badWarning,pkg).some(e=>e.startsWith('strong_warning_must_not_block:')), 'warning blocker inconsistency not detected');
console.log('[validate:orchestrator-self-test] OK 8 scenarios');
