#!/usr/bin/env node
/**
 * Audit and retrofit the recommendation_summary block on published pages.
 *
 * recommendation_summary is the single most-requested block in the agent data:
 * asked for on 913 of 913 accepted recommendations, across every run
 * (.clarity/content-pattern-spec.json). It is a short statement of what the
 * page actually recommends, placed where an answer engine will reach it.
 *
 * WHERE THE REAL FIX LIVES IN THIS REPO
 * -------------------------------------
 * approvalprep is an Astro site: every page under dist/ is generated from
 * src/pages and src/components, and dist/ is gitignored. The durable change is
 * therefore src/components/RecommendationSummary.astro plus the templates that
 * render it; `npm run build` is what actually retrofits the published pages.
 * This script is the portable auditor/backstop that goes with it: it reports
 * which built pages carry the block, and can retrofit a built page that the
 * templates did not cover. Anything it applies to dist/ is overwritten by the
 * next build, so a page it has to fix is a page whose template still needs the
 * component.
 *
 * RULES
 * -----
 *  - Everything emitted is lifted from the page's own existing markup. Nothing
 *    is generated, inferred, or filled in.
 *  - A page whose recommendation cannot be located is reported and skipped
 *    rather than given a placeholder. A block that announces a gap is worse
 *    than no block: filler for readers, noise for extraction.
 *  - A page whose only candidate text is the hero lead is skipped too. Emitting
 *    it would restate the paragraph directly above the block; that case is a
 *    fold for the template to do, not something a text pass can do safely.
 *  - Idempotent: an existing block is replaced, so re-running never stacks.
 *
 * Usage: node scripts/retrofit_recommendation_summary.js [--apply] [--root DIR] [dirs...]
 *        (default target: dist)
 * Env:   RS_PANEL_CLASS  wrapper class for the block (default "card")
 */
// ESM: this repo's package.json sets "type": "module".
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const rootIdx = argv.indexOf('--root');
const ROOT = rootIdx >= 0 ? path.resolve(argv[rootIdx + 1]) : process.cwd();
const dirs = argv.filter((a, i) => !a.startsWith('--') && (rootIdx < 0 || i !== rootIdx + 1));

// dist/ is the published surface in this repo, so unlike the portable original
// it is scanned rather than skipped. Data, evidence and vendor trees are not
// published pages. Matched on top-level directories only, so that published
// sub-trees with the same name (dist/reports/) stay covered - the same scan
// decision the repo's own content validators make.
const SKIP_TOP_LEVEL = new Set([
  'node_modules', '.git', '.astro', '.wrangler', 'artifacts', 'coverage', 'reports',
  'seed-downloads', 'docs', 'prompts', 'migrations', 'deployment', 'ops', 'data',
  'templates', 'staging', 'public',
]);

// Operator, transactional and legal-policy surfaces. None of them recommends
// anything: they confirm a payment, gate a download, or state policy. They are
// the same surfaces the content-pattern contract validator excludes.
const SKIP_PAGE = /(^|\/)(404\.html|admin|download|checkout|privacy|terms|disclaimer|refund-policy|security|accessibility|ai-use-policy|credit-repair-disclaimer|editorial-policy|not-a-credit-repair-company)(\/|$)/;

const MARK = 'data-content-block="recommendation_summary"';

