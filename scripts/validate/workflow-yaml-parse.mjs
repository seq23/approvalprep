#!/usr/bin/env node
/**
 * Catch the workflow-file parse error that leaves no log to read.
 *
 * `.github/workflows/citation-os-weekly.yml` failed on main as run 33196068820:
 * 0 seconds, no annotation, no job, nothing to open. That failure mode is a
 * workflow-file parse error - GitHub never builds a job list, so there is no
 * step to attach a log to. The cause was an orphaned block: removing the last
 * key from an `env:` mapping left the header and a dangling comment behind,
 *
 *     env:
 *       # across the portfolio at daily cadence. 3 still names the incumbents
 *
 *     jobs:
 *
 * and a mapping key with nothing under it but a comment is a null value, which
 * Actions rejects. It was fixed in PR #13; this exists so the class cannot come
 * back silently, because nothing about the failure tells you where to look.
 *
 * A key with no value is not always wrong - `workflow_dispatch:`, `push:` and
 * the other trigger names are legitimately null - so those are allowed by name.
 * `env:`, `with:`, `inputs:` and `outputs:` are not: an empty one of those is
 * the defect.
 *
 * Zero files examined is a failure, not a pass.
 */
import fs from 'node:fs';
import path from 'node:path';

const LEGAL_NULL = new Set([
  'workflow_dispatch', 'push', 'pull_request', 'pull_request_target', 'schedule',
  'release', 'issues', 'issue_comment', 'workflow_call', 'workflow_run', 'create',
  'delete', 'fork', 'watch', 'status', 'page_build', 'deployment', 'check_suite',
  'registry_package', 'milestone', 'project', 'public', 'repository_dispatch',
]);

const dir = '.github/workflows';
let files = [];
try {
  files = fs.readdirSync(dir).filter((f) => /\.ya?ml$/i.test(f)).map((f) => path.join(dir, f));
} catch {
  console.error(`[workflow-yaml-parse] FAIL: cannot read ${dir}`);
  process.exit(1);
}

if (!files.length) {
  console.error('[workflow-yaml-parse] FAIL: zero workflow files examined - refusing to pass');
  process.exit(1);
}

const offenders = [];
for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^(\s*)([A-Za-z_][A-Za-z0-9_.-]*):\s*(#.*)?$/);
    if (!m) continue;
    const indent = m[1].length;
    const key = m[2];
    if (LEGAL_NULL.has(key)) continue;
    let j = i + 1;
    while (j < lines.length && (lines[j].trim() === '' || lines[j].trim().startsWith('#'))) j += 1;
    const childIndent = j < lines.length ? lines[j].match(/^(\s*)/)[1].length : -1;
    if (j >= lines.length || childIndent <= indent) {
      offenders.push(`${file}:${i + 1} '${key}:' has no value - only blank lines or comments follow`);
    }
  }
}

if (offenders.length) {
  console.error(`[workflow-yaml-parse] FAIL: ${offenders.length} orphaned mapping key(s). GitHub will reject the file with "failed to parse workflow" and produce a 0-second run with no log.`);
  for (const o of offenders) console.error(`  ${o}`);
  console.error('  remedy: delete the orphaned key, or give it a real value. A trailing comment is not a value.');
  process.exit(1);
}

console.log(`[workflow-yaml-parse] OK ${files.length} workflow file(s); no orphaned mapping keys`);
