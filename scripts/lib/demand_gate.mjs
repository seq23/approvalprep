/**
 * The single place that answers "is there evidence anyone searches for this?"
 *
 * The page factory used to read `data/content/page_opportunities.json`, a
 * hand-typed list of nine rows last touched on 2026-07-24. All nine had been
 * consumed, so `content:generate-pages` had produced zero pages on 49 of its
 * last 52 runs. Separately, `data/intelligence/content_opportunity_briefs.json`
 * held 5,355 briefs derived from a 100,000-row cartesian fan-out, 1,352 of them
 * marked `indexable_growth_page`, with no route to production at all. One lane
 * was starved; the other was enormous and disconnected. Neither carried a
 * search volume, because every demand connector in `data/intelligence/` reports
 * NOT_CONFIGURED and every import CSV under `data/seo/import_templates/` is a
 * header row with nothing under it.
 *
 * `data/demand/measured_demand.json` is the Semrush portfolio packet filtered
 * to approvalprep.com: 11 queries, 29,000 searches a month between them, each
 * with a measured volume and a keyword difficulty. Seven of the eleven have no
 * page. That is the actual backlog, and it is two orders of magnitude smaller
 * and considerably more valuable than the 5,355.
 *
 * Every caller that decides whether a route may exist imports `hasDemand` from
 * here. There is no second copy, so the factory, the opportunity builder and
 * the validator cannot drift apart about what counts as evidence.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DEMAND_FILE = path.join(ROOT, 'data/demand/measured_demand.json');

/** Same normalization on both sides of every comparison, so a trailing space or
 *  a capital letter can never be why a real query is refused. */
export function normalize(query) {
  return String(query || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

let cache = null;

function load() {
  if (cache) return cache;
  if (!fs.existsSync(DEMAND_FILE)) {
    throw new Error(
      `demand_gate: ${path.relative(ROOT, DEMAND_FILE)} is missing. Page generation is refused ` +
      `rather than run against no evidence. Restore the file, or add owner-approved seeds to it.`
    );
  }
  const doc = JSON.parse(fs.readFileSync(DEMAND_FILE, 'utf8'));
  const byQuery = new Map();
  for (const r of doc.records || []) {
    const key = normalize(r.query_normalized || r.query);
    if (!key) continue;
    // An owner-approved seed may carry no volume - that is the point of it -
    // but it must say who approved it, or it is indistinguishable from a row
    // someone appended to get past this gate.
    if (r.source_type === 'owner_approved_seed') {
      if (!r.approved_by) throw new Error(`demand_gate: owner_approved_seed "${r.query}" has no approved_by. Refusing to treat it as evidence.`);
    } else if (!(Number(r.volume) > 0)) {
      throw new Error(`demand_gate: record "${r.query}" claims a measured source but has no volume. Refusing to treat it as evidence.`);
    }
    byQuery.set(key, r);
  }
  cache = { doc, byQuery, records: [...byQuery.values()] };
  return cache;
}

/** The demand record behind a query, or null. Null means: do not open a route. */
export function demandRecord(query) {
  return load().byQuery.get(normalize(query)) || null;
}

/** The gate. Anything that creates a route must pass through exactly this. */
export function hasDemand(query) {
  return demandRecord(query) !== null;
}

/** Measured monthly volume, or null for an owner seed with no measurement.
 *  Never returns a stand-in figure: a caller that wants to rank by demand must
 *  decide what to do with null rather than be handed a number it will mistake
 *  for data. */
export function measuredVolume(query) {
  const r = demandRecord(query);
  if (!r) return null;
  return Number.isFinite(Number(r.volume)) ? Number(r.volume) : null;
}

export function allRecords() {
  return load().records.slice();
}

export function provenance() {
  return load().doc.provenance;
}
