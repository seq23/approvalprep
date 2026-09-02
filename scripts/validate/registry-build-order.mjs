#!/usr/bin/env node
/**
 * The build must be the first entry in the validation registry.
 *
 * `validate:all` walks `_repo_validation_registry.json` in array order, and the
 * registry contains its own `build` entry. Until this guard existed, `build`
 * sat at position 61 while validators that read the built tree sat ahead of it:
 * seo-aeo-geo-surfaces at 17, credit-boundary-coverage at 55. Those validators
 * were reading a `dist/` that the same run had not produced yet.
 *
 * `dist/` is gitignored, so whether that mattered depended entirely on which
 * lane you were in:
 *
 *   - validate.yml and scheduled-content-release.yml run `npm run build` as a
 *     workflow step BEFORE `validate:all`, so dist/ already existed and the
 *     ordering defect was invisible.
 *   - citation-os-daily, citation-os-weekly, intelligence-ingest-free-sources
 *     and artifact-validation.yml reach `validate:all` with no build step at
 *     all, so for validators 1..60 the tree had no dist/ whatsoever.
 *
 * On 2026-09-01 PR #23 gave seo-aeo-geo-surfaces (position 17) a hard assertion
 * on `dist/_headers`. Its own Validate run was green, because Validate builds
 * first. Every scheduled lane went red the next morning and stayed red, once
 * per day, because those lanes only build at position 61 - forty-four
 * validators too late. The assertion was correct; its position was not.
 *
 * Moving `build` to position 1 fixes it for every lane at once and needs no
 * per-workflow build step. This guard keeps it there: any future validator,
 * wherever it is inserted, is now necessarily behind the artefact it reads.
 *
 * Rule 0: an empty or build-less registry is a hard failure, not a quiet pass.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const registryPath = '_repo_validation_registry.json';
const failures = [];

let registry;
try {
  registry = JSON.parse(fs.readFileSync(path.join(root, registryPath), 'utf8'));
} catch (error) {
  console.error(`[registry-build-order] FAIL: cannot read ${registryPath}: ${error.message}`);
  process.exit(1);
}

const validators = Array.isArray(registry.validators) ? registry.validators : [];

// Zero-item guard: a pass over an empty registry is not a pass.
if (validators.length === 0) {
  console.error('[registry-build-order] FAIL: zero validators examined - refusing to pass on an empty registry');
  process.exit(1);
}

const buildIndex = validators.findIndex((validator) => validator.id === 'build');

if (buildIndex === -1) {
  failures.push(
    `${registryPath} has no "build" entry. validate:all would then never produce dist/, and every build-output validator would measure an absent tree.`
  );
} else {
  const build = validators[buildIndex];

  if (buildIndex !== 0) {
    const ahead = validators.slice(0, buildIndex).map((validator) => validator.id);
    failures.push(
      `"build" is at position ${buildIndex + 1} of ${validators.length}; it must be position 1. ` +
        `${ahead.length} validator(s) run before the build produces dist/, so in any lane that does not build ` +
        `beforehand they measure a tree that does not exist yet: ${ahead.slice(0, 8).join(', ')}${ahead.length > 8 ? `, +${ahead.length - 8} more` : ''}`
    );
  }

  if (build.severity !== 'HARD_FAIL') {
    failures.push(`"build" severity is ${build.severity}; a build that may fail without blocking leaves later validators measuring a stale or absent dist/`);
  }

  if (build.blocksRelease !== true) {
    failures.push('"build" must set blocksRelease: true; a release built from a tree that would not compile is not a release');
  }

  // Position 1 is only meaningful if the entry actually builds the tree.
  // Guard against the entry being renamed or gutted into a no-op.
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  } catch (error) {
    console.error(`[registry-build-order] FAIL: cannot read package.json: ${error.message}`);
    process.exit(1);
  }
  const command = pkg.scripts?.[build.npmScript];
  if (!command) {
    failures.push(`"build" names npm script "${build.npmScript}", which package.json does not define`);
  } else if (!/\bastro\s+build\b/.test(command)) {
    failures.push(
      `npm script "${build.npmScript}" no longer runs \`astro build\` (it runs: ${command}). ` +
        'Ordering it first only guarantees dist/ exists if it is still the command that produces dist/.'
    );
  }
}

if (failures.length) {
  console.error(`[registry-build-order] FAIL: ${failures.length} problem(s) with the build stage's position in ${registryPath}`);
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('  remedy: move the "build" entry to the front of registry.validators. Every validator that reads dist/ must run after the build that writes it.');
  process.exit(1);
}

console.log(`[registry-build-order] OK build is validator 1 of ${validators.length}; every build-output validator runs after the tree exists`);
