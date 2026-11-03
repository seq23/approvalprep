#!/usr/bin/env node
/**
 * Checklist item f11: the weekly search-loop report must carry a NUMBER for AI-referral visits
 * and for AI-bot reads. Both are read from Cloudflare by the shared engine
 * (seq23/search-loop src/analytics.mjs `cloudflareDay`), with the token this repository's caller
 * workflow passes as `CLOUDFLARE_API_TOKEN`.
 *
 * What went wrong, 1 Nov 2026 - 3 Nov 2026: the caller passed `SEARCH_LOOP_CF_USAGE_TOKEN`, which
 * holds Account Analytics:Read (enough for the Workers AI neuron-usage read) but NOT zone
 * Analytics:Read. Cloudflare answered every analytics query with
 *
 *     does not have permission 'com.cloudflare.api.account.zone.analytics.read' for zone ...
 *
 * so report 2026-W45 wrote `ai_visitors` and `ai_bot_hits` as "not read: ..." strings and f11
 * failed. Nothing in the repository noticed, because the only lever here is which secret the
 * caller hands the engine - a YAML mapping no test read.
 *
 * This validator reads that mapping, and (when a token is actually in the environment) proves the
 * two Cloudflare queries the engine runs still answer.
 *
 * STATIC, every run, no network:
 *   1. `.github/workflows/search-loop.yml` exists and calls the shared engine;
 *   2. it passes CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID - without either, `cloudflareDay`
 *      returns "not set"/no Web Analytics and f11 can never pass;
 *   3. the secret it passes as CLOUDFLARE_API_TOKEN is one declared analytics-capable here. A
 *      token known to lack zone Analytics:Read (SEARCH_LOOP_CF_USAGE_TOKEN) is refused by name.
 *   Zero assertions made is a failure, not a pass.
 *
 * LIVE, only when a token is injected (vault run, or a lane that passes the secret):
 *   4. the zone bot query (httpRequestsAdaptiveGroups by userAgent) answers, and
 *   5. the account Web Analytics query (rumPageloadEventsAdaptiveGroups) answers.
 *   With no token the live half prints NOT_CHECKED with the reason and the static half still
 *   decides the exit code - it never reports a pass over a probe that did not run.
 *
 * Run it with the real token:
 *   cd ~/GitHub/boss-os && npm run -s vault:run -- node \
 *     ~/GitHub/approvalprep/scripts/validate/search-loop-ai-measurement.mjs
 */
import fs from 'node:fs';

