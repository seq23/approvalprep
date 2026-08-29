#!/usr/bin/env node
// Validate -> repair -> re-validate, until clean or out of attempts.
//
// Why this exists
// ---------------
// This repo already owned every piece of a self-healing release except the loop
// that connects them. `scripts/validate/run-all.mjs` runs all 112 registry
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

// Named terminal outcomes.
//
// Rule 0 for this stage: it never exits 0 having done nothing silently. Either
// it repaired something, or it names why it legitimately stopped. "Clean on the
// first pass" is a real, common and legitimate outcome - but it is reported
// under its own name (CLEAN_NO_REPAIR_NEEDED) so a reader can tell it apart
// from CLEAN_AFTER_REPAIR, and so a lane that never once repairs anything is
// visible as such in reports/validation/self-heal-loop.json rather than looking
// like a working self-healer.
//
// NO_REPAIR_AVAILABLE is expected, not exceptional: only 4 of the 112 registry
// validators declare a repairCommand, so most blocking failures have no
// registered repair and the loop must say that in those words - it is neither a
// pass nor a crash. It exits non-zero because the tree is genuinely not
// publishable, and prints the blocking validator ids plus the repair coverage so
// the outcome reads as a diagnosis rather than a stack trace.
const OUTCOME = {
  CLEAN_NO_REPAIR_NEEDED: 'CLEAN_NO_REPAIR_NEEDED',
  CLEAN_AFTER_REPAIR: 'CLEAN_AFTER_REPAIR',
  NO_REPAIR_AVAILABLE: 'NO_REPAIR_AVAILABLE',
  REPAIR_RAN_STILL_BLOCKED: 'REPAIR_RAN_STILL_BLOCKED',
  VALIDATION_FAILED_OUTSIDE_VALIDATORS: 'VALIDATION_FAILED_OUTSIDE_VALIDATORS',
  MAX_ATTEMPTS_EXHAUSTED: 'MAX_ATTEMPTS_EXHAUSTED',
  DRY_RUN_PLANNED: 'DRY_RUN_PLANNED',
};

const repairCoverage = {
  validatorsInRegistry: (registry.validators || []).length,
  validatorsDeclaringRepair: repairFor.size,
  note: 'Most validators declare no repairCommand, so NO_REPAIR_AVAILABLE is a legitimate, expected stop rather than a defect in this loop.',
};

// data/self_healing/self_heal_ledger.json is the repo's named self-heal ledger
// and, before this, nothing in the tree ever wrote a line into it: it sat at
// `entries: []` from 2026-07-09 while this loop demonstrably applied real
// repairs (registry mirror resync, safe-harbor rewrite, atlas admission and
// query regeneration, automation-state rebuild). The only record was
// reports/validation/self-heal-loop.json, which is overwritten every run and so
// keeps no history at all. The ledger now records each run that actually ran a
// repair - and only those, so it stays a record of repairs rather than a log of
// green runs.
const LEDGER_PATH = path.join(ROOT, 'data/self_healing/self_heal_ledger.json');
const runId = `selfheal_${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}_${process.pid}`;

const attempts = [];
let clean = false;
let outcome = null;
let lastBlocked = [];
let lastWarnings = [];
let repairsRun = 0;

for (let attempt = 1; attempt <= MAX; attempt += 1) {
  const validate = run('npm run --silent validate:all');
  process.stdout.write(validate.out);
  const summary = readSummary();
  const blocked = (summary?.results || []).filter((r) => r.decision === 'BLOCK').map((r) => r.id);
  lastWarnings = (summary?.results || []).filter((r) => r.decision === 'WARN').map((r) => r.id);

  lastBlocked = blocked;

  if (validate.code === 0) {
    attempts.push({ attempt, blocked: [], repaired: [], result: 'CLEAN' });
    clean = true;
    outcome = repairsRun ? OUTCOME.CLEAN_AFTER_REPAIR : OUTCOME.CLEAN_NO_REPAIR_NEEDED;
    console.log(`[self-heal] clean on attempt ${attempt}${lastWarnings.length ? ` (${lastWarnings.length} non-blocking warning(s))` : ''}`);
    break;
  }

  // A non-zero exit with no BLOCK row means the chain died before or outside a
  // validator (bad registry definition, crashed orchestrator). Nothing to repair.
  if (!blocked.length) {
    console.error('[self-heal] validation failed without a BLOCK row in the summary; not a repairable validator failure');
    attempts.push({ attempt, blocked: [], repaired: [], result: 'VALIDATION_FAILED_OUTSIDE_VALIDATORS', exitCode: validate.code });
    outcome = OUTCOME.VALIDATION_FAILED_OUTSIDE_VALIDATORS;
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
    outcome = repairsRun ? OUTCOME.REPAIR_RAN_STILL_BLOCKED : OUTCOME.NO_REPAIR_AVAILABLE;
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
    repairsRun += 1;
  }
  attempts.push({ attempt, blocked, repaired, result: 'REPAIRED_RETRYING' });
  if (DRY) { outcome = OUTCOME.DRY_RUN_PLANNED; break; }
}

