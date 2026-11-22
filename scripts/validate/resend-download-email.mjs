#!/usr/bin/env node
// Behaviour guard for POST /api/resend-download-email (functions/_runtime/resend-download.js) and
// the rate limit on POST /api/sample. Runs the real handlers on an in-memory SQLite shaped like
// D1 with Stripe and Resend mocked, and fails if: an unknown or unpaid order sends anything, a
// caller-supplied recipient/URL/SKU/text reaches an email, the answer differs between a real and
// an unknown order, limits do not answer 429, or a paid order does not send to Stripe's stored
// address with a server-built link. Hard-fails on zero emails examined (rule 0).
import { DatabaseSync } from 'node:sqlite';
import { resendDownload, emailDownloadLinks, LIMITS, ACCEPTED, EMAIL_LIMITS, EMAIL_ACCEPTED } from '../../functions/_runtime/resend-download.js';
import { onRequestPost as samplePost } from '../../functions/api/sample.js';

const fail = (m) => { console.error(`[resend-download-email] FAIL ${m}`); process.exit(1); };
function fakeD1() {
  const raw = new DatabaseSync(':memory:');
  raw.exec('CREATE TABLE download_entitlements (stripe_session_id TEXT, revoked_at TEXT)');
  const stmt = (sql, args = []) => ({
    async run() { const r = raw.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
    async all() { return { results: raw.prepare(sql).all(...args) }; },
    async first() { return raw.prepare(sql).get(...args) ?? null; },
  });
  return { raw, prepare: (sql) => ({ ...stmt(sql), bind: (...v) => stmt(sql, v) }) };
}
const PAID = 'cs_live_PAIDorder1234567890';
const UNPAID = 'cs_live_UNPAIDorder123456789';
const sessions = {
  [PAID]: { id: PAID, payment_status: 'paid', status: 'complete', metadata: { sku: 'credit-letter-kit' }, customer_details: { email: 'buyer@example.com' } },
  [UNPAID]: { id: UNPAID, payment_status: 'unpaid', status: 'open', metadata: { sku: 'credit-letter-kit' }, customer_details: { email: 'buyer2@example.com' } },
};
function mocks() {
  const sent = [];
  const fetchImpl = async (url, init) => {
    if (String(url).startsWith('https://api.resend.com/')) { sent.push(JSON.parse(init.body)); return new Response(JSON.stringify({ id: `m${sent.length}` }), { status: 200 }); }
    const id = decodeURIComponent(String(url).split('/').pop());
    return sessions[id] ? new Response(JSON.stringify(sessions[id]), { status: 200 }) : new Response(JSON.stringify({ error: { message: 'No such checkout.session' } }), { status: 404 });
  };
  return { sent, fetchImpl };
}
const env = (db) => ({ PRODUCTS_DB: db, RESEND_API_KEY: 'k', STRIPE_SECRET_KEY: 'sk_test_x' });
const req = (body, ip = '203.0.113.1') => new Request('https://approvalprep.com/api/resend-download-email', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify(body) });
const ATTACK = { email: 'victim@evil.test', to: 'victim@evil.test', sku: 'PHISH', downloadUrl: 'https://evil.test/login', text: 'click here' };
let examined = 0;

