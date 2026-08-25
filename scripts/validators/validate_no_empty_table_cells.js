#!/usr/bin/env node
// No published page may ship a table with empty cells.
//
// An empty <td></td> is a generator that ran out of data mid-row and emitted the
// cell anyway. To a reader it is a blank box; to an answer engine it is a
// malformed table whose columns no longer line up with their headers, so the
// whole table becomes unusable as an extractable fact source. A sibling repo
// shipped 257 pages in this state.
//
// A cell holding &nbsp;, a dash, or "n/a" is a deliberate authored placeholder
// and passes: this only catches cells with nothing in them at all.
//
// Same scan decisions as the instruction-leak guard: dist/ is the published
// surface and is scanned, and the skip list applies to top-level directories
// only so dist/templates/ and dist/reports/ stay covered.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const EVIDENCE = path.join(ROOT, 'artifacts/validation/empty-table-cells.json');
const SKIP_TOP_LEVEL = new Set([
  'node_modules', '.git', 'data', 'artifacts', 'reports', 'staging', 'templates',
  'prompts', 'docs', 'migrations', 'seed-downloads', 'ops', 'deployment',
]);

// <td>, <td class="x">, <td></td> and <td>\n  </td> all count as empty.
const EMPTY_CELL = /<(td|th)\b[^>]*>\s*<\/\1>/gi;

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
    const matches = fs.readFileSync(abs, 'utf8').match(EMPTY_CELL);
    if (matches) offenders.push({ path: path.relative(ROOT, abs), emptyCells: matches.length });
  }
})(ROOT, 0);

const totalCells = offenders.reduce((sum, o) => sum + o.emptyCells, 0);
fs.mkdirSync(path.dirname(EVIDENCE), { recursive: true });
fs.writeFileSync(EVIDENCE, `${JSON.stringify({
  schemaVersion: '1.0.0',
  validator: 'no-empty-table-cells',
  generatedAt: new Date().toISOString(),
  status: offenders.length ? 'FAIL' : 'PASS',
  filesScanned: scanned,
  offenderCount: offenders.length,
  emptyCellCount: totalCells,
  offenders: offenders.slice(0, 200),
}, null, 2)}\n`);

if (offenders.length) {
  console.error(`[no-empty-table-cells] FAIL: ${offenders.length} published page(s) ship ${totalCells} empty table cell(s)`);
  for (const o of offenders.slice(0, 15)) console.error(`  ${o.path} :: ${o.emptyCells} empty cell(s)`);
  if (offenders.length > 15) console.error(`  ...and ${offenders.length - 15} more`);
  console.error('  remedy: omit the row, or fill the cell with real content');
  process.exit(1);
}
if (!scanned) console.log('[no-empty-table-cells] OK but no built HTML found; run npm run build for a real check');
else console.log(`[no-empty-table-cells] OK ${scanned} published pages`);
