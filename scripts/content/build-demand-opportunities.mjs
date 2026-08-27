#!/usr/bin/env node
/**
 * Rebuilds `data/content/page_opportunities.json` from measured demand.
 *
 * It was hand-typed: nine rows, last edited 2026-07-24, every one already
 * consumed. `content:generate-pages` therefore reported `pagesPublished: 0` on
 * 49 of its last 52 runs, and the release ledger recorded that honestly while
 * seven queries worth 12,700 searches a month sat with no page at all.
 *
 * The opportunity list is now the arithmetic difference between two things that
 * are both measured: the queries with demand evidence, and the routes that
 * already exist. It cannot be exhausted by consumption, only by covering the
 * demand - and when the demand is covered it correctly produces nothing, which
 * is the right output for a site that has answered every query it has evidence
 * for.
 *
 * Note what this script does NOT do. It does not invent a `priority` integer,
 * and it does not mark anything `autoPublishEligible`. Volume and difficulty are
 * carried through as measured; whether a page is worth writing is a judgement,
 * and the factory downstream will refuse to index whatever it writes until the
 * copy stops being the template.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allRecords } from '../lib/demand_gate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const manifest = read('data/routes/route_manifest.json');
const registry = read('data/content/page_registry.json');
const existing = read('data/content/page_opportunities.json');

const coveredQueries = new Set([
  ...manifest.routes.map((r) => String(r.primaryQuery || '').toLowerCase().trim()),
  ...registry.pages.map((p) => String(p.primaryQuery || '').toLowerCase().trim()),
].filter(Boolean));
const coveredPaths = new Set([
  ...manifest.routes.map((r) => r.path),
  ...registry.pages.map((p) => p.path),
]);

// A route path a human already chose beats one derived from the query string.
const handAuthored = new Map(
  (existing.opportunities || []).map((o) => [String(o.primaryQuery || '').toLowerCase().trim(), o])
);

const opportunities = [];
const covered = [];
for (const record of allRecords().sort((a, b) => (b.volume || 0) - (a.volume || 0))) {
  const key = String(record.query).toLowerCase().trim();
  const prior = handAuthored.get(key);
  const routePath = prior?.path || `/${slug(record.query)}`;
  if (coveredQueries.has(key) || coveredPaths.has(routePath)) {
    covered.push({ query: record.query, volume: record.volume, path: routePath });
    continue;
  }
  opportunities.push({
    id: prior?.id || `demand-${slug(record.query)}`,
    path: routePath,
    title: prior?.title || record.query.replace(/\b\w/g, (c) => c.toUpperCase()),
    family: prior?.family || 'letter_studio',
    risk: prior?.risk || 'medium',
    page_intent: prior?.page_intent || 'guide',
    primaryQuery: record.query,
    secondaryQueries: prior?.secondaryQueries || [],
    targetProductSku: prior?.targetProductSku || null,
    cta_policy: prior?.cta_policy || 'next_step',
    autoPublishEligible: false,
    demandEvidence: {
      sourceType: record.source_type,
      evidenceTier: record.evidence_tier,
      volume: record.volume,
      keywordDifficulty: record.keyword_difficulty,
      weakIncumbentScore: record.weak_incumbent_score,
    },
  });
}

const out = {
  schemaVersion: '2.0.0',
  note: 'Derived from data/demand/measured_demand.json minus the routes that already exist. Do not hand-edit rows into this file: a row here with no demand record is refused by the page factory anyway.',
  generatedAt: new Date().toISOString().slice(0, 10),
  dailyPublishCap: existing.dailyPublishCap ?? 3,
  dailyPublishCapSemantics: 'a safety cap for a bad run, never a number to reach',
  demandRecordsAvailable: allRecords().length,
  queriesAlreadyCovered: covered.length,
  uncoveredMonthlyVolume: opportunities.reduce((a, o) => a + (o.demandEvidence.volume || 0), 0),
  opportunities,
};

fs.writeFileSync(path.join(ROOT, 'data/content/page_opportunities.json'), JSON.stringify(out, null, 2) + '\n');
console.log(
  `[content:demand-opportunities] ${allRecords().length} demand records, ${covered.length} already covered, ` +
  `${opportunities.length} uncovered worth ${out.uncoveredMonthlyVolume.toLocaleString('en-US')} searches/mo.`
);
for (const o of opportunities) console.log(`  ${String(o.demandEvidence.volume).padStart(6)}/mo  KD${String(o.demandEvidence.keywordDifficulty).padStart(2)}  ${o.primaryQuery}  ->  ${o.path}`);
