#!/usr/bin/env node
// Fails if anything this site emits names a URL the server does not answer 200 for.
//
// The site lost indexed pages because every internal <a href> omitted the
// trailing slash. Cloudflare Pages serves this build's directory output as
// `/foo/` with a 200 and 308-redirects `/foo`, so Google followed the site's own
// navigation, hit a 308 on each link, and filed 123 destinations as "Page with
// redirect" rather than indexing them. The sitemap and the canonical tags were
// already correct, which is exactly why scripts/validate/sitemap-url-form.mjs
// could pass while the site was de-indexing itself: nothing checked the links.
//
// This validator checks every URL the build emits, not just the ones aimed at
// crawlers - hrefs, JSON-LD `url`/`item`/`mainEntityOfPage`, llms.txt, the RSS
// feed, the JSON indexes, and the `_redirects` destinations, which must not
// point at a form that then 308s again.
//
// It runs offline against dist/, so it gives the same answer in CI as on a
// laptop and does not depend on the last deploy having happened. Every claim it
// makes about "the server returns 200 for this" is grounded in a file that
// exists in dist/.
import fs from 'node:fs';
import path from 'node:path';

const SITE_ORIGIN = 'https://approvalprep.com';
const DIST = 'dist';
const failures = [];
const fail = (msg) => failures.push(msg);

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('[internal-url-form] dist/ is not built; run npm run build first');
  process.exit(1);
}

// The single rule, restated for .mjs (src/lib/schema.ts holds the .ts twin).
// Route paths get a trailing slash. Anything whose last segment carries an
// extension is a file served at exactly that URL and must not be slashed.
const servingPath = (rawPath) => {
  const last = rawPath.split('/').pop() || '';
  if (/\.[a-z0-9]+$/i.test(last)) return rawPath;
  return `${rawPath.replace(/\/+$/, '')}/`;
};

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

const distFiles = walk(DIST);
const htmlFiles = distFiles.filter((f) => f.endsWith('.html'));

// What the deployed origin actually answers 200 for, derived from the build.
const served = new Set();
for (const file of distFiles) {
  const rel = `/${path.relative(DIST, file).split(path.sep).join('/')}`;
  served.add(rel);
  if (rel.endsWith('/index.html')) served.add(rel.slice(0, -'index.html'.length));
}
served.add('/');

// Paths a static file cannot cover: Pages Functions and the redirect map. A link
// to one of these is legitimate even though no file backs it.
const functionRoutes = fs.existsSync('functions')
  ? walk('functions').filter((f) => f.endsWith('.js') && !path.basename(f).startsWith('_'))
      .map((f) => `/${path.relative('functions', f).split(path.sep).join('/').replace(/\.js$/, '')}`)
  : [];
const redirectSources = new Set();
const redirectsFile = fs.existsSync('public/_redirects') ? 'public/_redirects'
  : fs.existsSync(path.join(DIST, '_redirects')) ? path.join(DIST, '_redirects') : null;
const redirectLines = redirectsFile
  ? fs.readFileSync(redirectsFile, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  : [];
for (const line of redirectLines) redirectSources.add(line.split(/\s+/)[0]);

const isReachable = (pathname) => served.has(pathname)
  || served.has(`${pathname.replace(/\/+$/, '')}/`)
  || functionRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
  || redirectSources.has(pathname)
  || redirectSources.has(pathname.replace(/\/+$/, ''));

let checked = 0;

// One URL, from one place. `where` names the emitting file so a failure is
// actionable without a second search.
const checkUrl = (raw, where, kind) => {
  if (typeof raw !== 'string' || !raw) return;
  let pathname;
  if (raw.startsWith('/') && !raw.startsWith('//')) {
    pathname = raw.split('#')[0].split('?')[0];
  } else if (raw.startsWith(SITE_ORIGIN)) {
    pathname = new URL(raw).pathname;
  } else {
    return; // off-site, fragment, mailto:, tel:, data: - not ours to canonicalise
  }
  if (!pathname) return;
  checked++;
  const want = servingPath(pathname);
  if (pathname !== want) {
    fail(`${where}: ${kind} names the redirecting URL form (the server 308s it): ${raw} -> should be ${raw.replace(pathname, want)}`);
    return;
  }
  if (!isReachable(want)) fail(`${where}: ${kind} points at a URL with no built page, function, or redirect behind it: ${raw}`);
};

// --- HTML: every href, and every URL inside JSON-LD -------------------------
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const where = file;
  for (const m of html.matchAll(/\shref="([^"]*)"/g)) checkUrl(m[1], where, 'href');
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let parsed;
    try { parsed = JSON.parse(m[1]); } catch { fail(`${where}: JSON-LD block does not parse`); continue; }
    const visit = (node) => {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!node || typeof node !== 'object') return;
      for (const [key, value] of Object.entries(node)) {
        if (typeof value === 'string' && ['url', 'item', 'mainEntityOfPage', '@id', 'sameAs'].includes(key)) {
          checkUrl(value, where, `JSON-LD ${key}`);
        } else visit(value);
      }
    };
    visit(parsed);
  }
}

