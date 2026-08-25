#!/usr/bin/env node
// Query atlas: full-coverage taxonomy as a LOOKUP INDEX, publishing gated on evidence.
//
// The fanout already materialises 100,000 permutations under
// data/authority_scale/fanout_100k, every one tagged OPPORTUNITY_ONLY /
// NOT_EVALUATED. They are not rankable because they carry no demand evidence, and
// generating pages against them is precisely the scaled-content pattern the March
// 2026 core update targets.
//
// So the taxonomy is inverted into a classifier. A real query arrives carrying
// measured or modelled demand and INHERITS its dimensions from the fanout:
//
//   "letter of explanation for mortgage"  [T2b, 480/mo, KD 23]
//     -> topic: letter of explanation | audience: homebuyers
//        intent: transactional | format: template | cluster: letter-of-explanation
//
// The 100k reserve stays as a hypothesis pool, consulted only when a cluster has
// no T1-T3 evidence at all. Coverage is complete; publishing is evidence-gated.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const readJson = (p, fb) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch { return fb; } };

const dims = readJson('data/authority_scale/fanout_dimensions.json', {});
const evidence = readJson('data/queries/evidence/evidence_queries.json', { queries: [] });

// Ordered by how directly the number was observed. T4 is deliberately absent:
// synthetic permutations never earn a publish decision on their own.
const EVIDENCE_WEIGHT = { T1: 1.0, T2a: 0.8, T2b: 0.6, T3: 0.35 };
const PUBLISHABLE_TIERS = new Set(Object.keys(EVIDENCE_WEIGHT));

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = (s) => new Set(norm(s).split(' ').filter(Boolean));
const slug = (s) => norm(s).replace(/\s+/g, '-');

const STOPWORDS = new Set(['a','an','the','of','for','to','in','on','and','or','with','your','my','is','are','how','what','do','does']);

// Token weight by inverse document frequency across the candidate set. Plain
// overlap classified "proof of employment letter" as letter-of-explanation,
// because "letter" and "of" matched two of three tokens while the distinctive
// word "employment" counted the same as the filler. IDF makes rare tokens decide.
function idfFor(candidates) {
  const df = new Map(); let n = 0;
  for (const cand of candidates || []) {
    n++;
    for (const t of tokens(cand)) if (!STOPWORDS.has(t)) df.set(t, (df.get(t) || 0) + 1);
  }
  return (t) => Math.log((n + 1) / ((df.get(t) || 0) + 1)) + 1;
}

function classify(queryTokens, candidates) {
  const idf = idfFor(candidates);
  let best = null, bestScore = 0;
  for (const cand of candidates || []) {
    const ct = [...tokens(cand)].filter((t) => !STOPWORDS.has(t));
    if (!ct.length) continue;
    let hit = 0, total = 0;
    for (const t of ct) { const w = idf(t); total += w; if (queryTokens.has(t)) hit += w; }
    if (!hit || !total) continue;
    const score = hit / total;
    if (score > bestScore) { bestScore = score; best = cand; }
  }
  return bestScore > 0 ? { value: best, confidence: Number(bestScore.toFixed(3)) } : { value: null, confidence: 0 };
}

const classified = [];
const unmatched = [];
for (const q of evidence.queries || []) {
  const tier = q.evidence_tier;
  if (!tier) { unmatched.push({ query: q.query, reason: 'missing_evidence_tier' }); continue; }
  if (!PUBLISHABLE_TIERS.has(tier)) { unmatched.push({ query: q.query, reason: `non_publishable_tier:${tier}` }); continue; }

  const qt = tokens(q.query);
  const topic = classify(qt, dims.topics);
  const audience = classify(qt, dims.audiences);
  const modifier = classify(qt, dims.modifiers);
  const format = classify(qt, dims.formats);

  const volume = Number(q.volume || 0);
  const weakIncumbent = Number(q.weak_incumbent_score ?? 0.5);
  const rank = Number((EVIDENCE_WEIGHT[tier] * Math.max(volume, 1) * weakIncumbent).toFixed(2));

  classified.push({
    query: q.query,
    evidence_tier: tier,
    source_type: q.source_type || null,
    volume,
    keyword_difficulty: q.keyword_difficulty ?? null,
    weak_incumbent_score: weakIncumbent,
    // intent comes from the evidence record and is derived, not measured -
    // intent_method records how, so nothing downstream mistakes it for observed.
    intent: q.intent || null,
    intent_method: q.intent_method || null,
    target_domain: q.target_domain || null,
    inherited: {
      topic: topic.value, topic_confidence: topic.confidence,
      audience: audience.value, audience_confidence: audience.confidence,
      modifier: modifier.value, format: format.value,
      semantic_cluster: topic.value ? slug(topic.value) : null
    },
    rank_score: rank,
    publishable: true
  });
}

classified.sort((a, b) => b.rank_score - a.rank_score);

// Which taxonomy clusters have real evidence, and which are reserve-only.
const covered = new Set(classified.map((c) => c.inherited.semantic_cluster).filter(Boolean));
const allClusters = (dims.topics || []).map(slug);
const reserveOnly = allClusters.filter((c) => !covered.has(c));

const fanoutIndex = readJson('data/authority_scale/fanout_100k/index.json', null);

const atlas = {
  schema_version: '1.0',
  generated_from: 'data/queries/evidence/evidence_queries.json + data/authority_scale/fanout_dimensions.json',
  policy: 'Full taxonomy coverage is an index, not a publishing queue. Pages may only be generated against evidence_tier T1-T3. T4 synthetic permutations are a hypothesis reserve consulted when a cluster has no evidence, and never publish on their own.',
  evidence_weights: EVIDENCE_WEIGHT,
  taxonomy: {
    topics: (dims.topics || []).length,
    intent_patterns: (dims.intent_patterns || []).length,
    audiences: (dims.audiences || []).length,
    modifiers: (dims.modifiers || []).length,
    formats: (dims.formats || []).length,
    theoretical_combinations: fanoutIndex?.theoretical_combinations ?? null,
    materialized_reserve: fanoutIndex?.record_count ?? null,
    reserve_path: 'data/authority_scale/fanout_100k'
  },
  coverage: {
    clusters_total: allClusters.length,
    clusters_with_evidence: covered.size,
    clusters_reserve_only: reserveOnly.length,
    reserve_only_clusters: reserveOnly
  },
  evidence_backed_count: classified.length,
  unmatched_count: unmatched.length,
  unmatched,
  queries: classified
};

fs.mkdirSync(path.join(ROOT, 'data/authority_scale'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data/authority_scale/query_atlas.json'), JSON.stringify(atlas, null, 2) + '\n');

console.log(`[query-atlas] evidence_backed=${classified.length} unmatched=${unmatched.length} clusters ${covered.size}/${allClusters.length} with evidence, ${reserveOnly.length} reserve-only`);
if (classified.length) {
  console.log('[query-atlas] top by evidence_weight x volume x weak_incumbent:');
  for (const c of classified.slice(0, 5)) {
    console.log(`  ${String(c.rank_score).padStart(8)}  [${c.evidence_tier}] ${c.query}  -> cluster=${c.inherited.semantic_cluster || 'UNCLASSIFIED'}`);
  }
}
