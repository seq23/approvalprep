#!/usr/bin/env node
// Behaviour guard for promo-code tries on POST /api/create-checkout-session (security audit 27 Nov 2026, check 14).
// Runs the real handler on an in-memory SQLite shaped like D1 (the repo's own migration) with a fake Stripe, and
// fails if: a real code or a no-code checkout does not get a checkout link; a wrong code is not INVALID_DISCOUNT_CODE;
// one network (IPv6 counted by its /64) gets more than 10 code tries an hour, or its 11th try reaches Stripe; the
// next hour does not reset it; a locked-out network cannot check out without a code; rotating /64s inside one /48
// gets past 30 an hour; the whole site gets past 500 code tries a day; a limiter that cannot be read (D1 down or
// missing) lets a code reach Stripe instead of answering 503. Hard-fails on zero checkout links made (rule 0).
// No network. Run by validate:all (HARD_FAIL).
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { onRequestPost, PROMO_LIMITS, PROMO_TOO_MANY, PROMO_UNCHECKED } from '../../functions/api/create-checkout-session.js';

const fail = (m) => { console.error(`[checkout-promo-limits] FAIL ${m}`); process.exit(1); };
const NOW = Date.parse('2026-11-27T12:00:30Z');
const HOUR = 3_600_000;
function fakeD1({ broken = false } = {}) {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync('migrations/0001_runtime_product_admin.sql', 'utf8'));
  const stmt = (sql, args = []) => {
    const guard = () => { if (broken && /email_rate_limits/.test(sql)) throw new Error('D1_UNAVAILABLE'); };
    return {
      async run() { guard(); const r = raw.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
      async all() { guard(); return { results: raw.prepare(sql).all(...args) }; },
      async first() { guard(); return raw.prepare(sql).get(...args) ?? null; },
    };
  };
  return { prepare: (sql) => ({ ...stmt(sql), bind: (...v) => stmt(sql, v) }) };
}
// Fake Stripe: GOOD10 exists; every other code does not. Counts promotion-code lookups.
const stripe = { lookups: 0, sessions: 0 };
globalThis.fetch = async (url) => {
  const u = new URL(String(url));
  if (u.pathname === '/v1/promotion_codes') {
    stripe.lookups += 1;
    const found = u.searchParams.get('code') === 'GOOD10';
    return new Response(JSON.stringify({ data: found ? [{ id: 'promo_good10' }] : [] }), { status: 200 });
  }
  if (u.pathname === '/v1/checkout/sessions') {
    stripe.sessions += 1;
    return new Response(JSON.stringify({ id: `cs_test_${stripe.sessions}`, url: `https://checkout.stripe.com/c/pay/cs_test_${stripe.sessions}` }), { status: 200 });
  }
  throw new Error(`unexpected fetch ${url}`);
};
const env = (db) => ({ PRODUCTS_DB: db, STRIPE_SECRET_KEY: 'sk_test_fake', STRIPE_MODE: 'test', PUBLIC_SITE_URL: 'https://approvalprep.com' });
const post = async (db, ip, code, now = NOW) => {
  const r = await onRequestPost({ env: env(db), now, request: new Request('https://approvalprep.com/api/create-checkout-session', {
    method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
    body: JSON.stringify({ sku: 'letter-of-explanation', discount_code: code }),
  }) });
  return { status: r.status, body: await r.json() };
};
let links = 0;
const linked = (r) => { if (r.status === 200 && r.body.checkoutUrl) { links += 1; return true; } return false; };