const TAG = '[search-loop-ai-measurement]';
const WORKFLOW = '.github/workflows/search-loop.yml';
const ENGINE = /uses:\s*['"]?seq23\/search-loop\/\.github\/workflows\/search-loop\.yml@/;

/**
 * Secrets that hold BOTH halves the engine needs: Account Analytics:Read, and
 * Zone:Read + Zone Analytics:Read. Add a name here only after probing it live (step 4/5 above)
 * against this site's zone.
 */
const ANALYTICS_CAPABLE = new Set(['SEARCH_LOOP_CF_ANALYTICS_TOKEN']);
/** Secrets proven to lack zone Analytics:Read. Named so the regression cannot come back quietly. */
const KNOWN_ACCOUNT_ONLY = new Map([
  ['SEARCH_LOOP_CF_USAGE_TOKEN', "lacks 'com.cloudflare.api.account.zone.analytics.read' (proved 3 Nov 2026); it reads Workers AI usage only"],
]);

const fail = [];
const ok = [];
let asserted = 0;

if (!fs.existsSync(WORKFLOW)) {
  console.error(`${TAG} FAIL: ${WORKFLOW} is missing - the search growth loop cannot run and f11 can never pass`);
  process.exit(1);
}
const yml = fs.readFileSync(WORKFLOW, 'utf8');

asserted += 1;
if (!ENGINE.test(yml)) fail.push(`${WORKFLOW} does not call seq23/search-loop - no weekly report is produced`);
else ok.push('calls the shared search-loop engine');

const mapping = (name) => new RegExp(`^\\s*${name}:\\s*\\$\\{\\{\\s*secrets\\.([A-Za-z0-9_]+)\\s*\\}\\}`, 'm').exec(yml)?.[1] ?? null;

asserted += 1;
const acct = mapping('CLOUDFLARE_ACCOUNT_ID');
if (!acct) fail.push('CLOUDFLARE_ACCOUNT_ID is not passed to the engine - Web Analytics (the free zone\'s only referrer source) cannot be read, so AI-referral visits stay "not read"');
else ok.push(`CLOUDFLARE_ACCOUNT_ID <- secrets.${acct}`);

asserted += 1;
const tok = mapping('CLOUDFLARE_API_TOKEN');
if (!tok) {
  fail.push('CLOUDFLARE_API_TOKEN is not passed to the engine - cloudflareDay returns "CLOUDFLARE_API_TOKEN is not set" and both f11 numbers stay "not read"');
} else if (KNOWN_ACCOUNT_ONLY.has(tok)) {
  fail.push(`CLOUDFLARE_API_TOKEN <- secrets.${tok}, which ${KNOWN_ACCOUNT_ONLY.get(tok)}. Pass a secret with zone Analytics:Read as well (${[...ANALYTICS_CAPABLE].join(', ')}).`);
} else if (!ANALYTICS_CAPABLE.has(tok)) {
  fail.push(`CLOUDFLARE_API_TOKEN <- secrets.${tok}, which is not declared analytics-capable in this validator. Probe it live against the site's zone (see the header), then add its name to ANALYTICS_CAPABLE.`);
} else {
  ok.push(`CLOUDFLARE_API_TOKEN <- secrets.${tok} (declared analytics-capable)`);
}

if (!asserted) {
  console.error(`${TAG} FAIL: zero assertions made - refusing to pass`);
  process.exit(1);
}

// ── live half ────────────────────────────────────────────────────────────────
const ZONE = 'approvalprep.com';
const token = (process.env.SEARCH_LOOP_CF_ANALYTICS_TOKEN || process.env.CLOUDFLARE_ANALYTICS_READ_TOKEN || '').trim();
const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
const redact = (s) => String(s).replace(/token\.[0-9a-f]+/g, 'token').slice(0, 160);

if (!token || !accountId) {
  console.log(`${TAG} NOT_CHECKED: the live Cloudflare probe did not run (no analytics token / account id in this lane). The workflow mapping above still decided this run.`);
} else {
  const CF = 'https://api.cloudflare.com/client/v4';
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const gql = async (query, variables) => {
    try {
      const r = await fetch(`${CF}/graphql`, { method: 'POST', headers, body: JSON.stringify({ query, variables }) });
      const j = await r.json();
      return j?.errors?.length ? { error: redact(j.errors[0].message) } : { data: j?.data };
    } catch (e) { return { error: redact(e.message) }; }
  };
  const since = new Date(Date.now() - 86400000).toISOString();
  const until = new Date().toISOString();
  let zone = null;
  try {
    const z = await (await fetch(`${CF}/zones?name=${encodeURIComponent(ZONE)}`, { headers })).json();
    zone = z?.result?.[0]?.id ?? null;
  } catch { /* reported below */ }
  if (!zone) {
    fail.push(`the analytics token cannot see zone ${ZONE}; it needs Zone:Read + Zone Analytics:Read`);
  } else {
    asserted += 1;
    const b = await gql('query($zone:String!,$since:Time!,$until:Time!){viewer{zones(filter:{zoneTag:$zone}){bots:httpRequestsAdaptiveGroups(limit:5,filter:{datetime_geq:$since,datetime_lt:$until}){count dimensions{userAgent}}}}}', { zone, since, until });
    if (b.error) fail.push(`Cloudflare refused the AI-bot query the engine runs: ${b.error}`);
    else ok.push(`zone bot query answers (${b.data?.viewer?.zones?.[0]?.bots?.length ?? 0} user-agent group(s) in 24h)`);

    asserted += 1;
    const r = await gql('query($a:String!,$since:Time!,$until:Time!){viewer{accounts(filter:{accountTag:$a}){rum:rumPageloadEventsAdaptiveGroups(limit:5,filter:{datetime_geq:$since,datetime_lt:$until}){count dimensions{refererHost}}}}}', { a: accountId, since, until });
    if (r.error) fail.push(`Cloudflare refused the Web Analytics referral query the engine runs: ${r.error}`);
    else ok.push(`account Web Analytics query answers (${r.data?.viewer?.accounts?.[0]?.rum?.length ?? 0} referrer group(s) in 24h)`);
  }
}

if (fail.length) {
  console.error(`${TAG} FAIL: ${fail.length} problem(s); the weekly report cannot carry AI-referral visits and AI-bot reads (checklist f11)`);
  for (const f of fail) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`${TAG} OK ${asserted} assertion(s): ${ok.join('; ')}`);
