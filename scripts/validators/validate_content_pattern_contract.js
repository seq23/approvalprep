#!/usr/bin/env node
// Enforce the blocks the external review agent keeps asking for.
//
// Across ~2,750 recommendations audited on two sibling sites, the agent asks for
// the same small set of things over and over. 27% of distinct defects were
// re-reported on later runs despite being marked released - the same page
// missing the same block, found again. This checks for those blocks before
// publish instead of after audit.
//
// Derived from the recommendations themselves (.clarity/content-pattern-spec.json):
//
//   1 checklist / numbered protocol      730 occurrences (36.4%)
//   2 comparison / decision / cost table 529 (26.4%)
//   3 direct-answer block                512 (25.5%)
//   5 concrete numbers                   365 (18.2%)
//   6 named primary sources              288 (14.3%)
//   7 query present in a heading         261 (13.0%)
//   9 FAQ block                          136 (6.8%)
//  10 structured data                     70 (3.5%)
//
// Severity is split. The blocks that decide whether a page can be quoted at all
// block the release; the rest report as gaps so they can be worked without
// stopping a release.
//
// This repo measured ZERO blocking failures on its first run, so the blocking
// checks are enforced (HARD_FAIL). The reported gaps - comparison_table 3.8%,
// named_sources 5.7%, faq 50.5% - are real backlog, not a reason to relax.
//
// Same scan decisions as the instruction-leak and empty-cell guards: dist/ is
// the published surface and is scanned, and the skip list applies to top-level
// directories only so dist/templates/ and dist/reports/ stay covered.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const EVIDENCE = path.join(ROOT, 'artifacts/validation/content-pattern-contract.json');
const ENFORCEMENT = 'block'; // 'block' | 'report'
const SKIP_TOP_LEVEL = new Set([
  'node_modules', '.git', 'data', 'artifacts', 'reports', 'staging', 'templates',
  'prompts', 'docs', 'migrations', 'seed-downloads', 'ops', 'deployment',
]);

// Legal, transactional and operator surfaces. None of them answer a search
// query, so holding them to a direct-answer contract would measure nothing.
const SKIP_FILES = new Set([
  // Not an answer surface: it exists so Cloudflare Pages returns a real 404
  // instead of falling back to index.html under a 200.
  'dist/404.html',
  'dist/disclaimer/index.html',
  'dist/privacy/index.html',
  'dist/terms/index.html',
  'dist/security/index.html',
  'dist/accessibility/index.html',
  'dist/ai-use-policy/index.html',
  'dist/credit-repair-disclaimer/index.html',
  'dist/editorial-policy/index.html',
  'dist/admin/index.html',
  'dist/download/index.html',
  'dist/checkout/success/index.html',
]);

// Hub and commerce indexes are navigational: "Pricing", "Blog" and "Resources"
// are the correct h1 there. Content pages have no such excuse - a topic-label
// h1 carries none of the phrasing a person typed, the agent's #7 finding.
const NAV_INDEXES = new Set([
  'dist/index.html', 'dist/pricing/index.html', 'dist/blog/index.html',
  'dist/resources/index.html', 'dist/tools/index.html', 'dist/templates/index.html',
  'dist/reports/index.html',
]);

const text = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// This repo's direct-answer block is the hero lead paragraph: <p class="lead">
// carries the self-contained answer to the page's question, above the fold.
const DIRECT_ANSWER = /data-direct-answer=|class="[^"]*(?:answer-box|lead)\b/i;
// The real conversion destination: the Stripe checkout surface reached from the
// kit pages, not a content hub.
const CONVERSION = /create-checkout-session|href="\/checkout|href="\/pricing"|complete-approvalprep-bundle/i;

