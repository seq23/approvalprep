#!/usr/bin/env node
/**
 * Every tracked script under scripts/ must have a caller.
 *
 * WHY THIS EXISTS
 * ---------------
 * This repo grew 240+ scripts. Several of them were written, committed, and
 * then never invoked by anything: no npm script, no workflow step, no import.
 * A script with no caller is not dormant capability, it is a rule nobody
 * enforces and a maintenance cost nobody pays - and it reads, to anyone
 * auditing the repo, as if the rule were live. Seven were found in one pass.
 *
 * WHAT COUNTS AS A CALLER
 * -----------------------
 * Exactly three things, all of which mean the file actually runs:
 *
 *   1. an INVOCATION in a runner file - a package.json script command, a
 *      `run:` block in .github/workflows/*.yml, or a tracked shell script -
 *      that names the script's repo-relative path;
 *   2. a MODULE SPECIFIER in tracked code - `import ... from`, `require(...)`,
 *      or `import(...)` - that resolves to the script;
 *   3. a CHILD-PROCESS INVOCATION from tracked code - the script's path as a
 *      string literal handed to spawn/spawnSync/exec/execFile/execFileSync.
 *      scripts/ops/deploy.mjs runs scripts/runtime/seed-product-registry.mjs
 *      this way and nothing else references it; a checker without this class
 *      reports a live script as dead, which is how a guard gets deleted.
 *
 * A prose mention does NOT count. Documentation, READMEs, comments and commit
 * messages are deliberately outside the reference corpus: a file whose only
 * "caller" is a sentence about it is dead. This validator EXCLUDES ITS OWN
 * SOURCE from that corpus for the same reason - otherwise the paragraph you
 * are reading, which names the scripts it found, would satisfy the check.
 *
 * The corpus comes from `git ls-files`, not a filesystem walk, so untracked
 * scratch files in scripts/ cannot trip it and cannot silence it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SELF = 'scripts/validate/script-callers.mjs';
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const CODE_EXT = /\.(mjs|cjs|js|ts|astro)$/;
const scripts = tracked.filter((f) => f.startsWith('scripts/') && (CODE_EXT.test(f) || f.endsWith('.sh')));

// A validator that examines nothing must never report OK.
if (scripts.length === 0) {
  console.error('[script-callers] examined zero scripts - the corpus query is broken, not the repo');
  process.exit(1);
}

/* -------------------------------------------------- 1. invocations in runners */
const runnerTexts = [];
const pkg = JSON.parse(read('package.json'));
for (const command of Object.values(pkg.scripts || {})) runnerTexts.push(command);
for (const file of tracked) {
  if (file === SELF) continue;                       // never let this file vouch for anything
  if (/^\.github\/workflows\/.+\.ya?ml$/.test(file) || file.endsWith('.sh')) runnerTexts.push(read(file));
}
const runnerBlob = runnerTexts.join('\n');

/* ------------------------------------------------ 2. module specifiers in code */
const specifierTargets = new Set();
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;
for (const file of tracked) {
  if (file === SELF) continue;
  if (!CODE_EXT.test(file)) continue;
  const dir = path.dirname(file);
  for (const [, spec] of read(file).matchAll(SPECIFIER)) {
    if (!spec.startsWith('.')) continue;             // bare specifiers are packages
    const base = path.posix.normalize(path.posix.join(dir, spec));
    specifierTargets.add(base);
    for (const ext of ['.mjs', '.cjs', '.js', '.ts']) {
      specifierTargets.add(base + ext);
      specifierTargets.add(path.posix.join(base, 'index' + ext));
    }
  }
}

/* --------------------------------- 3. child-process invocations in tracked code */
// Only quoted string literals count, so a filename written in a comment or in a
// data file's provenance note is not mistaken for something that runs it.
const spawnedPaths = new Set();
for (const file of tracked) {
  if (file === SELF) continue;
  if (!CODE_EXT.test(file)) continue;
  const src = read(file);
  if (!/\b(?:spawnSync|spawn|execFileSync|execFile|execSync|exec)\s*\(/.test(src)) continue;
  for (const [, literal] of src.matchAll(/['"]([^'"\n]*scripts\/[^'"\n]+)['"]/g)) {
    spawnedPaths.add(literal.replace(/^\.\//, ''));
  }
}

const orphans = [];
for (const script of scripts) {
  // This validator is held to the same rule as everything else, but it may not
  // use its own file to prove it: every corpus above skips SELF, so only
  // package.json, a workflow, or a shell script can vouch for it.
  if (runnerBlob.includes(script)) continue;
  if (specifierTargets.has(script)) continue;
  if (spawnedPaths.has(script)) continue;
  orphans.push(script);
}

if (orphans.length) {
  console.error(`[script-callers] ${orphans.length} tracked script(s) under scripts/ have no caller:`);
  for (const o of orphans) console.error(`  ${o}`);
  console.error('  A caller is an invocation in package.json / .github/workflows / a shell script, or an import of the module.');
  console.error('  Delete the script, or wire it to the thing that should run it. A doc mention is not a caller.');
  process.exit(1);
}

console.log(`[script-callers] OK scripts=${scripts.length} runners=${runnerTexts.length} moduleSpecifiers=${specifierTargets.size} spawned=${spawnedPaths.size}`);
