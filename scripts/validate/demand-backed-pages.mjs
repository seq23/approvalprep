#!/usr/bin/env node
/**
 * Fails the build on the three ways a page fan-out goes wrong:
 *
 *   1. a URL in the sitemap that nothing renders;
 *   2. a route registered as indexable whose copy is the page-factory template
 *      with the query interpolated - filler wearing an indexable route;
 *   3. a route created by the factory with no demand record behind it.
 *
 * Check 1 already passes here and has for a while: `scripts/seo/generate-sitemap.mjs`
 * and the Astro collections apply the same `status === "published_by_contract"`
 * test, so this repo has none of dream-wedding-builder's renderer/sitemap
 * divergence. The check exists anyway, because the reason it passes is that two
 * files happen to agree today, and a validator is how that stays true.
 *
 * Checks 2 and 3 are scoped to routes whose `source` is `page_factory`. Routes
 * that predate the factory were written by hand and are not in scope for a gate
 * about machine generation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasDemand, allRecords } from '../lib/demand_gate.mjs';
import { requireBuildOutput } from './_common.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const errors = [];
const notes = [];

const manifest = read('data/routes/route_manifest.json');
const registry = read('data/content/page_registry.json');
const routeCopy = read('data/content/generated_route_copy.json');

// --- 1. every sitemap URL renders -------------------------------------------
// This check is the whole reason the validator reads the built tree, and it used
// to disappear without failing: `else if (!exists('dist'))` pushed a `note:` and
// skipped, so on a bare checkout the validator printed OK having compared zero
// sitemap URLs against zero built pages. That is the same shape of silence as a
// missing assertion. The build is validator 1 of the registry, so dist/ is
// present in every lane that runs it; a lane where it is absent is a broken lane
// and must say so.
const DIST = requireBuildOutput('demand-backed-pages');
const sitemapRel = exists(`${DIST}/sitemap.xml`) ? `${DIST}/sitemap.xml` : 'public/sitemap.xml';
if (!exists(sitemapRel)) {
  errors.push(`no sitemap at ${DIST}/sitemap.xml or public/sitemap.xml, so sitemap-to-render parity cannot be checked. Run \`npm run seo:sitemap\`.`);
} else {
  const xml = fs.readFileSync(path.join(ROOT, sitemapRel), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (locs.length === 0) {
    // An empty sitemap makes the loop below vacuous, and a vacuous loop reports
    // the same "all render" as a healthy one.
    errors.push(`${sitemapRel} contains zero <loc> entries; refusing to report sitemap parity over an empty URL set`);
  } else {
    const missing = [];
    for (const loc of locs) {
      let p;
      try { p = new URL(loc).pathname; } catch { p = loc; }
      p = p.replace(/^\//, '').replace(/\/$/, '');
      const candidates = p === '' ? [`${DIST}/index.html`] : [`${DIST}/${p}`, `${DIST}/${p}.html`, `${DIST}/${p}/index.html`];
      if (!candidates.some(exists)) missing.push(`/${p}`);
    }
    if (missing.length) {
      errors.push(`${missing.length} sitemap URL(s) have no built page, e.g. ${missing.slice(0, 5).join(', ')}`);
    } else {
      notes.push(`sitemap parity: ${locs.length} URLs, all render`);
    }
  }
}

// --- 2. no indexable route is page-factory boilerplate ----------------------
// Strip the query and the title out of the copy; whatever is left is the
// template. Two routes with the same remainder are the same page twice.
// A sentinel no route copy can contain, so a route with an empty query or title
// falls through to a plain stringify instead of being split on ' ' - which would
// shred the JSON and make every page look like a duplicate of every other.
const NEVER_MATCHES = '\u0000__no_such_substring__';
const fingerprint = (copy, primaryQuery, title) => JSON.stringify(copy)
  .split(primaryQuery || NEVER_MATCHES).join('<QUERY>')
  .split(title || NEVER_MATCHES).join('<TITLE>');

const BASELINE = 'data/demand/pre_gate_route_baseline.json';
const preGateRoutes = new Set(exists(BASELINE) ? (read(BASELINE).routes || []) : []);

const factoryRoutes = manifest.routes.filter((r) => r.source === 'page_factory');
const seen = new Map();
const filler = [];
const legacyFiller = [];
for (const route of factoryRoutes) {
  const copy = routeCopy.routes?.[route.path];
  if (!copy) continue;
  const fp = fingerprint(copy, route.primaryQuery, route.title);
  const twin = seen.get(fp);
  if (twin && route.index) {
    const line = `${route.path} is indexable and byte-identical to ${twin} once the query is removed`;
    if (preGateRoutes.has(route.path)) legacyFiller.push(line); else filler.push(line);
  }
  if (!twin) seen.set(fp, route.path);
}
if (filler.length) {
  errors.push(`${filler.length} indexable route(s) created after the gate are page-factory template filler:\n  ` + filler.slice(0, 10).join('\n  '));
}
if (legacyFiller.length) {
  notes.push(`${legacyFiller.length} pre-gate route(s) are template filler. Retirement candidates, not build failures:\n    ` + legacyFiller.join('\n    '));
}

// --- 3. every factory route created after the gate has a demand record ------
// Scoped to new routes on purpose. Nine routes predate the gate; failing the
// build on all of them would make this a validator someone switches off rather
// than one that holds. They are reported as retirement candidates instead, and
// the decision to retire a URL a crawler already knows is the owner's. What
// cannot happen from here is a tenth being added without evidence.
const factoryPages = registry.pages.filter((p) => p.source === 'page_factory');

if (process.argv.includes('--seed-baseline')) {
  fs.mkdirSync(path.join(ROOT, 'data/demand'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, BASELINE), JSON.stringify({
    note: 'Page-factory routes that existed when the demand gate was installed. These are exempt from the gate; anything not listed here must carry a demand record. Do not add routes to this file to get past the gate.',
    sealed_at: new Date().toISOString().slice(0, 10),
    route_count: factoryPages.length,
    routes: factoryPages.map((p) => p.path).sort(),
  }, null, 2) + '\n');
  console.log(`Sealed pre-gate baseline: ${factoryPages.length} page-factory routes.`);
  process.exit(0);
}

if (!exists(BASELINE)) {
  notes.push(`no pre-gate baseline at ${BASELINE}; run this validator once with --seed-baseline`);
} else {
  const known = new Set(read(BASELINE).routes || []);
  const ungated = [];
  const legacyUnbacked = [];
  for (const page of factoryPages) {
    const backed = page.primaryQuery && hasDemand(page.primaryQuery);
    if (backed) continue;
    const label = `${page.path} (query: ${page.primaryQuery ? `"${page.primaryQuery}"` : 'none'})`;
    if (known.has(page.path)) legacyUnbacked.push(label); else ungated.push(label);
  }
  if (ungated.length) {
    errors.push(
      `${ungated.length} page-factory route(s) created after the demand gate have no demand record. Either add ` +
      `measured demand for the query to data/demand/measured_demand.json, or do not create the route:\n  ` +
      ungated.slice(0, 20).join('\n  ')
    );
  }
  if (legacyUnbacked.length) {
    notes.push(
      `${legacyUnbacked.length} pre-gate route(s) have no demand record. Not a build failure; they are ` +
      `retirement candidates for the owner to decide on:\n    ` + legacyUnbacked.join('\n    ')
    );
  }
}

notes.push(`${allRecords().length} demand records; ${factoryRoutes.length} page-factory routes`);

for (const n of notes) console.log(`note: ${n}`);
if (errors.length) {
  console.error('validate:demand-backed-pages FAILED');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('validate:demand-backed-pages OK');
