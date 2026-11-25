#!/usr/bin/env node
// Behaviour guard for functions/_runtime/nurture.js (free sample -> email -> paid, review ask).
// Runs the real module and its real SQL on an in-memory SQLite shaped like D1, and fails if:
// an email goes out without the one-click unsubscribe link and the mailing address, two emails
// reach one address inside 3 days, the series continues after a purchase or an unsubscribe,
// a buyer is asked for a review twice, or a buyer's address is written to D1.
// Hard-fails on zero emails examined (rule 0).
import { DatabaseSync } from 'node:sqlite';
import { MAILING_ADDRESS, confirmSignup, emailHash, employmentSequence, EMPLOYMENT_SOURCE, mailDomainOk, optOut, recordPurchase, renderEmail, runNurture, sequence, signUpForSample, signupCounts, starterSequence, STARTER_SOURCE, unsubscribeUrl, verifyUnsubscribe } from '../../functions/_runtime/nurture.js';
import { onRequestGet as confirmGet, onRequestPost as confirmPost } from '../../functions/api/confirm.js';

const DAY = 86_400_000;
const dnsOk = async () => new Response(JSON.stringify({ Status: 0, Answer: [{ type: 15, data: '10 mx.example.net.' }] }), { status: 200 });
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
// Double opt-in: press the button behind the confirm link in the last confirm email to this address.
async function pressConfirm(env, sent, to, fetchImpl) {
  const m = [...sent].reverse().find((x) => x.to === to && /^Confirm your email/.test(x.subject));
  if (!m) fail(`no confirm email reached ${to}`);
  const link = /Confirm my email: (\S+)/.exec(m.text)?.[1];
  if (!link) fail('the confirm email has no confirm link');
  return confirmPost({ request: new Request(link, { method: 'POST' }), env }, fetchImpl);
}
const subjects = (sent, to) => sent.filter((m) => !to || m.to === to).map((m) => m.subject);