// 1. Unknown, unpaid, malformed and empty orders: nothing sent, the same answer as a real order.
{
  const db = fakeD1(); const { sent, fetchImpl } = mocks(); const e = env(db);
  const answers = [];
  for (const body of [{ ...ATTACK }, { ...ATTACK, session_id: 'cs_live_UNKNOWNorder123456' }, { ...ATTACK, session_id: UNPAID }, { session_id: 'not-a-session' }, {}]) {
    const r = await resendDownload(req(body), e, fetchImpl);
    answers.push([r.status, await r.text()]);
  }
  if (sent.length) fail(`an unknown/unpaid order sent ${sent.length} email(s), to ${JSON.stringify(sent.map((m) => m.to))}`);
  const real = await resendDownload(req({ session_id: PAID }), e, fetchImpl);
  const realAnswer = [real.status, await real.text()];
  for (const a of answers) if (JSON.stringify(a) !== JSON.stringify(realAnswer)) fail(`answer for an unknown order ${JSON.stringify(a)} differs from a real one ${JSON.stringify(realAnswer)} (enumeration)`);
  if (realAnswer[0] !== 202 || JSON.parse(realAnswer[1]).status !== ACCEPTED.status) fail(`unexpected answer ${JSON.stringify(realAnswer)}`);
  if (sent.length !== 1) fail(`a paid order sent ${sent.length} emails, want 1`);
}
// 2. A paid order with attacker fields: the email goes ONLY to Stripe's address with a server-built link.
{
  const db = fakeD1(); const { sent, fetchImpl } = mocks(); const e = env(db);
  await resendDownload(req({ ...ATTACK, session_id: PAID }), e, fetchImpl);
  if (sent.length !== 1) fail(`paid order with attacker fields sent ${sent.length} emails, want 1`);
  const m = sent[0]; examined++;
  if (JSON.stringify(m.to) !== JSON.stringify(['buyer@example.com'])) fail(`email went to ${JSON.stringify(m.to)}, not the stored order address`);
  const all = JSON.stringify(m);
  for (const bad of ['evil.test', 'PHISH', 'click here']) if (all.includes(bad)) fail(`caller-supplied "${bad}" reached the email`);
  if (!m.text.includes(`https://approvalprep.com/checkout/success?session_id=${PAID}&sku=credit-letter-kit`)) fail('the email lacks the server-built download link');
  // A revoked entitlement sends nothing.
  db.raw.prepare('INSERT INTO download_entitlements VALUES (?, ?)').run(PAID, '2026-01-01');
  sent.length = 0;
  await resendDownload(req({ session_id: PAID }, '203.0.113.9'), e, fetchImpl);
  if (sent.length) fail('a revoked order was emailed');
}
// 3. Limits: 3/hour per order, 20/hour per IP -> 429.
{
  const db = fakeD1(); const { sent, fetchImpl } = mocks(); const e = env(db);
  const codes = [];
  for (let i = 0; i < LIMITS.perOrderHour + 1; i++) codes.push((await resendDownload(req({ session_id: PAID }, `198.51.100.${i}`), e, fetchImpl)).status);
  if (sent.length !== LIMITS.perOrderHour || codes.at(-1) !== 429) fail(`per-order limit: sent ${sent.length}, last code ${codes.at(-1)}`);
  const ipCodes = [];
  for (let i = 0; i < LIMITS.perIpHour + 1; i++) ipCodes.push((await resendDownload(req({ session_id: `cs_live_UNKNOWN${String(i).padStart(12, '0')}` }, '192.0.2.7'), e, fetchImpl)).status);
  if (ipCodes.at(-1) !== 429 || ipCodes.slice(0, -1).some((c) => c !== 202)) fail(`per-IP limit codes ${JSON.stringify(ipCodes)}`);
  const dump = JSON.stringify(db.raw.prepare('SELECT * FROM email_rate_limits').all());
  if (/192\.0\.2\.7|198\.51\.100|cs_live_/.test(dump)) fail('a raw IP or order id was written to the rate-limit table');
}
// 4. Missing configuration is a named 503, never a send.
{
  const { sent, fetchImpl } = mocks();
  const r = await resendDownload(req({ session_id: PAID }), { PRODUCTS_DB: fakeD1() }, fetchImpl);
  if (r.status !== 503 || sent.length) fail('missing Resend/Stripe key did not stop with 503');
}
// 5. /api/sample: 5 an hour per IP, then 429. (The mail-domain lookup is stubbed: no network here.)
const dnsOk = async () => new Response(JSON.stringify({ Status: 0, Answer: [{ type: 15, data: '10 mx.example.net.' }] }), { status: 200 });
{
  const db = fakeD1(); const { sent, fetchImpl } = mocks();
  const e = { PRODUCTS_DB: db, RESEND_API_KEY: 'k', DOWNLOAD_SIGNING_SECRET: 's' };
  db.raw.exec("CREATE TABLE products (slug TEXT, price_cents INTEGER, status TEXT)");
  const codes = [];
  for (let i = 0; i < 6; i++) codes.push((await samplePost({ request: new Request('https://approvalprep.com/api/sample', { method: 'POST', headers: { 'cf-connecting-ip': '192.0.2.50' }, body: JSON.stringify({ email: `s${i}@example.com`, consent: true }) }), env: e }, fetchImpl, dnsOk)).status);
  if (codes.at(-1) !== 429 || sent.length !== 5) fail(`sample per-IP limit: codes ${JSON.stringify(codes)}, sent ${sent.length}`);
  examined += sent.length;
}
// 6. Email lookup (WEBSITE_ORDER_EMAIL_LOOKUP): same answer found or not, refunded never emailed,
//    links only to the searched address, no order data back, limits per IP and per address.
{
  const REFUNDED = 'cs_live_REFUNDEDorder12345678';
  const OTHER = 'cs_live_OTHERshoporder1234567';
  const listed = {
    'buyer@example.com': [sessions[PAID], { id: REFUNDED, payment_status: 'paid', status: 'complete', metadata: { sku: 'rental-application-kit' }, customer_details: { email: 'buyer@example.com' } }, { id: OTHER, payment_status: 'paid', status: 'complete', metadata: { sku: 'not-an-approvalprep-kit' }, customer_details: { email: 'buyer@example.com' } }],
    'refunded@example.com': [{ id: REFUNDED, payment_status: 'paid', status: 'complete', metadata: { sku: 'rental-application-kit' }, customer_details: { email: 'refunded@example.com' } }],
  };
  const lookups = [];
  const sent = [];
  const fetchImpl = async (url, init) => {
    if (String(url).startsWith('https://api.resend.com/')) { sent.push(JSON.parse(init.body)); return new Response('{}', { status: 200 }); }
    const u = new URL(String(url));
    if (u.pathname !== '/v1/checkout/sessions' || u.searchParams.get('status') !== 'complete') return new Response('{}', { status: 404 });
    const email = u.searchParams.get('customer_details[email]'); lookups.push(email);
    return new Response(JSON.stringify({ data: listed[email] ?? [] }), { status: 200 });
  };
  const ereq = (body, ip = '203.0.113.20') => new Request('https://approvalprep.com/api/email-download-links', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify(body) });
  const db = fakeD1(); const e = env(db);
  db.raw.prepare('INSERT INTO download_entitlements VALUES (?, ?)').run(REFUNDED, '2026-01-01');
  const answer = async (body, ip) => { const r = await emailDownloadLinks(ereq(body, ip), e, fetchImpl); return [r.status, await r.text()]; };
  const found = await answer({ email: '  Buyer@Example.COM ' }, '203.0.113.21');
  if (lookups[0] !== 'buyer@example.com') fail(`email not trimmed/lowercased before the Stripe search: ${JSON.stringify(lookups[0])}`);
  if (sent.length !== 1) fail(`a paid order found by email sent ${sent.length} emails, want 1`);
  const m = sent[0]; examined++;
  if (JSON.stringify(m.to) !== JSON.stringify(['buyer@example.com'])) fail(`lookup email went to ${JSON.stringify(m.to)}`);
  if (!m.text.includes(`https://approvalprep.com/checkout/success?session_id=${PAID}&sku=credit-letter-kit`)) fail('lookup email lacks the server-built link');
  if (m.text.includes(REFUNDED) || m.text.includes(OTHER)) fail('a refunded or non-ApprovalPrep order was emailed');
  const notFound = await answer({ email: 'nobody@example.com' }, '203.0.113.22');
  const refunded = await answer({ email: 'refunded@example.com' }, '203.0.113.23');
  const junk = await answer({ email: 'not an email', to: 'victim@evil.test' }, '203.0.113.24');
  if (sent.length !== 1) fail(`not-found/refunded/junk lookups sent ${sent.length - 1} email(s)`);
  for (const a of [notFound, refunded, junk]) if (JSON.stringify(a) !== JSON.stringify(found)) fail(`lookup answer ${JSON.stringify(a)} differs from a found one ${JSON.stringify(found)} (enumeration)`);
  if (found[0] !== 202 || JSON.parse(found[1]).message !== EMAIL_ACCEPTED.message || /cs_|sku|credit-letter/.test(found[1])) fail(`lookup answer leaks or is wrong: ${JSON.stringify(found)}`);
  // Limits: per address (3/hour, any IP) then per IP (10/hour, any address) -> 429; no raw address or IP stored.
  const perEmail = [];
  for (let i = 0; i < EMAIL_LIMITS.perEmailHour + 1; i++) perEmail.push((await answer({ email: 'limit@example.com' }, `198.51.100.${60 + i}`))[0]);
  if (perEmail.at(-1) !== 429 || perEmail.slice(0, -1).some((c) => c !== 202)) fail(`per-address limit codes ${JSON.stringify(perEmail)}`);
  const perIp = [];
  for (let i = 0; i < EMAIL_LIMITS.perIpHour + 1; i++) perIp.push((await answer({ email: `ip${i}@example.com` }, '192.0.2.77'))[0]);
  if (perIp.at(-1) !== 429 || perIp.slice(0, -1).some((c) => c !== 202)) fail(`per-IP lookup limit codes ${JSON.stringify(perIp)}`);
  const dump = JSON.stringify(db.raw.prepare('SELECT * FROM email_rate_limits').all());
  if (/example\.com|192\.0\.2\.77/.test(dump)) fail('a raw address or IP was written to the rate-limit table');
  const r = await emailDownloadLinks(ereq({ email: 'buyer@example.com' }), { PRODUCTS_DB: fakeD1() }, fetchImpl);
  if (r.status !== 503) fail('lookup without Stripe/Resend keys did not stop with 503');
}
if (!examined) fail('zero emails examined');
console.log(`[resend-download-email] PASS (no send for unknown/unpaid/revoked orders, same answer either way, caller fields ignored, stored address + server link, 429 per order/IP, sample per-IP cap; email lookup: same answer found/not, refunded not sent, per-address/IP 429; ${examined} emails examined)`);
