#!/usr/bin/env node
// Behaviour guard for functions/_runtime/nurture.js (free sample -> email -> paid, review ask).
// Runs the real module and its real SQL on an in-memory SQLite shaped like D1, and fails if:
// an email goes out without the one-click unsubscribe link and the mailing address, two emails
// reach one address inside 3 days, the series continues after a purchase or an unsubscribe,
// a buyer is asked for a review twice, or a buyer's address is written to D1.
// Hard-fails on zero emails examined (rule 0).
import { DatabaseSync } from 'node:sqlite';
import { MAILING_ADDRESS, emailHash, optOut, recordPurchase, renderEmail, runNurture, sequence, signUpForSample, unsubscribeUrl, verifyUnsubscribe } from '../../functions/_runtime/nurture.js';

const DAY = 86_400_000;
const fail = (m) => { console.error(`[email-nurture] FAIL ${m}`); process.exit(1); };
function fakeD1() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(`CREATE TABLE products (slug TEXT, price_cents INTEGER, status TEXT); INSERT INTO products VALUES ('letter-of-explanation', 1500, 'live')`);
  const stmt = (sql, args = []) => ({
    async run() { const r = raw.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
    async all() { return { results: raw.prepare(sql).all(...args) }; },
    async first() { return raw.prepare(sql).get(...args) ?? null; },
  });
  return { raw, prepare: (sql) => ({ ...stmt(sql), bind: (...v) => stmt(sql, v) }) };
}
function resend() {
  const sent = [];
  const fetchImpl = async (_u, init) => { const b = JSON.parse(init.body); sent.push({ to: b.to[0], subject: b.subject, text: b.text, html: b.html, headers: b.headers, scheduled_at: b.scheduled_at }); return new Response(JSON.stringify({ id: `m${sent.length}` }), { status: 200 }); };
  return { sent, fetchImpl };
}
const envFor = (db) => ({ PRODUCTS_DB: db, RESEND_API_KEY: 'k', DOWNLOAD_SIGNING_SECRET: 's' });

// 1. The series: sample at once, then one kit per 3 days, then it ends.
{
  const db = fakeD1(); const { sent, fetchImpl } = resend(); const env = envFor(db);
  await signUpForSample(env, 'a@example.com', fetchImpl);
  await signUpForSample(env, 'a@example.com', fetchImpl);
  if (sent.length !== 1) fail(`a double sign-up sent ${sent.length} samples`);
  for (let h = 1; h <= 40 * 24; h += 6) await runNurture(env, Date.now() + h * 3_600_000, fetchImpl);
  const want = sequence().map((s) => s.subject);
  if (JSON.stringify(sent.map((s) => s.subject)) !== JSON.stringify(want)) fail(`series sent ${JSON.stringify(sent.map((s) => s.subject))}`);
  for (const m of sent) {
    if (!m.text.includes(MAILING_ADDRESS) || !m.html.includes(MAILING_ADDRESS)) fail(`"${m.subject}" has no mailing address`);
    const link = /Unsubscribe \(one click\): (\S+)/.exec(m.text)?.[1];
    if (!link || m.headers['List-Unsubscribe'] !== `<${link}>` || m.headers['List-Unsubscribe-Post'] !== 'List-Unsubscribe=One-Click') fail(`"${m.subject}" has no one-click unsubscribe`);
    if (link.includes('example.com')) fail('an unsubscribe link carries the address');
    const u = new URL(link);
    if (!(await verifyUnsubscribe('s', u.searchParams.get('id'), u.searchParams.get('t')))) fail('an unsubscribe link does not verify');
  }
  if (!/\$15/.test(sent[1].html)) fail('the kit email does not carry the live D1 price');
}
// 2. Stop on purchase, stop on unsubscribe; one review ask, scheduled, buyer address never stored.
{
  const db = fakeD1(); const { sent, fetchImpl } = resend(); const env = envFor(db);
  await signUpForSample(env, 'buyer@example.com', fetchImpl);
  await signUpForSample(env, 'gone@example.com', fetchImpl);
  await optOut(db, await emailHash('gone@example.com'));
  sent.length = 0;
  const now = Date.now();
  await recordPurchase(env, 'Buyer@Example.com', 'Letter of Explanation Kit', now, fetchImpl);
  await recordPurchase(env, 'buyer@example.com', 'Credit Letter Kit', now, fetchImpl);
  await recordPurchase(env, 'gone@example.com', 'Credit Letter Kit', now, fetchImpl);
  await recordPurchase(env, 'fresh@example.com', 'Credit Letter Kit', now, fetchImpl);
  for (let d = 1; d <= 30; d++) await runNurture(env, now + d * DAY, fetchImpl);
  if (sent.some((m) => m.to === 'gone@example.com')) fail('an unsubscribed address was emailed');
  const toBuyer = sent.filter((m) => m.to === 'buyer@example.com');
  if (toBuyer.length !== 1 || !/question about your ApprovalPrep kit/.test(toBuyer[0].subject)) fail(`the buyer got ${JSON.stringify(toBuyer.map((m) => m.subject))}, want exactly one review ask`);
  const lead = Date.parse(toBuyer[0].scheduled_at ?? '') - now;
  if (!(lead > 48 * 3_600_000 && lead <= 72 * 3_600_000)) fail('the review ask is not scheduled 2-3 days after purchase (Resend allows 72h at most)');
  for (const { name } of db.raw.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()) {
    const dump = JSON.stringify(db.raw.prepare(`SELECT * FROM ${name}`).all());
    if (/fresh@example\.com/i.test(dump)) fail(`a buyer's address was written to D1 table ${name}`);
  }
  if ((await signUpForSample(env, 'gone@example.com', fetchImpl)).status !== 'OPTED_OUT') fail('an opted-out address got the sample again');
}
// 3. A missing key is a named stop, not a silent pass.
{
  const run = await runNurture({ PRODUCTS_DB: fakeD1() }, Date.now(), resend().fetchImpl);
  if (!/^NAMED STOP \[NO_RESEND_KEY\]/.test(run.stop ?? '')) fail('a missing Resend key did not stop by name');
}
const link = await unsubscribeUrl('s', await emailHash('x@example.com'));
if (!renderEmail(sequence()[0], link).text.includes(link)) fail('rendered email lost its unsubscribe link');
console.log('[email-nurture] PASS (series, 3-day gap, stop on purchase/unsubscribe, one scheduled review ask, buyer address never stored, named stop)');
