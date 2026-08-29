#!/usr/bin/env node
/**
 * Close the discovery gap: get every query this repo owns into the evidence file,
 * and score the ones that are there by something that was actually observed.
 *
 * The gap
 * -------
 * `data/atlas/query_universe.json` holds 430 permutations and
 * `data/authority_scale/fanout_100k` holds 100,000 more, but all of them are
 * synthetic - T4 by construction, and the atlas policy correctly refuses to
 * publish against them. The evidence file held 13 rows. So the publishing loop
 * had thirteen admissible things to build against and a hundred thousand it may
 * not touch. That is the gap: the universe is enormous and the *scored* slice is
 * tiny.
 *
 * What this adds, and what it deliberately does not
 * -------------------------------------------------
 * Search VOLUME cannot be obtained here. There is no live paid keyword source on
 * this account: every connector under `data/intelligence/` that would carry one
 * reports NOT_CONFIGURED, and every import CSV under `data/seo/import_templates/`
 * is a header row. A modelled or guessed volume would be indistinguishable in the
 * file from the Semrush-measured ones already in it, so none is written. Rows
 * added here carry `search_volume: null` and `demand_basis: "none"`.
 *
 * Two things ARE obtainable, and both are recorded:
 *
 *   1. REAL PHRASING, from Google Search Console. `data/intelligence/gsc_search_analytics.json`
 *      is a live connector snapshot of the queries that actually put this domain
 *      in front of someone. They arrive as evidence_tier T3 - "real phrasing, no
 *      keyword-tool search_volume" - which is exactly what they are.
 *
 *      They are NOT tiered T1. T1 means GSC-measured, and the unit contract
 *      defines the measurement as `impressions_90d`. This connector pulls a
 *      28-day window (see scripts/intelligence/ingest-gsc.mjs), so writing its
 *      impression count into a field named for a 90-day one would be the precise
 *      unit defect `data/queries/evidence/unit_contract` exists to prevent. The
 *      count is recorded under `own_impressions`, which names its own window, and
 *      `impressions_90d` stays null.
 *
 *   2. OPENNESS, from the repo's own citation prober. `scripts/llm_citation_probe.mjs`
 *      in grounded mode asks an answer engine a real question and reads back the
 *      hosts the answer was built from. Which hosts occupy an answer is a
 *      measurement, not a model, and it is the one thing this portfolio can buy
 *      cheaply. A query whose answer is assembled out of forum threads is winnable
 *      by a real page; one assembled out of .gov is not.
 *
 * And every row is tiered by LEAD INTENT, because the vertical is lead-gen: the
 * page earns nothing until someone submits the form.
 *
 * Usage
 * -----
 *   node scripts/queries/score_discovery_gap.mjs          # merge + score
 *
 * Run it, then run the grounded probe, then run it again: the first pass lands
 * the queries so the probe has something to ask about, the second attaches what
 * the probe observed. A row the probe has not reached yet is `UNMEASURED`, never
 * a zero.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (p, fb) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch { return fb; } };
const write = (p, v) => { fs.mkdirSync(path.join(ROOT, path.dirname(p)), { recursive: true }); fs.writeFileSync(path.join(ROOT, p), JSON.stringify(v, null, 2) + '\n'); };

const EVIDENCE = 'data/queries/evidence/evidence_queries.json';
const GSC = 'data/intelligence/gsc_search_analytics.json';
const OBSERVATIONS = 'data/signals/llm_citation_observations.json';

// The connector's own window. Hard-coded here because the snapshot records only
// `fetchedAt`; if ingest-gsc.mjs changes its window this constant must change with
// it, which is why the field it feeds is named for its window rather than assuming one.
const GSC_WINDOW_DAYS = 28;

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- lead intent
//
// The verticals are lead-gen: a visitor submits a form and the lead is sold on.
// So the tier that matters is how close the searcher is to submitting one, not
// how interesting the topic is.
//
// Word boundaries throughout, and anchored to whole words on both sides. `\bfee`
// alone matches "feel"; `\bfees?\b` does not. Every pattern below was checked
// against the actual query list rather than assumed.
const T1_LOCAL_READY = [
  /\bnear me\b/,
  /\bopen now\b/,
  /\bin[- ]network\b/,
  /\bin [a-z]+(?: [a-z]+)?,? (?:al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)\b/,
];
const T2_COST_IN_MARKET = [
  /\bhow much\b/,
  /\bcosts?\b/,
  /\bprice(?:s|d|ing)?\b/,
  /\bfees?\b/,
  /\bdoes insurance cover\b/,
  /\bcovered by insurance\b/,
  /\bworth it\b/,
  /\bout of pocket\b/,
  /\bcheap(?:est|er)?\b/,
  /\baffordable\b/,
];
const T3_SELECTION = [
  /\bhow to (?:choose|compare|find|pick|select)\b/,
  /\bred flags?\b/,
  /\bvs\.?\b/,
  /\bversus\b/,
  /\bwhich is better\b/,
  /\bwhat to ask\b/,
  /\bquestions to ask\b/,
  /\bcompare\b/,
  /\bbest\b/,
];

function leadIntentTier(query) {
  const q = norm(query);
  if (T1_LOCAL_READY.some((re) => re.test(q))) return 'T1_LOCAL_READY';
  if (T2_COST_IN_MARKET.some((re) => re.test(q))) return 'T2_COST_IN_MARKET';
  if (T3_SELECTION.some((re) => re.test(q))) return 'T3_SELECTION';
  return 'T4_INFORMATIONAL';
}

// -------------------------------------------------------------------- openness
//
// Openness is computed only from hosts an answer engine actually cited. The two
// host lists below are definitional, not estimates: membership is a property of
// the host, decided once and written down, so the same observation always scores
// the same. Nothing here is a guess about traffic, difficulty or rank.
const PLATFORM_HOSTS = new Set([
  'reddit.com', 'quora.com', 'youtube.com', 'facebook.com', 'instagram.com',
  'tiktok.com', 'pinterest.com', 'linkedin.com', 'medium.com', 'x.com',
  'twitter.com', 'yelp.com', 'wikihow.com', 'answers.com', 'tripadvisor.com',
  'nextdoor.com', 'stackexchange.com', 'stackoverflow.com', 'substack.com',
]);
const isPlatform = (h) => PLATFORM_HOSTS.has(h) || [...PLATFORM_HOSTS].some((p) => h.endsWith(`.${p}`));
const isInstitutional = (h) => /\.(gov|edu|mil)$/.test(h) || h === 'wikipedia.org' || h.endsWith('.wikipedia.org');

const OPENNESS_METHOD = {
  input: 'cited_hosts from a grounded run of scripts/llm_citation_probe.mjs (OpenRouter web plugin, engine=parallel, mode=turbo)',
  formula: 'openness_score = clamp(0.5 + 0.5*platform_share - 0.5*institutional_share, 0, 1)',
  platform_share: 'share of distinct cited hosts that are user-generated or aggregator platforms',
  institutional_share: 'share of distinct cited hosts on .gov/.edu/.mil or wikipedia',
  verdicts: {
    HELD_BY_US: 'the engine already cited one of our own domains - not an opportunity, a position to defend',
    OPEN: 'openness_score >= 0.6 - the answer is assembled from platforms and no authoritative page owns it',
    CONTESTED: '0.4 <= openness_score < 0.6',
    HELD: 'openness_score < 0.4 - institutions or established publishers occupy the answer',
    UNMEASURED: 'the probe has not answered for this query; NOT a zero and never to be read as one',
  },
  not_measured: 'search volume, keyword difficulty, organic rank. None of these are inferable from a citation observation and none are written.',
};

function occupancyFor(query, observationsByQuery) {
  const obs = observationsByQuery.get(norm(query));
  if (!obs) {
    return { verdict: 'UNMEASURED', reason: 'NO_GROUNDED_OBSERVATION', openness_score: null, cited_hosts: [], observed_at: null, engine: null };
  }
  if (obs.status !== 'observed') {
    return { verdict: 'UNMEASURED', reason: 'PROVIDER_ERROR', openness_score: null, cited_hosts: [], observed_at: obs.observed_at || null, engine: obs.engine || null };
  }
  const hosts = [...new Set(obs.cited_domains || [])];
  const ours = obs.cited_ours || [];
  if (!hosts.length) {
    return { verdict: 'UNMEASURED', reason: 'PROVIDER_ANSWERED_WITHOUT_RETRIEVING', openness_score: null, cited_hosts: [], observed_at: obs.observed_at, engine: obs.engine };
  }
  const platform = hosts.filter(isPlatform).length / hosts.length;
  const institutional = hosts.filter(isInstitutional).length / hosts.length;
  const score = Math.max(0, Math.min(1, 0.5 + 0.5 * platform - 0.5 * institutional));
  const verdict = ours.length ? 'HELD_BY_US' : score >= 0.6 ? 'OPEN' : score >= 0.4 ? 'CONTESTED' : 'HELD';
  return {
    verdict,
    reason: 'GROUNDED_CITATION_OBSERVATION',
    openness_score: Number(score.toFixed(3)),
    platform_share: Number(platform.toFixed(3)),
    institutional_share: Number(institutional.toFixed(3)),
    distinct_cited_hosts: hosts.length,
    cited_hosts: hosts,
    cited_ours: ours,
    observed_at: obs.observed_at,
    engine: obs.engine,
  };
}

// ------------------------------------------------------------------ the merge
const doc = read(EVIDENCE, null);
if (!doc) { console.error(`score_discovery_gap: missing ${EVIDENCE}`); process.exit(1); }

const byQuery = new Map((doc.queries || []).map((q) => [norm(q.query), q]));

// 1. real phrasing from Search Console
const gsc = read(GSC, { rows: [] });
const gscUsable = gsc.mode === 'live' && Array.isArray(gsc.rows) && gsc.rows.length > 0;
const impressionsByQuery = new Map();
if (gscUsable) {
  for (const r of gsc.rows) {
    const key = norm(r.query);
    if (!key) continue;
    const prior = impressionsByQuery.get(key) || { query: r.query, impressions: 0, clicks: 0 };
    prior.impressions += Number(r.impressions || 0);
    prior.clicks += Number(r.clicks || 0);
    impressionsByQuery.set(key, prior);
  }
}
const fetchedAt = gsc.fetchedAt ? gsc.fetchedAt.slice(0, 10) : null;
const windowStart = fetchedAt ? new Date(Date.parse(gsc.fetchedAt) - GSC_WINDOW_DAYS * 86400000).toISOString().slice(0, 10) : null;

let added = 0;
for (const [key, row] of impressionsByQuery) {
  if (byQuery.has(key)) {
    // Already known from a keyword tool. Record the own-impression measurement
    // alongside the modelled volume; never on top of it.
    const existing = byQuery.get(key);
    existing.own_impressions = { value: row.impressions, clicks: row.clicks, window_days: GSC_WINDOW_DAYS, window_start: windowStart, window_end: fetchedAt, source: 'google_search_console' };
    continue;
  }
  byQuery.set(key, {
    query: row.query,
    // T3, not T1. See the header: T1's measurement unit is impressions_90d and
    // this connector's window is 28 days.
    evidence_tier: 'T3',
    source_type: 'gsc_search_analytics',
    keyword_difficulty: null,
    weak_incumbent_score: null,
    intent_method: 'not_derived',
    serp_features: [],
    vertical: 'approvalprep',
    target_domain: 'approvalprep.com',
    cpc_usd: null,
    paid_competition: null,
    competitor_ranking_url: 'NO_DATA',
    // No keyword tool was consulted, so there is no market volume. Writing one
    // would be a fabrication; writing impressions here would be a unit error.
    search_volume: null,
    impressions_90d: null,
    demand_basis: 'none',
    own_impressions: { value: row.impressions, clicks: row.clicks, window_days: GSC_WINDOW_DAYS, window_start: windowStart, window_end: fetchedAt, source: 'google_search_console' },
    volume_sources: {},
    volume_conflict: false,
    discovery_pass: 'discovery-gap-2026-08',
  });
  added++;
}

// 2. openness, from whatever the prober has actually observed
const observations = read(OBSERVATIONS, { runs: [] });
const grounded = (observations.runs || []).filter((r) => r.mode === 'grounded');
const latest = grounded[grounded.length - 1] || null;
const observationsByQuery = new Map();
for (const o of latest?.observations || []) observationsByQuery.set(norm(o.query), o);

let scored = 0;
for (const row of byQuery.values()) {
  row.lead_intent_tier = leadIntentTier(row.query);
  row.lead_intent_method = 'regex_classifier_on_query_string, scripts/queries/score_discovery_gap.mjs';
  row.occupancy = occupancyFor(row.query, observationsByQuery);
  if (row.occupancy.openness_score !== null) scored++;
}

doc.queries = [...byQuery.values()].sort((a, b) => (
  (a.search_volume !== null ? 0 : 1) - (b.search_volume !== null ? 0 : 1)
  || (b.search_volume || 0) - (a.search_volume || 0)
  || (b.own_impressions?.value || 0) - (a.own_impressions?.value || 0)
  || a.query.localeCompare(b.query)
));

doc.discovery_gap_pass = {
  at: new Date().toISOString(),
  by: 'scripts/queries/score_discovery_gap.mjs',
  why: 'The universe was 430 synthetic permutations against 13 scored rows. This pass expands the scored slice from sources already on disk and scores it by observation, not by estimate.',
  expansion_sources: [
    `${GSC} (live connector snapshot, ${GSC_WINDOW_DAYS}-day window) - real phrasing, landed as evidence_tier T3`,
  ],
  refused_sources: [
    'data/atlas/query_universe.json and data/authority_scale/fanout_100k - synthetic permutations, T4, never publishable on their own',
    'any modelled or estimated search volume - no live paid keyword source exists on this account, and a fabricated volume is worse than a null one',
  ],
  lead_intent_classifier: {
    T1_LOCAL_READY: 'near me / open now / in <City ST> / in-network',
    T2_COST_IN_MARKET: 'how much / cost / price / fee / does insurance cover / worth it / out of pocket',
    T3_SELECTION: 'how to choose|compare|find / red flags / vs / which is better / what to ask / best',
    T4_INFORMATIONAL: 'everything else - definitions, lists, process explanations',
    note: 'Word-boundary anchored. `\\bfees?\\b` deliberately does not match "feel".',
  },
  openness_method: OPENNESS_METHOD,
  counts: { total_queries: doc.queries.length, added_this_pass: added, with_openness_reading: scored },
};

write(EVIDENCE, doc);

const tiers = {};
const verdicts = {};
for (const q of doc.queries) {
  tiers[q.lead_intent_tier] = (tiers[q.lead_intent_tier] || 0) + 1;
  verdicts[q.occupancy.verdict] = (verdicts[q.occupancy.verdict] || 0) + 1;
}
console.log(`[discovery-gap] ${doc.queries.length} evidence queries (+${added} this pass), ${scored} with an openness reading.`);
console.log(`  lead intent: ${Object.entries(tiers).sort().map(([k, v]) => `${k}=${v}`).join(' ')}`);
console.log(`  occupancy:   ${Object.entries(verdicts).sort().map(([k, v]) => `${k}=${v}`).join(' ')}`);
if (!gscUsable) console.log('  note: no live GSC snapshot on disk; no phrasing was added from Search Console.');
