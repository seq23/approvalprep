#!/usr/bin/env node
// Measures whether every outbound link this site emits still resolves, and
// writes the answer to data/citations/outbound_link_health.json.
//
// Why this exists. Ahrefs crawled approvalprep.com on 2026-09-03 and reported
// "Page has links to broken page: 11 URLs". Every one of the site's 116 distinct
// internal link targets answered 200 directly, so this was not the trailing-slash
// defect fixed on 2026-09-01. The 11 were 11 pages that cite an *external* URL
// which has since 4xx'd: HUD renamed form 52517.pdf, three property-management
// PDFs in the Document Readiness Index corpus were withdrawn.
//
// The root cause was that nothing ever re-checked them. Outbound URLs come
// straight out of checked-in JSON - data/citations/source_registry.json,
// data/content/*_pages.json, data/reports/document_readiness_index/coded_dataset.json -
// and their `last_reviewed_at` / `accessDate` fields are hand-set dates, not
// measured HTTP statuses. A source could be withdrawn and the site would keep
// linking to it forever, because "reviewed on 2026-07-30" says nothing about
// what the URL returns today.
//
// The measurement is deliberately not part of `npm run build` or the validate
// lane: those must give the same answer offline as they do online. This probe
// touches the network, records what it saw, and the offline validator
// (scripts/validate/outbound-link-health.mjs) gates the build on that record.
//
// Classification. `dead` is the only class that suppresses a link, so the bar
// for it is a status that *means removed*, not merely "we did not get the page":
//   live             2xx to a browser UA or to Googlebot. The link works.
//   dead             404 or 410 to both. The document is gone. Confirmed.
//   crawler_blocked  401/403/429, never 404. The page exists and the origin's WAF
//                    refuses automated clients - every one of ssa.gov, dol.gov,
//                    dfas.mil, fanniemae and the rest refuses its own root the
//                    same way, which is what proves it is a bot rule and not a
//                    broken page. Dropping an official government citation to
//                    satisfy someone else's WAF would make the page worse, so
//                    these stay linked and stay honestly labelled.
//   unreachable      5xx, a redirect loop, or no response. Suspected, never
//                    acted on. This job runs weekly and unattended; a bad minute
//                    at someone else's origin must not permanently delete a
//                    citation.
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { collectOutboundLinks, LEDGER_PATH, DIST } from '../lib/outbound-links.mjs';

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const TIMEOUT_MS = 30_000;
const CONCURRENCY = 8;

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('[probe-outbound-links] dist/ is not built; run npm run build first');
  process.exit(1);
}

// curl, not fetch(). Node's undici raises an unhandled 'error' event on an
// HTTP/2 socket a hostile origin closes mid-stream, which kills the process
// rather than returning a status - and origins that close on a crawler are
// precisely the population this probe exists to measure. curl reports the same
// failure as an exit code and keeps going.
const fetchStatus = (url, ua) => new Promise((resolve) => {
  execFile('curl', [
    '-s', '-L', '-o', '/dev/null', '-w', '%{http_code}',
    '--max-time', String(TIMEOUT_MS / 1000),
    '-A', ua,
    '-H', 'Accept: text/html,application/xhtml+xml,application/pdf,*/*',
    '-H', 'Accept-Language: en-US,en;q=0.9',
    url,
  ], { timeout: TIMEOUT_MS + 5_000 }, (err, stdout) => {
    const code = Number.parseInt(String(stdout || '').trim(), 10);
    resolve(Number.isFinite(code) ? code : 0);
  });
});

