#!/usr/bin/env node
// Fails if a sitemap entry does not name the URL form the server returns 200 for.
//
// This build emits directory output, so Cloudflare Pages serves the file
// dist/<path>/index.html at /<path>/ with a 200 and 308-redirects /<path>.
// "The 200-serving form" is therefore a fact about the built output, and this
// validator checks it offline against dist/ rather than over the network, so it
// gives the same answer in CI as on a laptop and does not depend on the last
// deploy having happened.
//
// It also cross-checks each entry against the canonical tag on the page it
// names. The original defect survived because the sitemap, the canonical tags
// and scripts/validate/discovery-surfaces.mjs all encoded the same wrong rule
// and agreed with each other; measured against the live origin, 104 of 111
// entries returned 308. Checking sitemap against page, and both against the
// file that actually exists, means one of them being wrong is now a failure.
import fs from 'node:fs';
import path from 'node:path';

const failures = [];
const fail = (msg) => failures.push(msg);

const SITE_ORIGIN = 'https://approvalprep.com';
const DIST = 'dist';

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('[sitemap-url-form] dist/ is not built; run npm run build first');
  process.exit(1);
}

const sitemapPath = fs.existsSync(path.join(DIST, 'sitemap.xml')) ? path.join(DIST, 'sitemap.xml') : 'public/sitemap.xml';
const sitemap = fs.readFileSync(sitemapPath, 'utf8');
const entries = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!entries.length) fail('sitemap contains no <loc> entries');

const servingForm = (input) => `${SITE_ORIGIN}${new URL(input, SITE_ORIGIN).pathname.replace(/\/+$/, '')}/`;

for (const entry of entries) {
  let pathname;
  try { pathname = new URL(entry).pathname; } catch { fail(`sitemap entry is not a URL: ${entry}`); continue; }

  if (new URL(entry).origin !== SITE_ORIGIN) fail(`sitemap entry is off-origin: ${entry}`);

  // A sitemap lists indexable HTML pages. Feeds such as /llms.txt and /feed.xml
  // are still built and still served; they are simply not pages.
  if (/\.[a-z0-9]+$/i.test(pathname)) fail(`sitemap lists a non-HTML file, which is not an indexable page: ${entry}`);

  if (entry !== servingForm(entry)) fail(`sitemap entry names the redirecting URL form; the server 308s it: ${entry} -> ${servingForm(entry)}`);

  const page = path.join(DIST, pathname, 'index.html');
  if (!fs.existsSync(page)) {
    fail(`sitemap entry has no built page, so this URL does not return 200: ${entry} (expected ${page})`);
    continue;
  }

  const html = fs.readFileSync(page, 'utf8');
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (!canonical) fail(`built page has no canonical tag: ${page}`);
  else if (canonical !== entry) fail(`sitemap entry and the page's own canonical disagree: sitemap ${entry} vs canonical ${canonical}`);
}

// The reverse direction: an indexable page must not canonicalise to a URL the
// server redirects, whether or not it is listed in the sitemap.
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
let canonicalsChecked = 0;
for (const file of walk(DIST).filter((f) => f.endsWith('.html'))) {
  const html = fs.readFileSync(file, 'utf8');
  // dist/404.html self-canonicalises to /404.html and is noindex by design.
  if (/<meta name="robots" content="[^"]*noindex/i.test(html)) continue;
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (!canonical) continue;
  canonicalsChecked++;
  if (canonical !== servingForm(canonical)) fail(`indexable page canonicalises to the redirecting URL form: ${file} -> ${canonical}`);
  const ogUrl = (html.match(/property="og:url" content="([^"]+)"/) || [])[1];
  if (ogUrl && ogUrl !== canonical) fail(`og:url disagrees with the canonical tag: ${file} (${ogUrl} vs ${canonical})`);
}

if (failures.length) {
  console.error(`[sitemap-url-form] FAIL ${failures.length} problem(s)`);
  for (const failure of failures.slice(0, 40)) console.error(`  - ${failure}`);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`[sitemap-url-form] OK entries=${entries.length} all-serve-200=true indexableCanonicals=${canonicalsChecked} source=${sitemapPath}`);
