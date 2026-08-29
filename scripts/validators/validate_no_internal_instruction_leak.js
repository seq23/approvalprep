#!/usr/bin/env node
// No published page may contain internal build instructions.
//
// The external review agent sends recommendations as build directives shaped like
//   "FILEPATH: x || CURRENT: ... || MISSING: ... || EDIT: ..."
// In a sibling repo two generator paths rendered those as reader-facing copy: a
// fallback "acceptance checklist" card, and target.answer via
// "Citation-ready update: ". 163 published pages carried the first and 100 the
// second - the second inside the direct-answer block, which is the exact text an
// answer engine extracts.
//
// It also explains a reported symptom: the agent kept re-flagging pages marked
// released, because it was reading its own instruction back off the page instead
// of the content it asked for.
//
// Two scan decisions are specific to this repo:
//
// 1. dist/ is scanned, not skipped. It is the Astro build output and it is the
//    only place the published surface exists as HTML - the sources are .astro,
//    so skipping dist/ would leave nothing to check. Run `npm run build` first
//    for a meaningful result; with no build present this reports zero files.
// 2. The skip list applies to top-level directories only. dist/templates/ and
//    dist/reports/ are real published pages, and a skip-by-name-at-any-depth
//    rule would silently exempt eight of them.
//
// data/, reports/, artifacts/ and templates/ at the root hold intelligence
// output, agent briefs and letter source templates, which are supposed to
// contain this text and are not part of the published surface.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const EVIDENCE = path.join(ROOT, 'artifacts/validation/internal-instruction-leak.json');
const SKIP_TOP_LEVEL = new Set([
  'node_modules', '.git', 'data', 'artifacts', 'reports', 'staging', 'templates',
  'prompts', 'docs', 'migrations', 'seed-downloads', 'ops', 'deployment',
]);

const PATTERNS = [
  [/FILEPATH:/, 'raw agent recommendation (FILEPATH:)'],
  [/\|\|\s*(CURRENT|MISSING|EDIT)\s*:/i, 'raw agent recommendation field separator'],
  [/Citation-ready update:/i, 'instruction appended to the answer block'],
  [/Marker-only framework cards/i, 'build policy text rendered as page copy'],
  [/Required semantic acceptance:/i, 'build policy text rendered as page copy'],
];

const offenders = [];
let scanned = 0;
(function walk(dir, depth) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (depth === 0 && SKIP_TOP_LEVEL.has(entry.name)) continue;
      walk(abs, depth + 1);
      continue;
    }
    if (!entry.name.endsWith('.html')) continue;
    scanned += 1;
    const html = fs.readFileSync(abs, 'utf8');
    const rel = path.relative(ROOT, abs);
    for (const [re, why] of PATTERNS) {
      if (re.test(html)) { offenders.push({ path: rel, reason: why }); break; }
    }
  }
})(ROOT, 0);

fs.mkdirSync(path.dirname(EVIDENCE), { recursive: true });
fs.writeFileSync(EVIDENCE, `${JSON.stringify({
  schemaVersion: '1.0.0',
  validator: 'no-internal-instruction-leak',
  generatedAt: new Date().toISOString(),
  status: offenders.length ? 'FAIL' : 'PASS',
  filesScanned: scanned,
  offenderCount: offenders.length,
  offenders: offenders.slice(0, 200),
}, null, 2)}\n`);

if (offenders.length) {
  console.error(`[no-internal-instruction-leak] FAIL: ${offenders.length} published page(s) contain build instructions`);
  for (const o of offenders.slice(0, 15)) console.error(`  ${o.path} :: ${o.reason}`);
  if (offenders.length > 15) console.error(`  ...and ${offenders.length - 15} more`);
  console.error('  remedy: render the requested content, never the recommendation text that asked for it');
  process.exit(1);
}
// A validator that examined nothing has not passed; it has abstained. This is
// HARD_FAIL and blocksRelease in _repo_validation_registry.json, and dist/ is
// gitignored, so on a fresh checkout it walked zero pages and exited 0 - which
// made it structurally incapable of ever failing on the pull_request and
// push-to-main lanes. .github/workflows/validate.yml now builds before
// validate:all; this refuses to paper over it if that ordering is ever undone.
if (!scanned) {
  console.error('[no-internal-instruction-leak] FAIL: zero built HTML pages examined. Run `npm run build` before this validator; a pass over nothing is not a pass.');
  process.exit(1);
}
console.log(`[no-internal-instruction-leak] OK ${scanned} published pages`);