// 0. Fixed numbers, never read back from PROMO_LIMITS alone, so a raised cap cannot pass its own test.
if (JSON.stringify(PROMO_LIMITS) !== JSON.stringify({ perIpHour: 10, perBlockHour: 30, globalDay: 500 })) fail(`limits are ${JSON.stringify(PROMO_LIMITS)}; this guard says 10 / 30 / 500`);
// 1. A real code and no code both get a checkout link; a wrong code is INVALID_DISCOUNT_CODE.
{
  const db = fakeD1();
  if (!linked(await post(db, '198.51.100.1', 'good10'))) fail('a real promo code did not get a checkout link');
  if (!linked(await post(db, '198.51.100.1', ''))) fail('a checkout without a code did not get a link');
  const wrong = await post(db, '198.51.100.1', 'NOPE1');
  if (wrong.status !== 400 || wrong.body.error !== 'INVALID_DISCOUNT_CODE') fail(`a wrong code answered ${wrong.status} ${wrong.body.error}`);
}
// 2. One network: 10 code tries an hour, then a calm 429 that never reaches Stripe; no-code checkout still works;
// the next hour starts again. IPv6 addresses inside one /64 are one network.
{
  const db = fakeD1();
  for (let i = 0; i < 10; i++) {
    const r = await post(db, `2001:db8:1:2::${(i + 1).toString(16)}`, `GUESS${i}`);
    if (r.status !== 400) fail(`try ${i + 1} of 10 was refused early (${r.status})`);
  }
  const before = stripe.lookups;
  const over = await post(db, '2001:db8:1:2:ffff:ffff:ffff:ffff', 'GOOD10');
  if (over.status !== 429 || over.body.error !== 'TOO_MANY_PROMO_TRIES' || over.body.ok !== false || over.body.message !== PROMO_TOO_MANY) fail(`the 11th try in an hour answered ${over.status} ${over.body.error}`);
  if (stripe.lookups !== before) fail('the 11th try still asked Stripe whether the code exists');
  if (!linked(await post(db, '2001:db8:1:2::1', ''))) fail('a network over its code limit could not check out without a code');
  if (!linked(await post(db, '2001:db8:1:2::1', 'GOOD10', NOW + HOUR))) fail('the code limit did not reset the next hour');
  if (!linked(await post(db, '2001:db8:1:3::1', 'GOOD10'))) fail('a different /64 was refused: one network locked out everyone');
}
// 3. Rotating /64s inside one /48: stops at 30 an hour.
{
  const db = fakeD1();
  let ok = 0;
  for (let i = 0; i < 40; i++) { const r = await post(db, `2001:db8:5:${(i + 1).toString(16)}::1`, `GUESS${i}`); if (r.status === 400) ok += 1; }
  if (ok !== 30) fail(`one /48 made ${ok} code tries in an hour; cap 30`);
}
// 4. The whole site: 500 code tries a day, then refused (no-code checkout still open).
{
  const db = fakeD1();
  let ok = 0;
  for (let i = 0; i < 510; i++) { const r = await post(db, `10.${(i >> 8) & 255}.${i & 255}.1`, `GUESS${i}`, NOW + Math.floor(i / 50) * HOUR); if (r.status === 400) ok += 1; }
  if (ok !== 500) fail(`the site made ${ok} code tries in a day; cap 500`);
  if (!linked(await post(db, '192.0.2.200', '', NOW + 11 * HOUR))) fail('the site-wide code cap blocked checkout without a code');
}
// 5. A limiter that cannot be read refuses with 503, and the code never reaches Stripe. No-code checkout is unaffected.
for (const [name, db] of [['D1 down', fakeD1({ broken: true })], ['D1 missing', null]]) {
  const before = stripe.lookups;
  const r = await post(db, '198.51.100.9', 'GOOD10');
  if (r.status !== 503 || r.body.error !== 'PROMO_CHECK_UNAVAILABLE' || r.body.message !== PROMO_UNCHECKED) fail(`${name}: a code answered ${r.status} ${r.body.error}`);
  if (stripe.lookups !== before) fail(`${name}: the code reached Stripe with no limit read`);
  if (!linked(await post(db, '198.51.100.9', ''))) fail(`${name}: checkout without a code was refused`);
}
if (links < 8) fail(`only ${links} checkout links were made; the guard saw too little`);
console.log(`[checkout-promo-limits] PASS (${links} checkout links, ${stripe.lookups} code lookups)`);
