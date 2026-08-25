#!/usr/bin/env node
// Validate -> repair -> re-validate, until clean or out of attempts.
//
// Why this exists
// ---------------
// This repo already owned every piece of a self-healing release except the loop
// that connects them. `scripts/validate/run-all.mjs` runs all 106 registry
// validators and stops at the first HARD_FAIL. Several repairs for exactly those
// failures already exist in package.json (`validation:registry:sync`,
// `content:self-heal-citation-os`, the `automation:self-heal-*` pair,
// `governance:safe-harbor-rewrite`) and had never been wired to the validator
// that detects the defect they fix. A human had to read the failure, remember
// which repair applied, run it, and re-run validation by hand.
//
// This runs the registry chain, reads which validators blocked from the summary
// the orchestrator already writes, runs the repair each blocking validator
// declares in _repo_validation_registry.json (`repairCommand`), and re-validates.
// It stops early when clean, and stops when a pass produces no repairable
// failure - looping again would just repeat the same result.
//
//   node scripts/selfheal/heal-until-clean.mjs [--max 3] [--dry-run]
//
// Exit 0 means the chain is green and it is safe to push. Non-zero means it is
// not, and reports/validation/self-heal-loop.json names what could not be healed.
//
// Note on attempts: run-all.mjs is fail-fast, so one pass surfaces at most one
// HARD_FAIL. A tree with N independent repairable defects therefore needs N+1
// attempts. --max is clamped to 10 for that reason; the default stays 3.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const MAX = Math.max(1, Math.min(10, Number(arg('--max', '3')) || 3));
const DRY = argv.includes('--dry-run');

const registry = JSON.parse(fs.readFileSync(path.join(ROOT, '_repo_validation_registry.json'), 'utf8'));
const repairFor = new Map(
  (registry.validators || [])
    .filter((v) => v.repairCommand)
    .map((v) => [v.id, v.repairCommand]),
);

const run = (cmd) => {
  const started = Date.now();
  const r = spawnSync(cmd, { cwd: ROOT, shell: true, encoding: 'utf8', env: process.env });
  return { cmd, code: r.status ?? 1, out: `${r.stdout || ''}${r.stderr || ''}`, ms: Date.now() - started };
};

// The orchestrator writes a machine-readable summary on both PASS and FAIL.
// Prefer it over parsing console output, which differs per validator.
function readSummary() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'reports/validation/validation-summary.json'), 'utf8'));
  } catch {
    return null;
  }
}

const attempts = [];
let clean = false;
let lastWarnings = [];

for (let attempt = 1; attempt <= MAX; attempt += 1) {
  const validate = run('npm run --silent validate:all');
  process.stdout.write(validate.out);
  const summary = readSummary();
  const blocked = (summary?.results || []).filter((r) => r.decision === 'BLOCK').map((r) => r.id);
  lastWarnings = (summary?.results || []).filter((r) => r.decision === 'WARN').map((r) => r.id);

  if (validate.code === 0) {
    attempts.push({ attempt, blocked: [], repaired: [], result: 'CLEAN' });
    clean = true;
    console.log(`[self-heal] clean on attempt ${attempt}${lastWarnings.length ? ` (${lastWarnings.length} non-blocking warning(s))` : ''}`);
    break;
  }

  // A non-zero exit with no BLOCK row means the chain died before or outside a
  // validator (bad registry definition, crashed orchestrator). Nothing to repair.
  if (!blocked.length) {
    console.error('[self-heal] validation failed without a BLOCK row in the summary; not a repairable validator failure');
    attempts.push({ attempt, blocked: [], repaired: [], result: 'VALIDATION_FAILED_OUTSIDE_VALIDATORS', exitCode: validate.code });
    break;
  }

  const repairable = blocked.filter((id) => repairFor.has(id));
  const unrepairable = blocked.filter((id) => !repairFor.has(id));
  console.log(`[self-heal] attempt ${attempt}: ${blocked.length} blocking (${repairable.length} repairable)`);
  for (const id of unrepairable) console.log(`  no registered repair: ${id}`);

  if (!repairable.length) {
    // Nothing would change, so another pass fails identically. Stop and say so
    // rather than burning attempts to reach the same place.
    attempts.push({ attempt, blocked, repaired: [], result: 'NO_REPAIR_AVAILABLE' });
    break;
  }

  const repaired = [];
  for (const id of repairable) {
    const cmd = repairFor.get(id);
    if (DRY) { console.log(`  would repair ${id}: ${cmd}`); repaired.push({ id, cmd, code: 0, dryRun: true }); continue; }
    console.log(`  repairing ${id}: ${cmd}`);
    const r = run(cmd);
    if (r.code !== 0) console.log(`  repair FAILED for ${id} (exit ${r.code})`);
    repaired.push({ id, cmd, code: r.code });
  }
  attempts.push({ attempt, blocked, repaired, result: 'REPAIRED_RETRYING' });
  if (DRY) break;
}

const report = {
  schemaVersion: '1.0.0',
  generatedAt: new Date().toISOString(),
  validationCommand: 'npm run validate:all',
  registrySource: '_repo_validation_registry.json',
  maxAttempts: MAX,
  dryRun: DRY,
  declaredRepairs: Object.fromEntries(repairFor),
  status: clean ? 'CLEAN' : 'NOT_CLEAN',
  safeToPush: clean,
  nonBlockingWarnings: lastWarnings,
  attempts,
};
fs.mkdirSync(path.join(ROOT, 'reports/validation'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'reports/validation/self-heal-loop.json'), `${JSON.stringify(report, null, 2)}\n`);

if (!clean) {
  console.error(`[self-heal] NOT CLEAN after ${attempts.length} attempt(s) - refusing to declare the tree publishable.`);
  console.error('  see reports/validation/self-heal-loop.json');
  process.exit(1);
}
console.log('[self-heal] safe to push');