const strip = (h) => String(h || '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// One sentence, kept whole. Truncating mid-sentence produces exactly the kind of
// fragment that reads as broken when an answer engine quotes it.
function firstSentence(text, max = 400) {
  const t = String(text || '').trim();
  if (!t) return '';
  const m = t.match(/^(.{40,}?[.!?])(\s|$)/);
  const s = m ? m[1] : t;
  return s.length <= max ? s : '';
}

/** The hero section, which is where this repo's templates put the lead. */
function heroOf(html) {
  const m = html.match(/<section[^>]*class="[^"]*\bhero\b[^"]*"[^>]*>([\s\S]*?)<\/section>/i);
  return m ? m[1] : '';
}

/**
 * Find a panel by its label and return the prose inside it. This repo labels
 * panels two ways: an <h2>/<h3> heading, and a <p class="eyebrow"> kicker above
 * the heading. Both are matched.
 */
function panelByLabel(html, patterns) {
  const re = /<(h2|h3)[^>]*>([\s\S]*?)<\/\1>([\s\S]*?)(?=<h2|<h3|<\/section|<\/aside|<\/article|$)/gi;
  let m;
  while ((m = re.exec(html))) {
    if (!patterns.some((p) => p.test(strip(m[2]).toLowerCase()))) continue;
    const body = m[3];
    const para = body.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const item = body.match(/<li[^>]*>([\s\S]*?)<\/li>/i);
    const text = strip(para ? para[1] : (item ? item[1] : body));
    if (text) return text;
  }
  const eyebrow = /<p[^>]*class="[^"]*\beyebrow\b[^"]*"[^>]*>([\s\S]*?)<\/p>([\s\S]*?)(?=<p[^>]*class="[^"]*\beyebrow\b|<\/section>|<\/aside>|$)/gi;
  while ((m = eyebrow.exec(html))) {
    if (!patterns.some((p) => p.test(strip(m[1]).toLowerCase()))) continue;
    const rest = m[2].replace(/<h[23][^>]*>[\s\S]*?<\/h[23]>/i, '');
    const para = rest.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const text = strip(para ? para[1] : rest);
    if (text) return text;
  }
  return '';
}

