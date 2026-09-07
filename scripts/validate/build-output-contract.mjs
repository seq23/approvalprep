#!/usr/bin/env node
/**
 * Two things must be true of every validator that measures the built tree, and
 * neither of them was.
 *
 * 1. THE LANE MUST PRODUCE THE TREE BEFORE IT ASKS ABOUT IT.
 *
 *    `dist/` is gitignored, so a validator that reads it answers a different
 *    question depending on which workflow invoked it. PR #26 fixed this for
 *    lanes that run the registry by moving `build` to registry position 1, and
 *    validate:pre-merge-lane-parity keeps the merge gate honest about those
 *    lanes. Both guards key on `npm run validate:all`, and both skip a job that
 *    does not run it - so neither could see the one remaining shape:
 *
 *      .github/workflows/growth-health-refresh.yml
 *        - run: npm run validate:seo-surfaces
 *
 *    A single build-output validator invoked DIRECTLY, outside the registry, in
 *    a job with no build step and no `npm ci` at all. It is a Monday-only cron,
 *    so it was the last lane to meet PR #23's dist/_headers assertion: green on
 *    2026-08-31, red on 2026-09-07 with the identical message that had taken
 *    the daily lanes down five days earlier -
 *
 *      [seo] dist/_headers is missing, so Cloudflare Pages never receives the
 *      header rules; _headers must live in public/ to be published
 *
 *    - and by then the message had been declared fixed for a week. So this
 *    guard is not keyed on the registry. It is keyed on the validators, and it
 *    finds every step in every workflow that runs one, however it runs it.
 *
 * 2. THE VALIDATOR MUST REFUSE THE TREE'S ABSENCE, NOT SKIP AROUND IT.
 *
 *    Five of the eight hard-failed. Two did not: demand-backed-pages downgraded
 *    its sitemap-to-render parity check to a `note:`, and credit-boundary-
 *    coverage wrapped its built-page sweep in `if (fs.existsSync("dist"))` and
 *    printed `builtPagesChecked=0` - a pass over nothing, in a line beginning
 *    OK. Those two would have stayed silently vacuous in exactly the lane
 *    assertion 1 is about.
 *
 *    Asserting that in the source text would be asserting prose. So this runs
 *    each of them, with APPROVALPREP_BUILD_OUTPUT_DIR pointed at a directory
 *    that does not exist, and requires a non-zero exit. It is a negative proof
 *    re-executed on every CI run rather than one recorded in a PR body.
 *
 * Rule 0: an empty registry, no build-output validators, no workflow files, or
 * zero invocations found is a hard failure. This guard must never pass by
 * having looked at nothing - that is the exact defect it exists to catch.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import yaml from 'js-yaml';

const NAME = 'build-output-contract';
const root = process.cwd();
const WORKFLOW_DIR = '.github/workflows';
const REGISTRY = '_repo_validation_registry.json';
const COMMON = 'scripts/validate/_common.mjs';
const ABSENT_DIR = '__build_output_contract_absent__';
const failures = [];

const die = (message) => {
  console.error(`[${NAME}] FAIL: ${message}`);
  process.exit(1);
};

// --- the registry, and the premise the whole ordering fix rests on -----------
let registry;
try {
  registry = JSON.parse(fs.readFileSync(path.join(root, REGISTRY), 'utf8'));
} catch (error) {
  die(`cannot read ${REGISTRY}: ${error.message}`);
}
const validators = Array.isArray(registry.validators) ? registry.validators : [];
if (validators.length === 0) die(`${REGISTRY} lists zero validators - refusing to pass on an empty registry`);
if (validators[0]?.id !== 'build') {
  failures.push(
    `${REGISTRY} validator 1 is "${validators[0]?.id ?? '(none)'}", not "build". This guard treats a step that ` +
      'reaches the registry as one that produces the build output; that is only true while the registry builds first.'
  );
}

// --- which validators measure the built tree --------------------------------
// Determined by what they import from the shared contract, not by grepping for
// the word "dist" - security.mjs and external-telemetry-claims.mjs mention
// "dist" only to exclude it from a file walk, and matching prose would drag
// them in and demand a build they have no use for.
const CONTRACT_IMPORT = /import\s*\{([^}]*)\}\s*from\s*['"](\.\/_common\.mjs|\.\.\/validate\/_common\.mjs)['"]/g;
const CONTRACT_SYMBOLS = ['requireBuildOutput', 'publishedDir'];

function usesContract(sourceFile) {
  let source;
  try {
    source = fs.readFileSync(path.join(root, sourceFile), 'utf8');
  } catch {
    return false;
  }
  for (const match of source.matchAll(CONTRACT_IMPORT)) {
    const named = match[1].split(',').map((entry) => entry.trim().split(/\s+as\s+/)[0].trim());
    if (named.some((entry) => CONTRACT_SYMBOLS.includes(entry))) return true;
  }
  return false;
}

if (!fs.existsSync(path.join(root, COMMON))) die(`${COMMON} is missing; there is no shared build-output contract to enforce`);

const buildOutputValidators = validators.filter(
  (validator) => validator.entrypoint && validator.npmScript && usesContract(validator.entrypoint)
);
if (buildOutputValidators.length === 0) {
  die(
    `no validator in ${REGISTRY} imports requireBuildOutput/publishedDir from ${COMMON}. Either every ` +
      'build-output validator has been removed, or they have gone back to resolving the published tree ' +
      'themselves - in which case this guard is measuring nothing and the divergence it exists to prevent is back.'
  );
}
const buildOutputScripts = new Set(buildOutputValidators.map((validator) => validator.npmScript));

// --- npm scripts: which ones build, which ones reach the registry ------------
let scripts = {};
try {
  scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts || {};
} catch (error) {
  die(`cannot read package.json scripts: ${error.message}`);
}

// A script's stages are the scripts it calls with `npm run`, plus - when it is
// `node <runner> <sequence>` - the stage list that runner declares under that
// name. citation-os:daily and citation-os:weekly reach validate:all only this
// way; matching literal strings would miss them, as it once missed them in
// pre-merge-lane-parity.
const sequenceCache = new Map();
function sequencesOf(file) {
  if (sequenceCache.has(file)) return sequenceCache.get(file);
  const map = new Map();
  let source = '';
  try {
    source = fs.readFileSync(path.join(root, file), 'utf8');
  } catch {
    source = '';
  }
  for (const match of source.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\[([^\]]*)\]/g)) {
    const entries = [...match[2].matchAll(/['"`]([^'"`]+)['"`]/g)].map((item) => item[1]);
    if (entries.length && entries.every((entry) => entry in scripts)) map.set(match[1], entries);
  }
  sequenceCache.set(file, map);
  return map;
}

function stagesOf(command) {
  const stages = [];
  for (const match of command.matchAll(/npm\s+run\s+(?:--silent\s+)?([A-Za-z0-9:._-]+)/g)) stages.push(match[1]);
  for (const match of command.matchAll(/\bnode\s+(\S+\.(?:mjs|cjs|js))\s+([A-Za-z0-9:._-]+)/g)) {
    const declared = sequencesOf(match[1]).get(match[2]);
    if (declared) stages.push(...declared);
  }
  return stages;
}

function closureOver(seeds) {
  const reaching = new Set(seeds.filter((name) => name in scripts));
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, command] of Object.entries(scripts)) {
      if (reaching.has(name)) continue;
      if (stagesOf(command).some((stage) => reaching.has(stage))) {
        reaching.add(name);
        changed = true;
      }
    }
  }
  return reaching;
}

// Anything that transitively runs `build`, or that runs the registry (whose
// validator 1 is the build), leaves a published tree behind it.
const producingScripts = closureOver(['build', 'validate:all', 'selfheal']);
if (!producingScripts.has('build')) die('package.json defines no `build` script; nothing in this repo produces the published tree');

const alternation = (names) =>
  [...names].map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length).join('|');
const RUNS_PRODUCER = new RegExp(`(npm\\s+run\\s+(--silent\\s+)?(${alternation(producingScripts)})(\\s|$|&|;|\\||-))|(\\bastro\\s+build\\b)`, 'm');
const RUNS_BUILD_OUTPUT_VALIDATOR = new RegExp(`npm\\s+run\\s+(--silent\\s+)?(${alternation(buildOutputScripts)})(\\s|$|&|;|\\||-)`, 'm');
const INSTALLS_DEPS = /npm\s+(ci|install|i)\b/;

// --- assertion 1: no lane asks a build-output validator about an absent tree --
let files = [];
try {
  files = fs.readdirSync(path.join(root, WORKFLOW_DIR)).filter((f) => /\.ya?ml$/i.test(f)).sort();
} catch (error) {
  die(`cannot read ${WORKFLOW_DIR}: ${error.message}`);
}
if (files.length === 0) die(`zero workflow files under ${WORKFLOW_DIR} - refusing to pass on an empty loop`);

let invocationsExamined = 0;
const lanes = [];

for (const file of files) {
  const rel = `${WORKFLOW_DIR}/${file}`;
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch (error) {
    failures.push(`${rel}: cannot parse as YAML (${error.message}). A workflow that does not parse never runs, and its run is named by file path rather than by \`name:\`.`);
    continue;
  }
  const jobs = doc?.jobs && typeof doc.jobs === 'object' ? doc.jobs : {};
  for (const [jobName, job] of Object.entries(jobs)) {
    const steps = Array.isArray(job?.steps) ? job.steps : [];
    for (let i = 0; i < steps.length; i += 1) {
      const command = typeof steps[i]?.run === 'string' ? steps[i].run : '';
      if (!command) continue;
      const runsValidator = RUNS_BUILD_OUTPUT_VALIDATOR.test(command);
      const runsProducer = RUNS_PRODUCER.test(command);
      if (!runsValidator && !runsProducer) continue;
      invocationsExamined += 1;

      const label = (index) => `step ${index + 1} (${steps[index]?.name || String(steps[index]?.run).trim().split('\n')[0]})`;
      // A conditional step is not a guarantee. growth-health-refresh's fixture
      // trace is `if: github.event_name == 'workflow_dispatch'`, so on the cron
      // path it does not exist; a build hidden behind such a condition would
      // leave the scheduled run in exactly the state this guard forbids.
      const unconditionalBefore = (predicate) =>
        steps.slice(0, i).some((step) => typeof step?.run === 'string' && step.if === undefined && predicate(step.run));

      if (runsValidator && !runsProducer && !unconditionalBefore((cmd) => RUNS_PRODUCER.test(cmd))) {
        lanes.push({ rel, jobName, kind: 'unbuilt' });
        failures.push(
          `${rel} job "${jobName}" ${label(i)} runs a build-output validator with nothing before it that produces ` +
            'the published tree. That validator measures a directory this job never creates, so the lane fails on ' +
            'the artefact rather than on the thing it validates. Add `npm run build` (or run the registry, which ' +
            'builds as validator 1) to an unconditional earlier step in this job.'
        );
      } else if (runsValidator) {
        lanes.push({ rel, jobName, kind: 'built' });
      }

      // Building needs node_modules. growth-health-refresh had no install step
      // at all, so simply adding a build to it would have swapped one red for
      // another.
      if (runsProducer && !INSTALLS_DEPS.test(command) && !unconditionalBefore((cmd) => INSTALLS_DEPS.test(cmd))) {
        failures.push(
          `${rel} job "${jobName}" ${label(i)} produces the published build output but no unconditional earlier ` +
            'step installs dependencies. `astro build` cannot run without node_modules; add `npm ci` to this job.'
        );
      }
    }
  }
}

if (invocationsExamined === 0) {
  die(
    `examined zero build/validator steps across ${files.length} workflow file(s). No lane builds and no lane runs a ` +
      'build-output validator, so this guard asserted nothing about any workflow.'
  );
}

// --- assertion 2: each validator refuses an absent published tree ------------
const probed = [];
for (const validator of buildOutputValidators) {
  const result = spawnSync(process.execPath, [validator.entrypoint], {
    cwd: root,
    env: { ...process.env, APPROVALPREP_BUILD_OUTPUT_DIR: ABSENT_DIR },
    encoding: 'utf8',
    timeout: 120000,
  });
  if (result.error) {
    failures.push(`${validator.id}: could not be probed (${result.error.message})`);
    continue;
  }
  probed.push({ id: validator.id, status: result.status });
  if (result.status === 0) {
    failures.push(
      `${validator.id} (${validator.entrypoint}) EXITED 0 with the published tree absent. It measures the built ` +
        'output, so with no output to measure it examined zero items and reported a pass - the shape that let ' +
        'credit-boundary-coverage print builtPagesChecked=0 and call it OK. It must resolve the published ' +
        'directory through requireBuildOutput() from scripts/validate/_common.mjs and refuse.'
    );
  }
}
if (probed.length === 0) failures.push('zero validators were successfully probed; the absent-tree behaviour of this repo is unverified');

if (fs.existsSync(path.join(root, ABSENT_DIR))) {
  failures.push(`${ABSENT_DIR}/ exists in the repository, which makes the absent-tree probe vacuous. Remove it.`);
}

if (failures.length) {
  console.error(`[${NAME}] FAIL: ${failures.length} problem(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

const refused = probed.filter((entry) => entry.status !== 0).length;
console.log(
  `[${NAME}] OK workflows=${files.length} buildOutputValidators=${buildOutputValidators.length} ` +
    `refuseAbsentTree=${refused}/${probed.length} stepsExamined=${invocationsExamined} ` +
    `validatorLanes=${lanes.map((lane) => `${path.basename(lane.rel)}:${lane.jobName}`).join(',') || '(none)'} ` +
    `validators=${buildOutputValidators.map((entry) => entry.id).sort().join(',')}`
);