const classify = async (url) => {
  const browser = await fetchStatus(url, BROWSER_UA);
  if (browser >= 200 && browser < 300) return { classification: 'live', httpStatus: browser, evidence: 'browser-ua' };

  const bot = await fetchStatus(url, BOT_UA);
  if (bot >= 200 && bot < 300) return { classification: 'live', httpStatus: bot, evidence: 'googlebot-ua' };

  const seen = [browser, bot].filter(Boolean);
  if (seen.some((s) => s === 404 || s === 410)) {
    return { classification: 'dead', httpStatus: seen.find((s) => s === 404 || s === 410), evidence: `browser=${browser} googlebot=${bot}` };
  }
  if (seen.some((s) => [401, 403, 429].includes(s))) {
    return { classification: 'crawler_blocked', httpStatus: seen[0], evidence: `browser=${browser} googlebot=${bot}` };
  }
  // Anything else - 5xx, a redirect loop, or no response at all - is a bad
  // minute at someone else's origin, not proof the document is gone. This runs
  // weekly and unattended, and `dead` suppresses a link permanently, so only a
  // status that *means* removed is allowed to produce it. Acting on 404/410
  // alone is the difference between a confirmed finding and a suspected one.
  const rootStatus = seen.length ? null : await fetchStatus(new URL(url).origin + '/', BROWSER_UA);
  return {
    classification: 'unreachable',
    httpStatus: seen[0] || 0,
    evidence: seen.length
      ? `non-2xx that does not mean removed: browser=${browser} googlebot=${bot}`
      : `no response; origin root ${new URL(url).origin}/ answered ${rootStatus || 'nothing either'}`,
  };
};

const { links, htmlPages } = collectOutboundLinks();

const previous = fs.existsSync(LEDGER_PATH) ? JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8')) : { links: [] };
const previousById = new Map((previous.links || []).map((l) => [l.url, l]));

// The probe measures the union of what the build emits and what the ledger
// already knows, not just what the build emits.
//
// Without the second half this loop oscillates. A URL marked `dead` is
// suppressed by src/lib/outbound.ts, so it is no longer an <a href> in dist; a
// dist-only probe would then drop it from the ledger, the suppression would lift
// on the next build, and the dead link would ship again. Carrying prior URLs
// forward makes `dead` stick - and re-probing them each run is what lets a source
// that comes back reclaim its link instead of being suppressed forever.
const urls = [...new Set([...links.keys(), ...previousById.keys()])].sort();
if (!urls.length) {
  console.error(`[probe-outbound-links] FAIL found 0 outbound links across ${htmlPages} built page(s); the extractor is not seeing this build`);
  process.exit(1);
}

const results = new Map();
let cursor = 0;
const worker = async () => {
  while (cursor < urls.length) {
    const url = urls[cursor++];
    results.set(url, await classify(url));
  }
};
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));

const checkedAt = new Date().toISOString();
const ledgerLinks = urls.map((url) => {
  const r = results.get(url);
  const prior = previousById.get(url);
  return {
    url,
    classification: r.classification,
    httpStatus: r.httpStatus,
    evidence: r.evidence,
    checkedAt,
    firstSeenAt: prior?.firstSeenAt || checkedAt,
    // Empty when the build no longer emits an <a href> for this URL - which is
    // exactly what a suppressed `dead` link looks like. The entry is kept so the
    // suppression holds and so a revived source can be noticed.
    citedBy: [...(links.get(url) || [])].sort(),
    emittedAsLink: links.has(url),
  };
});

const counts = ledgerLinks.reduce((acc, l) => ({ ...acc, [l.classification]: (acc[l.classification] || 0) + 1 }), {});

fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
fs.writeFileSync(LEDGER_PATH, `${JSON.stringify({
  schemaVersion: 1,
  generatedAt: checkedAt,
  measuredBy: 'scripts/seo/probe-outbound-links.mjs',
  note: 'Measured HTTP status of every outbound <a href> in dist/. `dead` suppresses the hyperlink at render time; nothing else does.',
  counts,
  links: ledgerLinks,
}, null, 2)}\n`);

console.log(`[probe-outbound-links] wrote ${LEDGER_PATH} links=${ledgerLinks.length} ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(' ')}`);
for (const l of ledgerLinks.filter((x) => x.classification !== 'live')) {
  console.log(`  ${l.classification} ${l.httpStatus} ${l.url}  (${l.evidence})`);
}
