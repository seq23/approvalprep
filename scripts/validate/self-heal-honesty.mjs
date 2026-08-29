#!/usr/bin/env node
// Does the self-heal machinery only claim repairs it actually made?
//
// Three defects this guards, each reproduced before it was fixed:
//
// 1. scripts/content/self-heal-citation-os.mjs stamped
//    data/workflow_traces/citation_os_self_heal_latest.json with
//    `status: SELF_HEALED_CITATION_OS_CONSISTENCY` on every run, including runs
//    that changed zero bytes of zero files. A success record with no repair
//    behind it.
// 2. scripts/content/self-heal.mjs exited 0 with `answers=0` - an empty release
//    corpus certified the release exactly as a validated one did.
// 3. data/self_healing/self_heal_ledger.json, the repo's named self-heal
//    ledger, was written by nothing at all. Real repairs happened and the
//    ledger stayed at `entries: []`.
//
// Every assertion below is counted. Examining zero artifacts is itself a hard
// failure: a guard that silently finds nothing to check is the same class of
// defect it exists to catch.
import fs from 'node:fs';

const errors = [];
let checks = 0;
const check = (label, ok, detail) => { checks += 1; if (!ok) errors.push(`${label}: ${detail}`); };
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// ---- 1. Citation-OS heal trace must be honest about whether it repaired ----
const TRACE = 'data/workflow_traces/citation_os_self_heal_latest.json';
if (!fs.existsSync(TRACE)) {
  errors.push(`${TRACE}: missing - content:self-heal-citation-os must leave a trace of its outcome`);
  checks += 1;
} else {
  const trace = readJson(TRACE);
  const OUTCOMES = ['SELF_HEALED_CITATION_OS_CONSISTENCY', 'NO_CITATION_OS_REPAIR_NEEDED'];
  check('citation-os trace outcome', OUTCOMES.includes(trace.status), `status "${trace.status}" is not one of ${OUTCOMES.join(', ')}`);
  check('citation-os trace repairsApplied', Number.isInteger(trace.repairsApplied), 'repairsApplied must be an integer; an unquantified heal claim is not evidence');
  check('citation-os trace changedFiles', Array.isArray(trace.changedFiles), 'changedFiles must be an array naming what the repair touched');
  check('citation-os trace filesInspected', Number(trace.filesInspected) > 0, 'filesInspected must be > 0; a heal that inspected nothing cannot have repaired anything');
  if (trace.status === 'SELF_HEALED_CITATION_OS_CONSISTENCY') {
    check(
      'citation-os heal claim is backed',
      Number(trace.repairsApplied) > 0 && Array.isArray(trace.changedFiles) && trace.changedFiles.length > 0,
      `claims SELF_HEALED with repairsApplied=${trace.repairsApplied} and ${trace.changedFiles?.length ?? 'no'} changed file(s) - a heal must have changed something`,
    );
  }
  if (trace.status === 'NO_CITATION_OS_REPAIR_NEEDED') {
    check(
      'citation-os no-op claim is backed',
      Number(trace.repairsApplied) === 0 && (trace.changedFiles || []).length === 0,
      `claims nothing to repair while reporting repairsApplied=${trace.repairsApplied} and ${(trace.changedFiles || []).length} changed file(s)`,
    );
  }
}

// ---- 2. The release corpus self-heal must refuse an empty corpus ----
const HEAL_LOG = 'reports/self-healing-log.json';
if (!fs.existsSync(HEAL_LOG)) {
  errors.push(`${HEAL_LOG}: missing - content:self-heal must leave its inspection report`);
  checks += 1;
} else {
  const log = readJson(HEAL_LOG);
  check('content self-heal zero-item guard', log.zeroItemGuard === 'HARD_FAIL_ON_ZERO_INSPECTED', `zeroItemGuard is "${log.zeroItemGuard}"; the guard that blocks an empty answer corpus must be recorded as having run`);
  check('content self-heal inspected something', Number(log.inspectedAnswers) > 0, `inspectedAnswers=${log.inspectedAnswers}; a release cannot be certified from an empty answer corpus`);
  check('content self-heal status is named', typeof log.status === 'string' && log.status.length > 0, 'status must name the outcome');
}

// ---- 3. The self-heal ledger must record the repairs the loop ran ----
const LEDGER = 'data/self_healing/self_heal_ledger.json';
const LOOP = 'reports/validation/self-heal-loop.json';
if (!fs.existsSync(LEDGER)) {
  errors.push(`${LEDGER}: missing - the self-heal ledger is the durable record of applied repairs`);
  checks += 1;
} else {
  const ledger = readJson(LEDGER);
  check('ledger entries array', Array.isArray(ledger.entries), 'entries must be an array');
  for (const entry of ledger.entries || []) {
    check(`ledger entry ${entry.runId || '(no runId)'}`,
      Boolean(entry.runId) && Boolean(entry.at) && Boolean(entry.outcome) && Array.isArray(entry.repairs) && entry.repairs.length > 0,
      'every ledger entry must carry runId, at, outcome and at least one applied repair - the ledger records repairs, never green runs');
  }
  if (fs.existsSync(LOOP)) {
    const loop = readJson(LOOP);
    check('loop report declares ledger wiring', typeof loop.ledgerEntryAppended === 'boolean', 'reports/validation/self-heal-loop.json must state whether it wrote a ledger entry');
    if (Number(loop.repairsRun) > 0 && loop.dryRun !== true) {
      check('applied repairs reached the ledger',
        (ledger.entries || []).some((e) => e.runId === loop.runId),
        `the last loop run applied ${loop.repairsRun} repair(s) under runId ${loop.runId} but no ledger entry carries that runId`);
    }
  }
}

// Zero examined artifacts is a failure, not a pass.
if (checks === 0) {
  console.error('[self-heal-honesty] examined zero artifacts - refusing to pass');
  process.exit(1);
}
if (errors.length) {
  console.error(`[self-heal-honesty] ${errors.length} of ${checks} check(s) failed`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`[self-heal-honesty] OK checks=${checks} ledgerEntries=${fs.existsSync(LEDGER) ? (readJson(LEDGER).entries || []).length : 0}`);