// Falling out of the loop without an outcome means the last pass repaired
// something and there were no attempts left to revalidate it. That is not a
// pass and not a crash either; it is its own named stop.
if (!outcome) outcome = OUTCOME.MAX_ATTEMPTS_EXHAUSTED;

const appliedRepairs = attempts.flatMap((a) => (a.repaired || []).filter((r) => !r.dryRun).map((r) => ({ attempt: a.attempt, id: r.id, cmd: r.cmd, exitCode: r.code })));

const report = {
  schemaVersion: '1.1.0',
  runId,
  generatedAt: new Date().toISOString(),
  validationCommand: 'npm run validate:all',
  registrySource: '_repo_validation_registry.json',
  maxAttempts: MAX,
  dryRun: DRY,
  declaredRepairs: Object.fromEntries(repairFor),
  status: clean ? 'CLEAN' : 'NOT_CLEAN',
  outcome,
  repairsRun,
  repairCoverage,
  blockingAtStop: clean ? [] : lastBlocked,
  unrepairableAtStop: clean ? [] : lastBlocked.filter((id) => !repairFor.has(id)),
  safeToPush: clean,
  nonBlockingWarnings: lastWarnings,
  attempts,
};

// Append to the ledger only when a repair actually ran. A clean pass earns no
// ledger entry, and the report says which of the two happened rather than
// leaving a reader to assume.
let ledgerEntryAppended = false;
if (appliedRepairs.length) {
  const ledger = (() => {
    try { return JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8')); }
    catch { return { schemaVersion: '1.0.0', entries: [] }; }
  })();
  ledger.schemaVersion = '2.0.0';
  ledger.generatedAt = new Date().toISOString();
  ledger.entries = [...(ledger.entries || []), {
    runId,
    at: new Date().toISOString(),
    outcome,
    status: clean ? 'CLEAN' : 'NOT_CLEAN',
    attempts: attempts.length,
    repairs: appliedRepairs,
    blockingAtStop: clean ? [] : lastBlocked,
  }];
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
  fs.writeFileSync(LEDGER_PATH, `${JSON.stringify(ledger, null, 2)}\n`);
  ledgerEntryAppended = true;
}
report.ledgerEntryAppended = ledgerEntryAppended;
report.ledgerPath = 'data/self_healing/self_heal_ledger.json';
report.ledgerNote = ledgerEntryAppended
  ? `${appliedRepairs.length} applied repair(s) recorded under runId ${runId}`
  : 'no repair ran, so no ledger entry was written - the ledger records repairs, not green runs';

fs.mkdirSync(path.join(ROOT, 'reports/validation'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'reports/validation/self-heal-loop.json'), `${JSON.stringify(report, null, 2)}\n`);

// Every path through this stage ends on a named line. Nothing exits quietly.
const summaryLine = `[self-heal] OUTCOME=${outcome} repairsRun=${repairsRun} attempts=${attempts.length} blocking=${report.blockingAtStop.length} repairCoverage=${repairCoverage.validatorsDeclaringRepair}/${repairCoverage.validatorsInRegistry}`;
if (process.env.GITHUB_STEP_SUMMARY) {
  try {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### self-heal loop\n\n\`${summaryLine}\`\n\n${report.blockingAtStop.length ? `Blocking: ${report.blockingAtStop.join(', ')}\n` : ''}`);
  } catch { /* a step summary is a convenience, never a reason to fail the run */ }
}

if (!clean) {
  console.error(summaryLine);
  if (outcome === OUTCOME.NO_REPAIR_AVAILABLE || outcome === OUTCOME.REPAIR_RAN_STILL_BLOCKED) {
    // Say this in words. It is the expected shape of failure in this repo and
    // must not be mistaken for the loop having broken.
    console.error(`[self-heal] STOP: ${outcome} - the blocking validator(s) declare no repairCommand in _repo_validation_registry.json.`);
    for (const id of report.unrepairableAtStop) console.error(`  unrepairable: ${id}`);
    console.error(`  ${repairCoverage.validatorsDeclaringRepair} of ${repairCoverage.validatorsInRegistry} validators declare a repair, so this is a legitimate named stop, not a loop failure.`);
  }
  console.error(`[self-heal] NOT CLEAN after ${attempts.length} attempt(s) - refusing to declare the tree publishable.`);
  console.error('  see reports/validation/self-heal-loop.json');
  process.exit(1);
}
console.log(summaryLine);
console.log(`[self-heal] safe to push (${outcome})`);
