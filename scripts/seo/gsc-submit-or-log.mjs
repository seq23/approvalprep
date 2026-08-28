#!/usr/bin/env node
/**
 * Submit this site's sitemap to Google Search Console, or log why it could not.
 *
 * Two things kept this inert even though the workflow already sets RUN_MODE=live:
 *
 * 1. It accepted only a pre-minted access token. The portfolio stopped issuing
 *    those; the one credential still in use is a service-account JSON, which this
 *    repo holds as GSC_SERVICE_ACCOUNT_JSON. With no token it recorded
 *    DRY_RUN_REQUIRES_LIVE_MODE_OR_TOKEN on every run.
 * 2. The site identifier defaulted to https://approvalprep.com, but the verified
 *    Search Console property is the domain property sc-domain:approvalprep.com.
 *    Even with a valid token the endpoint would have addressed a property the
 *    account does not hold.
 *
 * Measured consequence: the property had ZERO sitemaps registered with Google.
 *
 * Sitemap submission needs the read/write webmasters scope, not webmasters.readonly.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

const mode = process.env.RUN_MODE || 'dry_run';
const site =
  process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL ||
  process.env.GSC_SITE_URL ||
  process.env.APPROVALPREP_SITE_URL ||
  'sc-domain:approvalprep.com';
// The sitemap URL is always an https:// address even when the property is a
// domain property, so it is derived separately from the property identifier.
const publicOrigin = (process.env.APPROVALPREP_PUBLIC_ORIGIN || 'https://approvalprep.com').replace(/\/$/, '');
const sitemap = `${publicOrigin}/sitemap.xml`;

const b64 = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');

async function accessToken() {
  const direct = process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN || process.env.GSC_ACCESS_TOKEN || '';
  if (direct) return direct;
  const raw = String(process.env.GSC_SERVICE_ACCOUNT_JSON || '').trim();
  if (!raw) return '';
  let info;
  try {
    info = raw.startsWith('{') ? JSON.parse(raw) : JSON.parse(fs.readFileSync(raw, 'utf8'));
  } catch { return ''; }
  if (!info?.client_email || !info?.private_key) return '';
  const iat = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: info.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters',
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp: iat + 3600,
  })}`;
  const sig = crypto.createSign('RSA-SHA256').update(unsigned).end()
    .sign(String(info.private_key).replace(/\\n/g, '\n')).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
  });
  const json = await res.json().catch(() => ({}));
  return json.access_token || '';
}

const token = await accessToken();
let status = 'DRY_RUN_REQUIRES_LIVE_MODE_OR_TOKEN';
let httpStatus = null;
let error = null;

if (mode === 'live' && token) {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/sitemaps/${encodeURIComponent(sitemap)}`;
  try {
    const r = await fetch(endpoint, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    httpStatus = r.status;
    if (!r.ok) throw new Error(`GSC sitemap submit HTTP ${r.status}: ${(await r.text()).slice(0, 500)}`);
    status = 'SUBMITTED';
  } catch (e) {
    status = 'SOURCE_ERROR';
    error = e.message;
    process.exitCode = 1;
  }
}

const receipt = { provider: 'Google Search Console', mode, status, site, sitemap, httpStatus, error, submittedSitemapCount: status === 'SUBMITTED' ? 1 : 0, preparedSitemapCount: 1, rankingProof: false, claimsIndexed: false, generatedAt: new Date().toISOString() };
const p = 'data/seo/submission_registry.json';
const registry = JSON.parse(fs.readFileSync(p, 'utf8'));
registry.submissions = [...(registry.submissions || []), receipt].slice(-500);
registry.note = 'Submission receipts are operational logs only. They are not ranking, indexing, citation, or traffic proof.';
fs.writeFileSync(p, JSON.stringify(registry, null, 2) + '\n');
console.log(`[gsc] ${status} site=${site} sitemap=${sitemap}`);
