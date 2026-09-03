#!/usr/bin/env node
// Fails if the build ships an <a href> to somebody else's URL that we have not
// measured, or that we measured and found gone.
//
// scripts/validate/internal-url-form.mjs already guarantees every link the site
// makes to *itself* names a URL the server answers 200 for directly. Nothing
// covered the links it makes to everyone else, and on 2026-09-03 a crawl found
// 11 pages linking into a 404: HUD renamed form 52517.pdf, and three
// property-management PDFs in the Document Readiness Index corpus were
// withdrawn. All 116 internal targets were 200, so this was a second, separate
// defect with the same shape - a URL emitted from checked-in JSON that nothing
// ever re-checked.
//
// This runs offline. The network measurement lives in
// scripts/seo/probe-outbound-links.mjs, which writes
// data/citations/outbound_link_health.json; this validator gates the build on
// that record so CI gives the same answer whatever a third-party origin is doing
// this minute. That split is also what makes the guard real rather than
// decorative: an unmeasured link is a failure here, so adding a citation without
// probing it cannot ship.
import fs from 'node:fs';
import path from 'node:path';
import { collectOutboundLinks, readLedger, LEDGER_PATH, DIST } from '../lib/outbound-links.mjs';

const MAX_LEDGER_AGE_DAYS = 120;
const failures = [];

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('[outbound-link-health] dist/ is not built; run npm run build first');
  process.exit(1);
}

const ledger = readLedger();
if (!ledger) {
  console.error(`[outbound-link-health] FAIL ${LEDGER_PATH} does not exist; run \`npm run linkcheck:outbound\``);
  process.exit(1);
}

const byUrl = new Map((ledger.links || []).map((l) => [l.url, l]));
const { links, htmlPages } = collectOutboundLinks();

// Rule 0. A build with no outbound links means the extractor stopped matching
// this tree, not that every citation is healthy.
if (links.size === 0) {
  console.error(`[outbound-link-health] FAIL examined 0 outbound links across ${htmlPages} built page(s); this check is inert`);
  process.exit(1);
}
if (byUrl.size === 0) {
  console.error(`[outbound-link-health] FAIL ${LEDGER_PATH} records 0 links while the build emits ${links.size}; the ledger has never been measured`);
  process.exit(1);
}

const ageDays = (Date.now() - Date.parse(ledger.generatedAt || 0)) / 86_400_000;
if (!Number.isFinite(ageDays)) {
  failures.push(`${LEDGER_PATH}: generatedAt is not a date, so the measurement cannot be dated`);
} else if (ageDays > MAX_LEDGER_AGE_DAYS) {
  failures.push(`${LEDGER_PATH}: last measured ${Math.round(ageDays)} days ago (limit ${MAX_LEDGER_AGE_DAYS}); run \`npm run linkcheck:outbound\``);
}

let checked = 0;
for (const [url, pages] of [...links].sort()) {
  checked++;
  const record = byUrl.get(url);
  const citedBy = [...pages].sort().join(', ');
  if (!record) {
    failures.push(`unmeasured outbound link, cited by ${citedBy}: ${url} - run \`npm run linkcheck:outbound\` so its status is on the record before it ships`);
    continue;
  }
  if (record.classification === 'dead') {
    failures.push(`link to a page that is gone (HTTP ${record.httpStatus}), cited by ${citedBy}: ${url} - the renderer suppresses hrefs the ledger marks dead, so this one is reaching the page around src/lib/outbound.ts`);
  }
}

if (failures.length) {
  console.error(`[outbound-link-health] FAIL ${failures.length} problem(s) across ${checked} outbound link(s) on ${htmlPages} page(s)`);
  for (const f of failures.slice(0, 40)) console.error(`  - ${f}`);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}

const counts = (ledger.links || []).reduce((acc, l) => ({ ...acc, [l.classification]: (acc[l.classification] || 0) + 1 }), {});
console.log(`[outbound-link-health] OK outboundLinks=${checked} htmlPages=${htmlPages} ledgerAgeDays=${Math.round(ageDays)} ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(' ')} none-dead=true`);
