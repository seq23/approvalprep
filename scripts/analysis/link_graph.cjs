#!/usr/bin/env node
/**
 * Internal link-graph / orphan / click-depth analyser.
 *
 * Usage: node link_graph.js <root-dir> [--json] [--list-orphans] [--ignore=re,re]
 *
 * Why this exists: the set of pages a search engine indexes tracks the set of
 * pages with inbound internal links far more closely than it tracks the sitemap.
 * Counting that reliably is easy to get wrong, because an href is written
 * "/foo" while the file on disk is "foo/index.html" or "foo.html", and trailing
 * slashes disagree between the two. Both sides are normalised to a canonical
 * key here so the number means something.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const root = path.resolve(args.find(a => !a.startsWith('--')) || '.');
const asJson = args.includes('--json');
const listOrphans = args.includes('--list-orphans');
const ignoreArg = (args.find(a => a.startsWith('--ignore=')) || '').slice('--ignore='.length);
const ignorePatterns = ignoreArg ? ignoreArg.split(',').filter(Boolean).map(p => new RegExp(p)) : [];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/** Canonical key for a page: path with no extension, no index, no trailing slash. */
function keyForFile(file) {
  let rel = path.relative(root, file).split(path.sep).join('/');
  rel = rel.replace(/index\.html$/, '').replace(/\.html$/, '');
  rel = rel.replace(/\/$/, '');
  return '/' + rel;
}

/** Canonical key for an href, resolved relative to the page containing it. */
function keyForHref(href, fromKey) {
  let h = href.trim();
  if (!h) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(h)) return null;   // absolute scheme, mailto:, tel:
  if (h.startsWith('//')) return null;               // protocol-relative external
  if (h.startsWith('#')) return null;                // same-page fragment
  h = h.split('#')[0].split('?')[0];
  if (!h) return null;
  let abs;
  if (h.startsWith('/')) abs = h;
  else {
    const base = fromKey === '/' ? '/' : fromKey + '/';
    abs = path.posix.normalize(path.posix.join(base, h));
  }
  abs = abs.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  if (abs.length > 1) abs = abs.replace(/\/$/, '');
  return abs || '/';
}

const files = walk(root).filter(f => !ignorePatterns.some(re => re.test(path.relative(root, f))));
const pages = new Map(); // key -> file
for (const f of files) {
  const k = keyForFile(f);
  if (!pages.has(k)) pages.set(k, f);
}

const ANCHOR = /<a\b[^>]*?\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const outLinks = new Map(); // key -> Set(key)
const inLinks = new Map();  // key -> Set(key)
for (const k of pages.keys()) { outLinks.set(k, new Set()); inLinks.set(k, new Set()); }

for (const [k, file] of pages) {
  const html = fs.readFileSync(file, 'utf8');
  let m;
  ANCHOR.lastIndex = 0;
  while ((m = ANCHOR.exec(html))) {
    const href = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4];
    const target = keyForHref(href, k);
    if (!target || !pages.has(target) || target === k) continue;
    outLinks.get(k).add(target);
    inLinks.get(target).add(k);
  }
}

// Click depth by BFS from '/'.
const depth = new Map();
if (pages.has('/')) {
  depth.set('/', 0);
  let frontier = ['/'];
  while (frontier.length) {
    const next = [];
    for (const node of frontier) {
      for (const t of outLinks.get(node)) {
        if (!depth.has(t)) { depth.set(t, depth.get(node) + 1); next.push(t); }
      }
    }
    frontier = next;
  }
}

const orphans = [...pages.keys()].filter(k => k !== '/' && inLinks.get(k).size === 0);
const inCounts = [...pages.keys()].filter(k => k !== '/').map(k => inLinks.get(k).size).sort((a, b) => a - b);
const median = inCounts.length ? (inCounts.length % 2 ? inCounts[(inCounts.length - 1) / 2]
  : (inCounts[inCounts.length / 2 - 1] + inCounts[inCounts.length / 2]) / 2) : 0;
const avg = inCounts.length ? inCounts.reduce((a, b) => a + b, 0) / inCounts.length : 0;

const depthDist = {};
for (const k of pages.keys()) {
  const d = depth.has(k) ? depth.get(k) : 'unreachable';
  depthDist[d] = (depthDist[d] || 0) + 1;
}
const within3 = [...pages.keys()].filter(k => depth.has(k) && depth.get(k) <= 3).length;

const result = {
  root, pages: pages.size, orphans: orphans.length,
  medianInbound: median, avgInbound: Number(avg.toFixed(2)),
  totalInternalLinks: [...outLinks.values()].reduce((a, s) => a + s.size, 0),
  depthDistribution: depthDist, within3Clicks: within3,
  unreachable: pages.size - depth.size,
};
if (listOrphans) result.orphanList = orphans.sort();

if (asJson) { console.log(JSON.stringify(result, null, 2)); }
else {
  console.log(`root: ${root}`);
  console.log(`pages: ${result.pages}`);
  console.log(`orphans (0 inbound internal links): ${result.orphans}`);
  console.log(`median inbound: ${result.medianInbound}   average inbound: ${result.avgInbound}`);
  console.log(`total internal page-to-page links: ${result.totalInternalLinks}`);
  console.log(`reachable within 3 clicks of /: ${result.within3Clicks} / ${result.pages}`);
  console.log(`unreachable from /: ${result.unreachable}`);
  console.log('click-depth distribution:');
  for (const d of Object.keys(depthDist).sort((a, b) => (a === 'unreachable') - (b === 'unreachable') || a - b)) {
    console.log(`  depth ${d}: ${depthDist[d]}`);
  }
  if (listOrphans) { console.log('orphans:'); orphans.sort().forEach(o => console.log('  ' + o)); }
}
