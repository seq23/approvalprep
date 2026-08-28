#!/usr/bin/env node
/**
 * Ask an answer engine a real question and record whether it cites us.
 *
 * This is the measurement the portfolio did not have. The existing
 * query:test:zero-cost task makes no network calls at all - it prints a
 * worksheet and a CSV for a human to fill in by hand - so nothing has ever
 * observed whether these pages are cited. Every statement about AEO progress up
 * to now has been inference from proxies.
 *
 * Grounded mode asks OpenRouter with its web plugin and reads the url_citation
 * annotations off the reply: the pages the answer was actually built from. That
 * is a citation observation - the query, the engine, the domains it cited, and
 * whether any of them are ours.
 *
 * It does not use Gemini grounding, which is hard-blocked on this project: any
 * request carrying tools:[{google_search:{}}] returns 429 RESOURCE_EXHAUSTED
 * while the same request without it returns 200. See the PROVIDER note below.
 *
 * A zero is only ever recorded when a provider answered. If the provider
 * errored, the run records an error state and no citation rate at all.
 *
 * What this does not claim: one engine is not all engines, grounding metadata is
 * not identical to what a user sees in an AI Overview, and absence on a given
 * day is weak evidence. Runs are recorded individually with timestamps so a
 * trend can be read later rather than a single run being treated as a verdict.
 *
 * Without an API key it exits 0 and records that it was skipped. A measurement
 * tool that fails the build when it cannot measure teaches people to remove it.
 *
 * Usage: node llm_citation_probe.mjs [--queries file] [--limit N] [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
// OpenRouter bills the web plugin per REQUEST on the parallel engine, with 10
// results included - measured at $0.00127 per call on this account, against
// ~$0.04 on the default engine's per-result billing. Same url_citation schema,
// so nothing downstream changes. Overridable if a deeper engine is ever wanted.
const WEB_ENGINE = process.env.OPENROUTER_WEB_ENGINE || 'parallel';
const WEB_MODE = process.env.OPENROUTER_WEB_MODE || 'turbo';


const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
const DRY = argv.includes('--dry-run');
const MODE = arg('--mode', process.env.CITATION_PROBE_MODE || 'knowledge');
const GROUNDED = MODE === 'grounded';
const LIMIT = Number(arg('--limit', '25'));
const OUT = 'data/signals/llm_citation_observations.json';

const CONFIG_PATH = 'data/signals/citation_probe_config.json';
const config = fs.existsSync(path.join(ROOT, CONFIG_PATH))
  ? JSON.parse(fs.readFileSync(path.join(ROOT, CONFIG_PATH), 'utf8'))
  : {};
const OWNED = (config.owned_domains || []).map((d) => d.toLowerCase().replace(/^www\./, ''));
if (!OWNED.length) {
  console.error(`citation probe: no owned_domains in ${CONFIG_PATH} - cannot tell a citation of ours from anyone else's`);
  process.exit(1);
}

function loadQueries() {
  const file = arg('--queries', config.queries_file || 'data/seo/priority_queries.json');
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return [];
  const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
  const rows = Array.isArray(raw) ? raw : (raw.queries || raw.priority_queries || raw.entries || []);
  return rows.map((r) => (typeof r === 'string' ? r : r.query || r.text || '')).filter(Boolean).slice(0, LIMIT);
}

const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };

// Two modes, kept distinct because they measure different things and conflating
// them would overstate what is known.
//
//   knowledge (default) - ask without tools and see whether the model names us
//     unprompted. This measures whether we exist in the model's answer at all.
//     It is free.
//   grounded - ask with live web retrieval and read the sources the answer was
//     actually built from. This is a real citation observation and the stronger
//     signal. It runs on OpenRouter's web plugin; the Gemini path below can no
//     longer serve it, because Google Search grounding 429s unconditionally on
//     this key.
//
// Default is knowledge, because a probe that cannot run costs more than a weaker
// probe that does.
//
// The grounded branch of this Gemini function is kept only so `--provider gemini
// --mode grounded` can still reproduce the block on demand. Nothing selects it
// automatically.
async function ask(query, key, model, grounded) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: query }] }],
    ...(grounded ? { tools: [{ google_search: {} }] } : {}),
    generationConfig: { temperature: 0 },
  };
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
  const cand = data?.candidates?.[0] || {};
  const meta = cand.groundingMetadata || {};
  // Grounding chunks carry the pages the answer was actually built from. The
  // redirect wrapper Google returns is resolved where a real URI is present.
  const uris = [];
  for (const c of meta.groundingChunks || []) {
    const w = c.web || {};
    if (w.uri) uris.push(w.uri);
    if (w.domain) uris.push(`https://${w.domain}`);
  }
  for (const q of meta.webSearchQueries || []) void q;
  const answer = (cand.content?.parts || []).map((p) => p.text || '').join('\n');
  return { ok: true, answer, uris };
}

const queries = loadQueries();
if (!queries.length) { console.error('citation probe: no queries found'); process.exit(1); }

const orKey = process.env.OPENROUTER_API_KEY || '';
const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '';
// Grounded mode is PINNED to OpenRouter.
//
// Gemini grounded search is hard-blocked on this project and cannot be used to
// measure anything. Plain generateContent returns 200; the identical request
// carrying `tools: [{ google_search: {} }]` returns 429 RESOURCE_EXHAUSTED.
// Reproduced across three models and persistent over hours, so it is a
// standing entitlement block on the key, not a rate limit that waiting clears.
//
// Preferring it - which is what `GROUNDED ? (key ? 'gemini' : ...)` did - is how
// a run produces a FALSE ZERO: every call 429s, every observation is recorded as
// an error, and the summary still publishes `self_cited_rate_pct: 0` as though
// the engines had answered and not cited us. WPP-llm published exactly that off
// 11/11 errored calls.
//
// OpenRouter's web plugin works on this key and returns real url_citation
// annotations, so grounded mode uses it and nothing else. Knowledge mode still
// falls back to Gemini, because plain generateContent is not blocked.
// --provider still overrides, for anyone deliberately testing the blocked path.
const PROVIDER = arg('--provider', GROUNDED
  ? 'openrouter'
  : (orKey ? 'openrouter' : 'gemini'));
// Three small models rather than one, because a single model's idiosyncrasies
// are not a measurement.
//
// These are the cheapest tier that actually answers, around two to three cents
// per million tokens - a full portfolio run costs roughly a cent. The genuinely
// free tier was tried first and is not usable for this: several :free models are
// agentic-harness only, others return upstream provider errors or hang with no
// response. A probe that silently reports zero because every model failed is
// worse than one that costs a cent and runs, so reliability wins here. Set
// OPENROUTER_MODELS to override, including back to :free variants.
const OR_MODELS = (process.env.OPENROUTER_MODELS || (config.openrouter_models || []).join(',') ||
  'ibm-granite/granite-4.0-h-micro,inclusionai/ling-3.0-flash,mistralai/mistral-nemo')
  .split(',').map((m) => m.trim()).filter(Boolean);

// Free models are heavily shared and some hang. Without a deadline one slow
// model stalls the whole run, which is how a measurement quietly stops being
// taken. A timed-out model is recorded as an error against that model, not as
// an absence of citations.
const REQUEST_TIMEOUT_MS = Number(process.env.PROBE_TIMEOUT_MS || 25000);
async function withTimeout(fn) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try { return await fn(ctrl.signal); }
  finally { clearTimeout(t); }
}

// The web plugin runs the model against live web results and returns the pages
// the answer was built from as url_citation annotations - the retrieval
// observation the knowledge-mode call cannot produce, which only shows whether
// the model memorised us during training.
//
// Declared as `plugins: [{ id: 'web', engine: WEB_ENGINE, mode: WEB_MODE, max_results: N }]` rather than the
// ":online" model suffix. Both are documented, but the explicit plugin is the
// shape verified live against this key, and it is the one that lets max_results
// be set - the suffix leaves the result count to the default, and a grounded run
// that retrieves fewer pages sees fewer chances to cite us.
const WEB_MAX_RESULTS = Number(process.env.PROBE_WEB_MAX_RESULTS || 10);
const OR_BASE = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

function openRouterCitations(data) {
  const message = data?.choices?.[0]?.message || {};
  const urls = [];
  for (const annotation of message.annotations || []) {
    const url = annotation?.url_citation?.url;
    if (url) urls.push(url);
  }
  return [...new Set(urls)];
}

async function askOpenRouter(query, model, grounded = false) {
  const res = await withTimeout((signal) => fetch(`${OR_BASE}/chat/completions`, {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${orKey}` },
    body: JSON.stringify({
      model, temperature: 0, max_tokens: 400,
      ...(grounded ? { plugins: [{ id: 'web', engine: WEB_ENGINE, mode: WEB_MODE, max_results: WEB_MAX_RESULTS }] } : {}),
      messages: [{ role: 'user', content: query }],
    }),
  }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
  // A 200 carrying an error body is still an error. OpenRouter returns upstream
  // provider failures this way, and treating one as an answer with no citations
  // is precisely the false zero this probe exists to avoid.
  if (data?.error) return { ok: false, error: data.error.message || JSON.stringify(data.error) };
  if (!Array.isArray(data?.choices) || !data.choices.length) {
    return { ok: false, error: 'provider returned no choices' };
  }
  const answer = data?.choices?.[0]?.message?.content || '';
  return { ok: true, answer, uris: grounded ? openRouterCitations(data) : [] };
}
const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const now = new Date().toISOString();

const haveKey = PROVIDER === 'openrouter' ? Boolean(orKey) : Boolean(key);
if (!haveKey || DRY) {
  // A named legitimate stop, not silence: no observation is written, so nothing
  // downstream can mistake this run for a measured zero.
  const reason = DRY ? 'DRY_RUN_NO_CALLS_MADE' : `NO_API_KEY_FOR_${PROVIDER.toUpperCase()}`;
  console.log(`citation probe: SKIPPED (${reason}); mode=${MODE}; provider=${PROVIDER}; ${queries.length} queries ready, owned domains: ${OWNED.join(', ')}. No observation and no citation rate recorded.`);
  process.exit(0);
}

const observations = [];
// One model can be idiosyncratic. Asking several and reporting each separately
// says more than averaging them into a single number would.
// Knowledge mode asks several cheap models because one model's idiosyncrasies
// are not a measurement. Grounded mode bills per search - around $0.007 a query
// - and the thing being measured is which pages the retrieval layer returns,
// which does not vary much by model. One model keeps a portfolio-wide run in
// cents. Override with OPENROUTER_GROUNDED_MODELS.
//
// openai/gpt-4o-mini rather than the first knowledge-mode model: the cheap
// knowledge-tier models are not all wired to the web plugin, and one that
// answers without annotations produces an observation that looks like "answered,
// cited nobody" when the truth is "never retrieved anything". gpt-4o-mini with
// the web plugin is the combination verified live on this key, returning real
// url_citation annotations.
const GROUNDED_MODELS = (process.env.OPENROUTER_GROUNDED_MODELS || 'openai/gpt-4o-mini')
  .split(',').map((m) => m.trim()).filter(Boolean);
const engines = PROVIDER === 'openrouter' ? (GROUNDED ? GROUNDED_MODELS : OR_MODELS) : [model];
for (const q of queries) {
 for (const engineModel of engines) {
  let r;
  try {
    r = PROVIDER === 'openrouter' ? await askOpenRouter(q, engineModel, GROUNDED) : await ask(q, key, engineModel, GROUNDED);
  } catch (e) { r = { ok: false, error: String(e.message || e) }; }
  if (!r.ok) {
    observations.push({ query: q, engine: `${PROVIDER}:${engineModel}`, mode: MODE, observed_at: now, status: 'provider_error', error: r.error });
    console.log(`  ERROR  ${engineModel} :: ${q} :: ${String(r.error).slice(0, 70)}`);
    continue;
  }
  const domains = [...new Set(r.uris.map(hostOf).filter(Boolean))];
  const ours = domains.filter((d) => OWNED.some((o) => d === o || d.endsWith(`.${o}`)));
  // In knowledge mode there are no grounded sources, so presence means the model
  // named the brand or domain in its own answer.
  const answerLower = (r.answer || '').toLowerCase();
  const named = OWNED.filter((o) => answerLower.includes(o) || answerLower.includes(o.split('.')[0]));
  observations.push({
    query: q, engine: `${PROVIDER}:${engineModel}`, mode: MODE, observed_at: now,
    status: 'observed',
    cited_domains: domains,
    cited_ours: ours,
    self_cited: GROUNDED ? ours.length > 0 : named.length > 0,
    named_in_answer: named,
    answer_mentions_brand: named.length > 0,
  });
  const hit = GROUNDED ? ours.length > 0 : named.length > 0;
  console.log(`  ${hit ? 'PRESENT' : '   --  '} ${engineModel.split('/').pop()} :: ${q}${hit ? ` (${(GROUNDED ? ours : named).join(', ')})` : ''}`);
 }
}

const prior = fs.existsSync(path.join(ROOT, OUT))
  ? JSON.parse(fs.readFileSync(path.join(ROOT, OUT), 'utf8'))
  : { schema_version: '1.0', runs: [] };
prior.runs = (prior.runs || []).slice(-49);
prior.runs.push({ run_at: now, provider: PROVIDER, engines, mode: MODE, queries: queries.length, observations });

const answeredObs = observations.filter((o) => o.status === 'observed');
const cited = observations.filter((o) => o.self_cited).length;
const errored = observations.filter((o) => o.status === 'provider_error').length;

// A rate is only defined over calls the provider actually answered.
//
// The old denominator was every observation, so a run where the provider errored
// on every single call still published `self_cited_rate_pct: 0` - a measured-
// looking zero produced by measuring nothing. That number then reads downstream
// as "answer engines do not cite us", which is a different and unearned claim.
//
// Now: the denominator is answered calls only, and if nothing was answered there
// is no rate at all - the field is null and the run is named PROVIDER_ERROR.
// Zero is reported only when the provider answered and genuinely cited none of
// our pages.
const answered = answeredObs.length;
const runStatus = answered === 0
  ? (observations.length ? 'PROVIDER_ERROR_NO_MEASUREMENT' : 'NO_OBSERVATIONS_ATTEMPTED')
  : (errored ? 'PARTIAL_PROVIDER_ANSWERED' : 'PROVIDER_ANSWERED');
prior.latest_summary = {
  run_at: now, provider: PROVIDER, engines, mode: MODE,
  status: runStatus,
  queries: queries.length, observations: observations.length,
  answered, errored, self_cited: cited,
  _mode_note: GROUNDED
    ? 'grounded: counted when the answer was built from one of our pages'
    : 'knowledge: counted when the model named us unprompted, with no retrieval. Weaker than a citation and must not be reported as one.',
  // null, never 0, when nothing answered. Consumers must treat null as "not
  // measured" and must not coerce it to zero.
  self_cited_rate_pct: answered ? Number(((100 * cited) / answered).toFixed(1)) : null,
  _rate_basis: answered
    ? 'percentage of provider-answered observations that cited one of our domains'
    : 'no provider-answered observation in this run, so no citation rate exists for it',
};

fs.mkdirSync(path.join(ROOT, path.dirname(OUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify(prior, null, 2) + '\n');

// Rule 0: the run always ends on a named outcome. A run that measured nothing
// says so and exits non-zero rather than exiting 0 on a fabricated zero.
if (!answered) {
  console.error(`citation probe [${PROVIDER}/${MODE}]: ${runStatus} - ${errored} provider error(s), 0 answered call(s). No citation rate recorded (self_cited_rate_pct: null). Recorded in ${OUT}`);
  for (const o of observations.slice(0, 5)) console.error(`  ${o.engine}: ${String(o.error).slice(0, 120)}`);
  process.exit(1);
}
console.log(`citation probe [${PROVIDER}/${MODE}]: ${runStatus}; ${cited}/${answered} provider-answered observations named one of our domains (${prior.latest_summary.self_cited_rate_pct}%); ${errored} provider error(s). Recorded in ${OUT}`);
