#!/usr/bin/env node
/**
 * Sørensen-Dice similarity on the <main> text of every built page.
 *
 * Near-duplicate rate on this site was measured at 81.0%: the same body copy
 * republished with the query swapped. A new page that scores >= 0.80 against an
 * existing one is not a new answer, it is the old answer under a new URL, and
 * both pages lose. This measures that before the commit rather than after the
 * crawl.
 *
 * Usage:
 *   node scripts/analysis/main_dice_similarity.mjs                  # full matrix, worst pairs
 *   node scripts/analysis/main_dice_similarity.mjs /a/ /b/ ...      # score the named paths against everything else
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const DIST = path.join(ROOT, 'dist');
const THRESHOLD = 0.80;

const mainText = (html) => {
  const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const body = m ? m[1] : html;
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const bigrams = (words) => {
  const set = new Set();
  for (let i = 0; i < words.length - 1; i += 1) set.add(`${words[i]} ${words[i + 1]}`);
  return set;
};

const dice = (a, b) => {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const gram of small) if (large.has(gram)) shared += 1;
  return (2 * shared) / (a.size + b.size);
};

const pages = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(abs); continue; }
    if (entry.name !== 'index.html') continue;
    const route = `/${path.relative(DIST, abs).replace(/index\.html$/, '')}`;
    const words = mainText(fs.readFileSync(abs, 'utf8')).split(' ').filter(Boolean);
    pages.push({ route, words: words.length, grams: bigrams(words) });
  }
})(DIST);
pages.sort((a, b) => a.route.localeCompare(b.route));

const targets = process.argv.slice(2).map((p) => (p.endsWith('/') ? p : `${p}/`));
const scored = targets.length ? pages.filter((p) => targets.includes(p.route)) : pages;

if (targets.length) {
  const missing = targets.filter((t) => !scored.some((p) => p.route === t));
  if (missing.length) {
    console.error(`not built: ${missing.join(', ')} — run npm run build first`);
    process.exit(1);
  }
}

let worst = 0;
let failures = 0;
for (const page of scored) {
  let top = { route: '', score: 0 };
  for (const other of pages) {
    if (other.route === page.route) continue;
    const score = dice(page.grams, other.grams);
    if (score > top.score) top = { route: other.route, score };
  }
  worst = Math.max(worst, top.score);
  const flag = top.score >= THRESHOLD ? 'FAIL' : 'ok  ';
  if (top.score >= THRESHOLD) failures += 1;
  console.log(`${flag} ${top.score.toFixed(3)}  ${page.route}  (${page.words} words)  nearest: ${top.route}`);
}

console.log(`\npages scored: ${scored.length}  corpus: ${pages.length}  worst: ${worst.toFixed(3)}  threshold: ${THRESHOLD}  failures: ${failures}`);
process.exit(failures ? 1 : 0);