const CHECKS = [
  { id: 'direct_answer', blocking: true,
    test: (h) => DIRECT_ANSWER.test(h),
    why: 'no direct-answer block - nothing here is quotable without surrounding context' },
  { id: 'query_in_heading', blocking: true,
    appliesTo: (rel) => !NAV_INDEXES.has(rel),
    test: (h) => { const m = h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i); return Boolean(m && text(m[1]).length > 10); },
    why: 'h1 missing or too short to carry the searcher phrasing' },
  { id: 'no_empty_table_cells', blocking: true,
    test: (h) => !/<t[dh][^>]*>\s*<\/t[dh]>/i.test(h),
    why: 'table ships empty cells - the agent calls these impossible to cite' },
  { id: 'conversion_path', blocking: true,
    test: (h) => CONVERSION.test(h),
    why: 'no conversion path - an answer-engine citation lands with nowhere to go' },
  { id: 'checklist', blocking: false,
    test: (h) => /<ol[\s>]|<ul[\s>]/i.test(h),
    why: 'no checklist or numbered protocol (agent request #1, 730 occurrences)' },
  { id: 'comparison_table', blocking: false,
    test: (h) => /<table[\s>]/i.test(h),
    why: 'no comparison or cost table (agent request #2, 529 occurrences)' },
  { id: 'concrete_numbers', blocking: false,
    test: (h) => /\$\s?\d|\d+\s?(?:days?|weeks?|months?|years?|hours?|minutes?)\b/i.test(text(h)),
    why: 'no concrete cost or timeline figures (agent request #5, 365 occurrences)' },
  { id: 'named_sources', blocking: false,
    test: (h) => /data-source|Primary sources|Sources?:/i.test(h)
      || /<a[^>]+href="https?:\/\/(?!(?:www\.)?approvalprep\.)/i.test(h),
    why: 'no named primary source (agent request #6, 288 occurrences)' },
  { id: 'faq', blocking: false,
    test: (h) => /FAQPage|data-faq|class="[^"]*faq/i.test(h),
    why: 'no FAQ block or FAQPage schema (agent request #9)' },
  { id: 'structured_data', blocking: false,
    test: (h) => /application\/ld\+json/i.test(h),
    why: 'no JSON-LD structured data (agent request #10)' },
];

const pages = [];
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
    const rel = path.relative(ROOT, abs);
    if (SKIP_FILES.has(rel)) continue;
    pages.push(rel);
  }
})(ROOT, 0);
pages.sort();

const blockingFailures = [];
const gaps = {};
for (const check of CHECKS) gaps[check.id] = [];

for (const rel of pages) {
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const check of CHECKS) {
    if (typeof check.appliesTo === 'function' && !check.appliesTo(rel)) continue;
    if (check.test(html)) continue;
    if (check.blocking) blockingFailures.push({ path: rel, check: check.id, why: check.why });
    else gaps[check.id].push(rel);
  }
}

const summary = CHECKS.map((check) => {
  const missing = check.blocking
    ? blockingFailures.filter((f) => f.check === check.id).length
    : gaps[check.id].length;
  return {
    id: check.id,
    blocking: check.blocking,
    pagesMissing: missing,
    coveragePct: Number((100 * (1 - missing / Math.max(pages.length, 1))).toFixed(1)),
    why: check.why,
  };
});

fs.mkdirSync(path.dirname(EVIDENCE), { recursive: true });
fs.writeFileSync(EVIDENCE, `${JSON.stringify({
  schemaVersion: '1.0.0',
  validator: 'content-pattern-contract',
  spec: '.clarity/content-pattern-spec.json',
  generatedAt: new Date().toISOString(),
  enforcement: ENFORCEMENT,
  pagesChecked: pages.length,
  status: blockingFailures.length ? (ENFORCEMENT === 'block' ? 'FAIL' : 'REPORTED') : 'PASS',
  blockingFailures: blockingFailures.length,
  summary,
  worstGaps: Object.fromEntries(Object.entries(gaps).map(([k, v]) => [k, v.slice(0, 25)])),
  blockingBacklog: blockingFailures.slice(0, 200),
}, null, 2)}\n`);

if (!pages.length) {
  console.log('[content-pattern-contract] OK but no built HTML found; run npm run build for a real check');
  process.exit(0);
}
console.log(`[content-pattern-contract] ${pages.length} pages checked (enforcement: ${ENFORCEMENT})`);
for (const s of summary) {
  const tag = s.blocking ? 'BLOCKING' : 'gap     ';
  console.log(`  ${tag} ${s.id.padEnd(22)} coverage ${String(s.coveragePct).padStart(5)}%  missing on ${s.pagesMissing}`);
}
if (blockingFailures.length) {
  const log = ENFORCEMENT === 'block' ? console.error : console.warn;
  log(`[content-pattern-contract] ${blockingFailures.length} blocking gap(s)`);
  for (const f of blockingFailures.slice(0, 15)) log(`  ${f.path} :: ${f.why}`);
  if (blockingFailures.length > 15) log(`  ...and ${blockingFailures.length - 15} more`);
  if (ENFORCEMENT === 'block') process.exit(1);
  console.warn('  reported, not blocking, while the backlog above is worked.');
  process.exit(0);
}
console.log('[content-pattern-contract] OK');
