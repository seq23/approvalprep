#!/usr/bin/env node
/**
 * The lane that authorises a merge must reach `validate:all` in the same state
 * the scheduled lanes do.
 *
 * On 2026-09-01, PR #23 gave seo-aeo-geo-surfaces a hard assertion on
 * `dist/_headers`. Its Validate run was green and it merged. Every scheduled
 * lane went red the next morning and stayed red, once per day:
 *
 *   [seo] dist/_headers is missing, so Cloudflare Pages never receives the
 *   header rules; _headers must live in public/ to be published
 *
 * The assertion was correct. What was wrong is that the pull_request lane ran
 * `npm run build` as a workflow step before `validate:all`, and the scheduled
 * lanes - citation-os-daily, citation-os-weekly,
 * intelligence-ingest-free-sources, artifact-validation - reach `validate:all`
 * on a bare checkout with no dist/ at all, because dist/ is gitignored.
 *
 * PR #26 fixed the ordering by moving `build` to registry position 1, so
 * validate:all now produces dist/ itself in every lane. That closed the
 * instance. This closes the class: as long as the pre-merge lane sets up state
 * no scheduled lane has, a green pull_request does not predict a green
 * schedule, and the next defect of this shape is again only discoverable in
 * production, one red morning at a time.
 *
 * So: any job in a pull_request-triggered workflow that runs the registry must
 * not run a build in an earlier step of that job. The build has to come from
 * the registry, where every lane gets it.
 *
 * Rule 0: zero pull_request lanes examined, or a pre-merge lane that never runs
 * the registry at all, is a hard failure - not a quiet pass on an empty loop.
 */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const root = process.cwd();
const dir = '.github/workflows';
const failures = [];

// `on:` is parsed by js-yaml as the boolean true (YAML 1.1 truthy key).
function triggersOf(doc) {
  const on = doc?.on ?? doc?.[true] ?? doc?.['on'];
  if (!on) return [];
  if (typeof on === 'string') return [on];
  if (Array.isArray(on)) return on.map(String);
  return Object.keys(on);
}

const RUNS_REGISTRY = /npm\s+run\s+(--silent\s+)?(validate:all|selfheal)\b/;
const RUNS_BUILD = /(npm\s+run\s+(--silent\s+)?build\b)|(\bastro\s+build\b)/;

let files = [];
try {
  files = fs
    .readdirSync(path.join(root, dir))
    .filter((f) => /\.ya?ml$/i.test(f))
    .sort()
    .map((f) => path.join(dir, f));
} catch (error) {
  console.error(`[pre-merge-lane-parity] FAIL: cannot read ${dir}: ${error.message}`);
  process.exit(1);
}

if (files.length === 0) {
  console.error(`[pre-merge-lane-parity] FAIL: zero workflow files found under ${dir} - refusing to pass on an empty loop`);
  process.exit(1);
}

// The scheduled lanes are the thing the pre-merge lane is supposed to predict.
// Collect them so the report names what is actually at stake, and so a repo
// with no unbuilt registry lane cannot make this guard vacuous.
const scheduledRegistryLanes = [];
const preMergeRegistryJobs = [];

for (const file of files) {
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(path.join(root, file), 'utf8'));
  } catch (error) {
    failures.push(`${file}: cannot parse as YAML (${error.message})`);
    continue;
  }
  const triggers = triggersOf(doc);
  const isPreMerge = triggers.includes('pull_request') || triggers.includes('pull_request_target');
  const jobs = doc?.jobs && typeof doc.jobs === 'object' ? doc.jobs : {};

  for (const [jobName, job] of Object.entries(jobs)) {
    const steps = Array.isArray(job?.steps) ? job.steps : [];
    const commands = steps.map((step) => (typeof step?.run === 'string' ? step.run : ''));
    const registryStep = commands.findIndex((cmd) => RUNS_REGISTRY.test(cmd));
    if (registryStep === -1) continue;

    if (!isPreMerge) {
      const buildBefore = commands.slice(0, registryStep).some((cmd) => RUNS_BUILD.test(cmd));
      scheduledRegistryLanes.push({ file, jobName, buildBefore });
      continue;
    }

    preMergeRegistryJobs.push({ file, jobName });
    const offending = [];
    for (let i = 0; i < registryStep; i += 1) {
      if (RUNS_BUILD.test(commands[i])) {
        offending.push(`step ${i + 1} (${steps[i]?.name || commands[i].trim().split('\n')[0]})`);
      }
    }
    if (offending.length) {
      failures.push(
        `${file} job "${jobName}" builds before it runs the registry: ${offending.join('; ')}. ` +
          'That puts the merge gate in a state no scheduled lane is ever in, so a green pull_request stops ' +
          'predicting a green schedule. The build belongs in the registry (position 1), where every lane gets it.'
      );
    }
  }
}

// Rule 0, three ways: there must be a pre-merge lane, it must run the registry,
// and there must be at least one lane this guard is actually protecting.
if (preMergeRegistryJobs.length === 0) {
  failures.push(
    'no pull_request-triggered workflow runs `npm run validate:all` (or `npm run selfheal`). ' +
      'Nothing gates a merge on the validator registry, so this guard has nothing to compare against.'
  );
}
if (scheduledRegistryLanes.length === 0) {
  failures.push(
    'no non-pull_request workflow runs the registry. This guard exists to keep the merge gate honest about ' +
      'those lanes; with none of them present it would be asserting nothing.'
  );
}

// Position 1 in the registry is what makes removing the workflow build step
// safe. If that ever stops being true, this guard is demanding something
// harmful, so it must fail rather than enforce it.
try {
  const registry = JSON.parse(fs.readFileSync(path.join(root, '_repo_validation_registry.json'), 'utf8'));
  const validators = Array.isArray(registry.validators) ? registry.validators : [];
  if (validators[0]?.id !== 'build') {
    failures.push(
      `_repo_validation_registry.json validator 1 is "${validators[0]?.id ?? '(none)'}", not "build". ` +
        'This guard forbids a pre-merge build step only because the registry performs the build for every lane; ' +
        'if it does not, forbidding the step would leave the merge gate measuring an absent dist/.'
    );
  }
} catch (error) {
  failures.push(`cannot read _repo_validation_registry.json: ${error.message}`);
}

if (failures.length) {
  console.error(`[pre-merge-lane-parity] FAIL: ${failures.length} problem(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('  remedy: delete the build step from the pull_request lane. validate:all builds as validator 1 in every lane.');
  process.exit(1);
}

const unbuilt = scheduledRegistryLanes.filter((lane) => !lane.buildBefore);
console.log(
  `[pre-merge-lane-parity] OK workflows=${files.length} ` +
    `preMergeRegistryJobs=${preMergeRegistryJobs.length} ` +
    `scheduledRegistryLanes=${scheduledRegistryLanes.length} ` +
    `reachValidateAllWithNoPriorBuild=${unbuilt.length} ` +
    `parity=${preMergeRegistryJobs.map((job) => `${path.basename(job.file)}:${job.jobName}`).join(',')}`
);