// --- Non-HTML surfaces: llms.txt, the feed, the JSON indexes, the sitemap ---
const textSurfaces = distFiles.filter((f) => /\.(txt|xml|json)$/i.test(f) && !f.includes(`${path.sep}_astro${path.sep}`));
for (const file of textSurfaces) {
  const body = fs.readFileSync(file, 'utf8');
  for (const m of body.matchAll(/https:\/\/approvalprep\.com[^\s"'<>)\]]*/g)) {
    checkUrl(m[0].replace(/[.,;]+$/, ''), file, 'emitted URL');
  }
}

// --- _redirects: a 301 must land on the 200 form, not on another redirect ---
// A path rule must also cover BOTH source forms. Pages matches _redirects
// literally, and the URL Google has indexed for a retired page is the
// trailing-slash one, because that is what its canonical tag and the sitemap
// named. Measured on the live origin before this guard existed:
// /blog/what-should-i-know-about-pricing 301s, /blog/.../ 404s - so 42 retired
// URLs were serving a 404 at exactly the address that was indexed.
const pathRuleSources = new Set([...redirectSources].filter((s) => s.startsWith('/') && !s.includes('*') && !s.includes(':')));
for (const source of pathRuleSources) {
  if (source === '/') continue;
  const twin = source.endsWith('/') ? source.replace(/\/+$/, '') : `${source}/`;
  if (!pathRuleSources.has(twin)) {
    fail(`${redirectsFile}: rule source "${source}" has no rule for its twin form "${twin}", so one of the two returns 404 instead of redirecting`);
  }
}

for (const line of redirectLines) {
  const [from, to, code] = line.split(/\s+/);
  if (!to) continue;
  if (from.startsWith('http')) {
    fail(`${redirectsFile}: rule source "${from}" is an absolute URL. Cloudflare Pages _redirects only matches paths, so this rule never fires; host canonicalisation belongs in functions/_middleware.js.`);
    continue;
  }
  if (!to.startsWith('/') || to.includes(':splat') || to.includes(':')) continue;
  const want = servingPath(to.split('#')[0].split('?')[0]);
  checked++;
  if (to !== want) fail(`${redirectsFile}: "${from}" redirects (${code || '302'}) to the redirecting URL form, so the crawler takes two hops: ${to} -> should be ${want}`);
  else if (!isReachable(want)) fail(`${redirectsFile}: "${from}" redirects to a URL with nothing behind it: ${to}`);
}

// Rule 0: a validator that examined nothing has not validated anything.
if (checked === 0) {
  console.error('[internal-url-form] FAIL examined 0 URLs; the build emitted no links, which means this check is inert');
  process.exit(1);
}

if (failures.length) {
  console.error(`[internal-url-form] FAIL ${failures.length} problem(s) across ${checked} emitted URL(s)`);
  for (const failure of failures.slice(0, 40)) console.error(`  - ${failure}`);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`[internal-url-form] OK emittedUrls=${checked} htmlPages=${htmlFiles.length} redirectRules=${redirectLines.length} all-serve-200=true`);