/** The recommendation itself, in the page's own words. */
function recommendationOf(html) {
  const named = panelByLabel(html, [
    /^what this page recommends/, /^recommendation/, /^short answer/, /^plain answer/,
    /^quick answer/, /^direct answer/, /^bottom line/, /^the short answer/
  ]);
  if (named) { const s = firstSentence(named); if (s) return s; }

  // The hero's supporting line sits under the lead and usually states the move
  // the page is recommending. The lead itself is deliberately not used: the
  // block would sit directly beneath it and restate it.
  const hero = heroOf(html);
  const supporting = hero.match(/<p[^>]*class="[^"]*supporting-copy[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
  if (supporting) { const s = firstSentence(strip(supporting[1])); if (s) return s; }

  // A hero-side panel carries a self-contained statement on the guide templates.
  // Panels that label themselves as a boundary, a limitation or an evidence
  // note are excluded: they state what the page does NOT do, which is not a
  // recommendation and must never be presented as one.
  const panel = hero.match(/<aside[^>]*class="[^"]*hero-panel[^"]*"[^>]*>([\s\S]*?)<\/aside>/i);
  const panelLabel = panel ? strip((panel[1].match(/<p[^>]*class="[^"]*eyebrow[^"]*"[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || '') : '';
  if (panel && !/boundary|limitation|evidence|disclaimer|policy|privacy/i.test(panelLabel)) {
    const para = panel[1].match(/<p[^>]*>(?![\s\S]{0,10}class="[^"]*eyebrow)([\s\S]*?)<\/p>/i);
    const paras = [...panel[1].matchAll(/<p[^>]*class="(?![^"]*eyebrow)[^"]*"[^>]*>([\s\S]*?)<\/p>|<p>([\s\S]*?)<\/p>/gi)];
    const text = strip((paras[0] && (paras[0][1] || paras[0][2])) || (para ? para[1] : ''));
    const s = firstSentence(text);
    if (s) return s;
  }
  return '';
}

function heroPrimaryCta(html) {
  const hero = heroOf(html);
  const m = hero.match(/<a\b[^>]*class="[^"]*primary-button[^"]*"[^>]*href="([^"#][^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
    || hero.match(/<a\b[^>]*href="([^"#][^"]*)"[^>]*class="[^"]*primary-button[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
  if (!m) return null;
  const label = strip(m[2]);
  return label ? { href: m[1], label } : null;
}

function buildBlock(html, cls) {
  const rec = recommendationOf(html);
  if (!rec) return null;
  const who = firstSentence(panelByLabel(html, [/^who this is for/, /^best fit/, /^who it'?s for/, /^ideal for/]));
  const cta = heroPrimaryCta(html);
  const points = [];
  if (who) points.push(`<li><strong>Best for:</strong> ${esc(who)}</li>`);
  if (cta) points.push(`<li><strong>Next step:</strong> <a href="${cta.href}">${esc(cta.label)}</a></li>`);
  return '<section class="band recommendation-summary-band"><div class="shell">'
    + `<article class="${cls} recommendation-summary" id="recommendation-summary" ${MARK} data-bhpc-agent-block="recommendation_summary">`
    + '<p class="eyebrow">Recommendation</p>'
    + '<h2>What this page recommends</h2>'
    + `<p class="recommendation-summary-statement">${esc(rec)}</p>`
    + (points.length ? `<ul class="compact-list">${points.join('')}</ul>` : '')
    + '</article></div></section>';
}

/** Insert high on the page: 55% of AI Overview citations come from the first 30%. */
function insert(html, block) {
  const already = html.match(/<section class="band recommendation-summary-band">[\s\S]*?<\/section>/i);
  if (already) return html.replace(already[0], block);
  // After the hero section, which is where every template in this repo opens.
  const hero = html.match(/<section[^>]*class="[^"]*\bhero\b[^"]*"[^>]*>[\s\S]*?<\/section>/i);
  if (hero) {
    const at = html.indexOf(hero[0]) + hero[0].length;
    return html.slice(0, at) + block + html.slice(at);
  }
  const h1end = html.search(/<\/h1>/i);
  if (h1end < 0) return null;
  const close = html.indexOf('</section>', h1end);
  if (close < 0) return null;
  return html.slice(0, close + 10) + block + html.slice(close + 10);
}

function walk(dir, out = [], depth = 0) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (depth === 0 && SKIP_TOP_LEVEL.has(e.name)) continue;
      walk(full, out, depth + 1);
      continue;
    }
    if (e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const CLS = process.env.RS_PANEL_CLASS || 'card';
// Targets are walked from the given roots; the top-level skip list applies to
// the repo root, not to a published sub-tree passed in explicitly.
const targets = (dirs.length ? dirs : ['dist']).flatMap((d) => walk(path.resolve(ROOT, d), [], d === '.' ? 0 : 1));
let present = 0, added = 0, replaced = 0;
const skipped = [];
const excluded = [];
for (const file of targets) {
  const rel = path.relative(ROOT, file);
  if (SKIP_PAGE.test(rel)) { excluded.push(rel); continue; }
  const html = fs.readFileSync(file, 'utf8');
  if (!/<h1[\s>]/i.test(html)) { excluded.push(rel); continue; }
  const had = html.includes(MARK);
  if (had && !APPLY) { present++; continue; }
  const block = buildBlock(html, CLS);
  if (!block) { had ? present++ : skipped.push(rel); continue; }
  if (had) { present++; continue; } // template-rendered block wins; never overwrite it
  const next = insert(html, block);
  if (!next || next === html) { skipped.push(rel); continue; }
  if (APPLY) fs.writeFileSync(file, next);
  added++;
}
console.log(`recommendation_summary: present=${present} added=${added} replaced=${replaced} skipped=${skipped.length} excluded=${excluded.length} (${APPLY ? 'APPLIED' : 'dry run'})`);
if (skipped.length) {
  console.log('no recommendation could be lifted from the page - left unchanged rather than filled:');
  for (const s of skipped.slice(0, 25)) console.log('  ' + s);
  if (skipped.length > 25) console.log(`  ... and ${skipped.length - 25} more`);
}