// 1. Double opt-in, then the series: ONE confirm email; nothing more until the button is pressed;
// then the sample at once, one kit per 3 days, and it ends.
{
  const db = fakeD1(); const { sent, fetchImpl } = resend(); const env = envFor(db);
  await signUpForSample(env, 'a@example.com', fetchImpl);
  await signUpForSample(env, 'a@example.com', fetchImpl);
  if (sent.length !== 1 || !/^Confirm your email/.test(sent[0].subject)) fail(`a double sign-up sent ${JSON.stringify(subjects(sent))}, want one confirm email`);
  for (let h = 1; h <= 10 * 24; h += 6) await runNurture(env, Date.now() + h * 3_600_000, fetchImpl);
  if (sent.length !== 1) fail(`an unconfirmed address got ${JSON.stringify(subjects(sent))}`);
  const link = /Confirm my email: (\S+)/.exec(sent[0].text)[1];
  const scanned = await confirmGet({ request: new Request(link), env });
  if (scanned.status !== 200 || !/method="post"/.test(await scanned.text())) fail('opening the confirm link does not show a confirm button');
  if (db.raw.prepare('SELECT confirmed_at FROM email_signups').get().confirmed_at) fail('a GET (a link scanner) confirmed the address');
  const forged = await confirmPost({ request: new Request(link.replace(/t=[0-9a-f]+/, 't=' + '0'.repeat(32)), { method: 'POST' }), env }, fetchImpl);
  if (forged.status !== 400) fail('a forged confirm token was accepted');
  const unsub = await unsubscribeUrl('s', await emailHash('a@example.com'));
  if ((await confirmPost({ request: new Request(link.replace(/t=[0-9a-f]+/, 't=' + new URL(unsub).searchParams.get('t')), { method: 'POST' }), env }, fetchImpl)).status !== 400) fail('an unsubscribe token confirmed an address');
  const pressed = await pressConfirm(env, sent, 'a@example.com', fetchImpl);
  if (pressed.status !== 200) fail(`the confirm button answered ${pressed.status}`);
  await pressConfirm(env, sent, 'a@example.com', fetchImpl);
  for (let h = 1; h <= 40 * 24; h += 6) await runNurture(env, Date.now() + h * 3_600_000, fetchImpl);
  const want = ['confirm', ...sequence().map((x) => x.subject)];
  const got = subjects(sent).map((x, i) => (i === 0 ? 'confirm' : x));
  if (JSON.stringify(got) !== JSON.stringify(want)) fail(`series sent ${JSON.stringify(subjects(sent))}`);
  for (const m of sent) {
    if (!m.text.includes(MAILING_ADDRESS) || !m.html.includes(MAILING_ADDRESS)) fail(`"${m.subject}" has no mailing address`);
    const link = /Unsubscribe \(one click\): (\S+)/.exec(m.text)?.[1];
    if (!link || m.headers['List-Unsubscribe'] !== `<${link}>` || m.headers['List-Unsubscribe-Post'] !== 'List-Unsubscribe=One-Click') fail(`"${m.subject}" has no one-click unsubscribe`);
    if (/example\.com/i.test(decodeURIComponent(link))) fail('an unsubscribe link carries the address');
    const u = new URL(link);
    if (!(await verifyUnsubscribe('s', u.searchParams.get('id'), u.searchParams.get('t')))) fail('an unsubscribe link does not verify');
  }
  if (!/\$15/.test(sent[2].html)) fail('the kit email does not carry the live D1 price');
}
// 1a. What the page is told is true: confirm sent, still pending, already on the list, unsubscribed;
// and a lost confirm email can be sent once more a day later, never sooner.
{
  const db = fakeD1(); const { sent, fetchImpl } = resend(); const env = envFor(db);
  const t0 = Date.now();
  const st = async (email, at = t0) => (await signUpForSample(env, email, fetchImpl, 'loe', at)).status;
  if (await st('p@example.com') !== 'SENT') fail('a new sign-up was not told the confirm email went');
  if (await st('p@example.com', t0 + 3_600_000) !== 'PENDING' || sent.length !== 1) fail('a repeat sign-up within a day was not told it is pending, or got a second email');
  if (await st('p@example.com', t0 + DAY + 60_000) !== 'SENT' || sent.length !== 2) fail('a lost confirm email could not be sent again a day later');
  await pressConfirm(env, sent, 'p@example.com', fetchImpl);
  if (await st('p@example.com', t0 + 2 * DAY) !== 'SUBSCRIBED') fail('a confirmed address was not told it is already on the list');
  await optOut(db, await emailHash('p@example.com'));
  if (await st('p@example.com', t0 + 3 * DAY) !== 'OPTED_OUT') fail('an unsubscribed address was not told so');
  const { onRequestPost } = await import('../../functions/api/sample.js');
  const r = await (await onRequestPost({ request: new Request('https://approvalprep.com/api/sample', { method: 'POST', headers: { 'cf-connecting-ip': '198.51.100.7' }, body: JSON.stringify({ email: 'p@example.com', consent: true }) }), env }, fetchImpl, dnsOk)).json();
  if (r.state !== 'opted_out' || r.emailed !== false) fail(`the endpoint told an unsubscribed address ${JSON.stringify(r)}`);
}
// 1b. A sign-up from before double opt-in (no confirm columns set) keeps its series; no row is rewritten.
{
  const db = fakeD1(); const { sent, fetchImpl } = resend(); const env = envFor(db);
  db.raw.exec("CREATE TABLE email_signups (email TEXT PRIMARY KEY, consent_text TEXT NOT NULL, source TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); INSERT INTO email_signups (email, consent_text, source) VALUES ('old@example.com', 'x', 'sample:letter-of-explanation')");
  await runNurture(env, Date.now(), fetchImpl);
  if (subjects(sent)[0] !== sequence()[0].subject) fail(`a sign-up from before double opt-in got ${JSON.stringify(subjects(sent))}`);
  const row = db.raw.prepare('SELECT * FROM email_signups').get();
  if (row.confirm_required !== 0 || row.confirmed_at !== null || row.email_hash !== null) fail('adding the confirm columns rewrote an existing sign-up');
}
// 1c. Outage: Resend down at sign-up and at confirm. Nothing is lost (the next run sends it), and
// nothing is sent twice.
{
  const db = fakeD1(); const { sent, fetchImpl } = resend(); const env = envFor(db);
  const down = async () => new Response('{}', { status: 503 });
  if ((await signUpForSample(env, 'o@example.com', down)).status !== 'FAILED') fail('a send during an outage was not reported as failed');
  if (!db.raw.prepare('SELECT 1 FROM email_signups WHERE email = ?').get('o@example.com')) fail('a sign-up was lost in an outage');
  await runNurture(env, Date.now(), fetchImpl);
  await runNurture(env, Date.now() + 3_600_000, fetchImpl);
  if (JSON.stringify(subjects(sent).map((x) => x.slice(0, 18))) !== JSON.stringify(['Confirm your email'])) fail(`after the outage the confirm email went ${sent.length} times`);
  const link = /Confirm my email: (\S+)/.exec(sent[0].text)[1];
  await confirmPost({ request: new Request(link, { method: 'POST' }), env }, down);
  await runNurture(env, Date.now() + 2 * 3_600_000, fetchImpl);
  await runNurture(env, Date.now() + 3 * 3_600_000, fetchImpl);
  if (subjects(sent).filter((x) => x === sequence()[0].subject).length !== 1) fail(`after an outage at confirm the sample went ${JSON.stringify(subjects(sent))}`);
}
// 1d. An unsubscribe always wins: the confirm button never re-subscribes, and no later run emails it.
{
  const db = fakeD1(); const { sent, fetchImpl } = resend(); const env = envFor(db);
  await signUpForSample(env, 'u@example.com', fetchImpl);
  await optOut(db, await emailHash('u@example.com'));
  const res = await pressConfirm(env, sent, 'u@example.com', fetchImpl);
  if (!/unsubscribed/i.test(await res.text())) fail('the confirm page did not say the address is unsubscribed');
  for (let d = 1; d <= 20; d++) await runNurture(env, Date.now() + d * DAY, fetchImpl);
  if (sent.length !== 1) fail(`an unsubscribed address got ${JSON.stringify(subjects(sent))}`);
}
// 2. Stop on purchase, stop on unsubscribe; one review ask, scheduled, buyer address never stored.
{
  const db = fakeD1(); const { sent, fetchImpl } = resend(); const env = envFor(db);
  await signUpForSample(env, 'buyer@example.com', fetchImpl);
  await signUpForSample(env, 'gone@example.com', fetchImpl);
  await pressConfirm(env, sent, 'buyer@example.com', fetchImpl);
  await pressConfirm(env, sent, 'gone@example.com', fetchImpl);
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
// 2b. The free credit starter (her yes 7 Nov 2026): its own series, the starter at once, then one
// email per 3 days, self-help line in every credit email, and the sample series never mixed in.
{
  const db = fakeD1(); const { sent, fetchImpl } = resend(); const env = envFor(db);
  db.raw.exec("INSERT INTO products VALUES ('credit-letter-kit', 1900, 'live')");
  await signUpForSample(env, 'c@example.com', fetchImpl, 'credit-starter');
  if (sent.length !== 1 || !/credit starter/.test(sent[0].subject)) fail(`the starter sign-up sent ${JSON.stringify(sent.map((m) => m.subject))}`);
  await pressConfirm(env, sent, 'c@example.com', fetchImpl);
  sent.shift();
  if (sent[0]?.subject !== starterSequence()[0].subject) fail('confirming did not send the starter at once');
  if (db.raw.prepare('SELECT source FROM email_signups WHERE email = ?').get('c@example.com')?.source !== STARTER_SOURCE) fail('the starter sign-up was not stored with its own source');
  for (let h = 1; h <= 30 * 24; h += 6) await runNurture(env, Date.now() + h * 3_600_000, fetchImpl);
  const want = starterSequence().map((x) => x.subject);
  if (JSON.stringify(sent.map((m) => m.subject)) !== JSON.stringify(want)) fail(`starter series sent ${JSON.stringify(sent.map((m) => m.subject))}`);
  for (const m of sent.slice(0, 2)) if (!m.text.includes('We do not contact bureaus or creditors for you')) fail(`"${m.subject}" has no self-help line (R-ADV-13)`);
  for (const m of sent) if (!m.text.includes(MAILING_ADDRESS) || m.headers['List-Unsubscribe-Post'] !== 'List-Unsubscribe=One-Click') fail(`"${m.subject}" lacks the address or one-click unsubscribe`);
  if (!/\$19/.test(sent[1].html)) fail('the Credit Letter Kit email does not carry the live D1 price');
  if (/\b(fix|repair|raise|boost) (your )?(credit|score)\b/i.test(sent.map((m) => m.text).join(' '))) fail('a starter email promises to fix, repair or raise credit (R-ADV-13)');
}
// 2c. Rule 0 (7 Nov 2026: Resend refused every send with 401 while the page said "on its way" and
// every tick was green). A refused send is a named stop on the run and emailed:false at the endpoint.
{
  const db = fakeD1(); const env = envFor(db);
  const refuse = async () => new Response(JSON.stringify({ statusCode: 401, message: 'API key is invalid' }), { status: 401 });
  const signed = await signUpForSample(env, 'r@example.com', refuse, 'credit-starter');
  if (signed.status !== 'FAILED') fail(`a refused starter send reported ${signed.status}, want FAILED`);
  const run = await runNurture(env, Date.now() + DAY, refuse);
  if (!/^NAMED STOP \[RESEND_SEND_FAILED\] 1 email\(s\) not sent \(Resend HTTP 401: API key is invalid\)/.test(run.stop ?? '')) fail(`a refused send did not stop the run by name: ${run.stop}`);
  if (run.sent !== 0) fail('a refused send was counted as sent');
  const { onRequestPost } = await import('../../functions/api/sample.js');
  const req = new Request('https://approvalprep.com/api/sample', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9' }, body: JSON.stringify({ email: 'r2@example.com', consent: true, magnet: 'credit-starter' }) });
  const body = await (await onRequestPost({ request: req, env: envFor(fakeD1()) }, refuse, dnsOk)).json();
  if (body.emailed !== false || !/RESEND_SEND_FAILED/.test(body.stop ?? '')) fail(`the sample endpoint hid a failed send: ${JSON.stringify(body)}`);
  const ok = await runNurture(envFor(fakeD1()), Date.now(), resend().fetchImpl);
  if (ok.stop !== null) fail('a run with nothing failing was stopped');
}
// 2d. The employment verification letter (top search): confirm, then the letter, one email that
// helps and one that sells, 3 days apart, then it ends; the kit email carries the live price.
{
  const db = fakeD1(); const { sent, fetchImpl } = resend(); const env = envFor(db);
  db.raw.exec("INSERT INTO products VALUES ('income-employment-letter-kit', 1900, 'live')");
  await signUpForSample(env, 'e@example.com', fetchImpl, 'employment-letter');
  if (db.raw.prepare('SELECT source FROM email_signups WHERE email = ?').get('e@example.com')?.source !== EMPLOYMENT_SOURCE) fail('the employment sign-up was not stored with its own source');
  if (!/employment verification letter/.test(sent[0]?.subject ?? '')) fail('the employment confirm email does not name the letter');
  await pressConfirm(env, sent, 'e@example.com', fetchImpl);
  for (let h = 1; h <= 30 * 24; h += 6) await runNurture(env, Date.now() + h * 3_600_000, fetchImpl);
  const want = employmentSequence().map((x) => x.subject);
  if (JSON.stringify(subjects(sent).slice(1)) !== JSON.stringify(want)) fail(`employment series sent ${JSON.stringify(subjects(sent))}`);
  if (!/\$19/.test(sent[3].html)) fail('the Income + Employment kit email does not carry the live D1 price');
  if (sent.slice(1, 3).some((m) => /\$\d|kit/i.test(m.subject + m.text.split('--')[0]))) fail('an employment email before the last one sells');
  const counts = await signupCounts(db);
  if (counts.signups !== 1 || counts.confirmed !== 1 || counts.by_source[EMPLOYMENT_SOURCE] !== 1) fail(`signup counts are wrong: ${JSON.stringify(counts)}`);
  if (JSON.stringify(counts).includes('@')) fail('the signup counts carry an address');
}
// 2e. Abuse: a typed-in address on a domain that takes no mail is refused before any send; a DNS
// outage lets the person through; the honeypot and the per-IP cap hold.
{
  const dns = (mx, a = { Status: 0, Answer: [] }) => async (u) => new Response(JSON.stringify(new URL(u).searchParams.get('type') === 'MX' ? mx : a), { status: 200 });
  if (await mailDomainOk('x@nope.invalid', dns({ Status: 3 }))) fail('a domain that does not exist was accepted');
  if (await mailDomainOk('x@example.com', dns({ Status: 0, Answer: [{ type: 15, data: '0 .' }] }))) fail('a null-MX domain was accepted');
  if (!(await mailDomainOk('x@gmail.com', dns({ Status: 0, Answer: [{ type: 15, data: '5 gmail-smtp-in.l.google.com.' }] })))) fail('a real mail domain was refused');
  if (!(await mailDomainOk('x@host.test', dns({ Status: 0 }, { Status: 0, Answer: [{ type: 1, data: '192.0.2.1' }] })))) fail('a domain with no MX but an address was refused');
  if (!(await mailDomainOk('x@gmail.com', async () => { throw Error('down'); }))) fail('a DNS outage turned a person away');
  if (!(await mailDomainOk('x@gmail.com', dns({ Status: 2 }, { Status: 2 })))) fail('a SERVFAIL answer turned a person away');
  if (!(await mailDomainOk('x@v6.test', async (u) => new Response(JSON.stringify(new URL(u).searchParams.get('type') === 'AAAA' ? { Status: 0, Answer: [{ type: 28, data: '2001:db8::1' }] } : { Status: 0 }), { status: 200 })))) fail('an IPv6-only mail domain was refused');
  const { onRequestPost } = await import('../../functions/api/sample.js');
  const post = (email, extra = {}, ip = '203.0.113.20') => new Request('https://approvalprep.com/api/sample', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify({ email, consent: true, ...extra }) });
  const db = fakeD1(); const { sent, fetchImpl } = resend(); const env = envFor(db);
  const bad = await onRequestPost({ request: post('x@nope.invalid'), env }, fetchImpl, dns({ Status: 3 }));
  if (bad.status !== 400 || sent.length) fail('an address on a dead domain was emailed');
  await onRequestPost({ request: post('bot@example.com', { company: 'Acme' }), env }, fetchImpl, dnsOk);
  if (sent.length) fail('the honeypot did not stop a bot');
  const codes = [];
  for (let i = 0; i < 7; i++) codes.push((await onRequestPost({ request: post(`p${i}@example.com`), env }, fetchImpl, dnsOk)).status);
  if (codes.filter((c) => c === 429).length < 2) fail(`one IP was not capped: ${codes}`);
}
// 3. A missing key is a named stop, not a silent pass.
{
  const run = await runNurture({ PRODUCTS_DB: fakeD1() }, Date.now(), resend().fetchImpl);
  if (!/^NAMED STOP \[NO_RESEND_KEY\]/.test(run.stop ?? '')) fail('a missing Resend key did not stop by name');
}
const link = await unsubscribeUrl('s', await emailHash('x@example.com'));
if (!renderEmail(sequence()[0], link).text.includes(link)) fail('rendered email lost its unsubscribe link');
console.log('[email-nurture] PASS (double opt-in, link scanners never confirm, outage keeps and retries once, unsubscribe wins, series, 3-day gap, stop on purchase/unsubscribe, one scheduled review ask, buyer address never stored, credit starter series, a refused send is a named stop, named stop)');
