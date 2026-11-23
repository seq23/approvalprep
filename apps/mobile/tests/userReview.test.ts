// The 20 first-time-user findings fixed before the App Store (14 Nov 2026), one behaviour each.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
// @ts-ignore shared website module is JavaScript
import { buildLetter, salutationFor, studioSituations, BEFORE_YOU_MAIL } from '../../../src/lib/letterStudioCore.mjs';
import { newDispute, renderDispute } from '../src/letterQuestions';
import { dueDate, hasAnswerDate, myLetters } from '../src/myLetters';
import { startModel } from '../src/start';
import { markSent, reminderId, unmarkSent, type LocalReminders } from '../src/sentLetter';
import { letterDay, renderSavedLetter, allLettersHtml } from '../src/allLetters';
import { answerRows, copyOf } from '../src/draftAnswers';
import { disputeQuestions } from '../src/letterQuestions';
import { letterHref } from '../src/studioDrafts';
import { newKitDraft } from '../src/kitTemplates';
import { EMAIL_LOOKUP_SENT, emailWebsiteOrderLinks, unlockWebsiteOrder, websiteOrderCode } from '../src/purchases/websiteUnlock';
import type { SavedLetter } from '../src/letterStorage';
import { onRequestPost as websiteUnlock, orderContents } from '../../../functions/api/app-website-unlock.js';
import { onRequestPost as appUnlock } from '../../../functions/api/app-unlock.js';
import { revenueCatPurchases } from '../../../functions/_runtime/revenuecat.js';
import { workersFetchCheck } from './revenuecatV2';

test('#3 the salutation never reads "Dear The leasing office:"', () => {
  assert.equal(salutationFor('The leasing office'), 'Dear Leasing Office:');
  assert.equal(salutationFor('hiring manager'), 'Dear Hiring Manager:');
  assert.equal(salutationFor('Parkview Apartments LLC'), 'To Parkview Apartments LLC:');
  assert.equal(salutationFor('Ms. Rivera'), 'Dear Ms. Rivera:');
  assert.equal(salutationFor(''), 'To whom it may concern:');
  assert.match(buildLetter('rental', { recipient: 'The leasing office' }).text, /^Dear Leasing Office:$/m);
});

test('#4 #15 explanation letters carry her address and phone or email, with questions worded for the situation', () => {
  const l = buildLetter('rental', { name: 'Jordan Lee', address: '12 Oak St\nMemphis, TN 38104', contact: 'jordan@example.com', reference: '12 Oak St, unit 4', happened: 'This is my first apartment.', support: 'I can show pay stubs and two references.' });
  assert.deepEqual(l.sender, ['Jordan Lee', '12 Oak St', 'Memphis, TN 38104', 'jordan@example.com']);
  assert.ok(l.reference.includes('Property: 12 Oak St, unit 4'));
  assert.ok(l.paragraphs.includes('I can show pay stubs and two references.'));
  const rental = studioSituations.find((s: { id: string }) => s.id === 'rental');
  const general = studioSituations.find((s: { id: string }) => s.id === 'general');
  const label = (s: any, name: string) => s.fields.find((f: { name: string }) => f.name === name)?.label;
  assert.equal(label(rental, 'reference'), 'Property or unit you are applying for');
  assert.ok(label(rental, 'support'));
  assert.equal(label(general, 'reference'), 'Application, loan or account number');
  for (const s of studioSituations) if (s.kind === 'explanation') for (const name of ['address', 'contact']) assert.ok(label(s, name), `${s.id} asks for ${name}`);
  // Address and contact are optional: an empty form never brackets them.
  assert.doesNotMatch(buildLetter('general', {}).text, /mailing address|Phone or email/);
});

test('#7 the dispute carries optional ID details (only the last 4 of an SSN) and the before-you-mail list asks for ID and proof of address', () => {
  const t = renderDispute({ dob: '01/02/1990', ssn4: '123456789' }).text;
  assert.match(t, /Date of birth: 01\/02\/1990/);
  assert.match(t, /Last 4 digits of SSN: 6789/);
  assert.doesNotMatch(t, /12345/);
  assert.doesNotMatch(renderDispute({}).text, /Date of birth|SSN/);
  assert.ok(BEFORE_YOU_MAIL.some((line: string) => /photo ID/.test(line) && /proof of your address/.test(line)));
});

const reminders = () => { const cancelled: string[] = []; const r: LocalReminders = { permission: async () => true, schedule: async () => {}, cancel: async id => { cancelled.push(id); } }; return { r, cancelled }; };
const sentOn = (letter: SavedLetter, sentDate = '2026-11-06'): SavedLetter => ({ ...letter, status: 'sent', sentDate });

test('#9 only a bureau letter has an answer date; other letters get a plain follow-up reminder', () => {
  assert.equal(hasAnswerDate('bureau-dispute'), true);
  assert.equal(hasAnswerDate('follow-up'), true);
  for (const kind of ['goodwill', 'debt-validation', 'explanation-rental-issue', 'studio-rental']) assert.equal(hasAnswerDate(kind), false);
  const landlord = { ...sentOn(newKitDraft('l', 'explanation-rental-issue')), reminderDate: '2026-12-06' };
  assert.equal(dueDate(landlord), null);
  const row = myLetters([landlord], true, new Date(2026, 11, 7)).rows[0];
  assert.doesNotMatch(row.sub, /Answer|due|past/);
  assert.match(row.sub, /Follow-up reminder Dec 6, 2026/);
  assert.equal(row.needsAnswer, false);
  assert.equal(startModel([landlord], true).next, null);
  assert.ok(dueDate(sentOn(newDispute('d'))));
});

test('#11 recording the mailing date is free; the reminder stays with the kit', async () => {
  let stored: SavedLetter = newDispute('one');
  const { r } = reminders(); let permission = 0; r.permission = async () => { permission++; return true; };
  const result = await markSent(stored, { date: '2026-11-06', method: 'Certified mail', tracking: '', remind: true }, { ownsKit: async () => false, update: async l => { stored = l; }, reminders: r }, new Date(2026, 10, 10));
  assert.equal(result.reminder, 'kit');
  assert.equal(stored.status, 'sent');
  assert.equal(stored.sentDate, '2026-11-06');
  assert.equal(permission, 0);
});

test('#10 "Not sent yet" takes a mailed letter back to a draft and cancels its reminder', async () => {
  const { r, cancelled } = reminders(); let stored: SavedLetter | null = null;
  const draft = await unmarkSent({ ...sentOn(newDispute('x')), method: 'Certified mail', trackingNumber: '1', reminderDate: '2026-12-06' }, { update: async l => { stored = l; }, reminders: r });
  assert.deepEqual(cancelled, [reminderId('x')]);
  assert.equal(draft.status, 'draft');
  assert.equal(stored!.sentDate, null);
  assert.equal(stored!.reminderDate, null);
  assert.equal(stored!.trackingNumber, null);
});

test('#6 a mailed letter keeps its mailing date; #8 #6 a copy for another bureau or an edit starts as a new draft', () => {
  const answers = { name: 'Maria Lopez', bureau: 'experian', account: 'Acme, ending 1234', shows: '60 days late', happened: 'I paid on time.' };
  const mailed: SavedLetter = { ...sentOn({ ...newDispute('m'), answers }, '2026-10-01') };
  assert.equal(letterDay(mailed, new Date(2026, 10, 14)).getDate(), 1);
  assert.match(renderSavedLetter(mailed, null, new Date(2026, 10, 14))!.text, /October 1, 2026/);
  assert.match(renderSavedLetter({ ...mailed, status: 'draft' }, null, new Date(2026, 10, 14))!.text, /November 14, 2026/);
  const copy = copyOf(mailed, { bureau: 'transunion' }, 'copy');
  assert.equal(copy.id, 'copy'); assert.equal(copy.status, 'draft'); assert.equal(copy.sentDate, null);
  assert.equal(copy.answers.bureau, 'transunion'); assert.equal(copy.answers.name, 'Maria Lopez');
  assert.equal(mailed.answers.bureau, 'experian');
  assert.match(renderDispute(copy.answers).text, /TransUnion LLC/);
});

test('#18 the answer list shows each question with what she wrote, bureau by name', () => {
  const rows = answerRows(disputeQuestions, { name: 'Maria', bureau: 'equifax' });
  assert.equal(rows.length, disputeQuestions.length);
  assert.equal(rows[0].sub, 'Maria');
  assert.equal(rows.find(r => /bureau shows/.test(r.title))!.sub, 'Equifax');
  assert.equal(rows.at(-1)!.sub, 'Not answered yet');
});

test('#17 opening a letter again resumes her latest unfinished one instead of a duplicate', async () => {
  const letters: SavedLetter[] = [newDispute('old'), sentOn(newDispute('mailed')), newDispute('latest')];
  const href = await letterHref({ list: async () => letters }, 'bureau-dispute', '/');
  assert.deepEqual(href.params, { kind: 'bureau-dispute', id: 'latest', resumed: '1', from: '/' });
  assert.deepEqual((await letterHref({ list: async () => [] }, 'bureau-dispute')).params, { kind: 'bureau-dispute' });
});

test('#19 every saved letter goes into one PDF page, mailing dates included and text escaped', () => {
  const html = allLettersHtml([sentOn({ ...newDispute('a'), answers: { name: '<Maria>' } }, '2026-10-01'), newKitDraft('b', 'goodwill')], () => null, new Date(2026, 10, 14));
  assert.match(html, /Mailed Oct 1, 2026/);
  assert.match(html, /&lt;Maria&gt;/);
  assert.match(html, /Draft, not mailed/);
  assert.match(html, /needs its kit on this phone/);
  assert.equal((html.match(/<section>/g) ?? []).length, 2);
});

// #1: the RevenueCat lookup must run on Cloudflare Workers, which throw on redirect: 'error'.
test('#1 the server reads RevenueCat with fetch options Cloudflare Workers accept', async t => {
  const seen: RequestInit[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => { workersFetchCheck(init); seen.push(init); return Response.json({ items: [], next_page: null }); });
  assert.deepEqual(await revenueCatPurchases('$RCAnonymousID:' + '0'.repeat(32), 'k'), { purchases: [] });
  assert.equal(seen.length, 2);
  assert.ok(seen.every(init => init.redirect !== 'error'));
});

// Like D1: a bad statement (a table not made yet) fails when it runs, not when it is prepared.
const rateDb = () => { const raw = new DatabaseSync(':memory:'); return { raw, prepare: (sql: string) => { const st = () => raw.prepare(sql); const bound = (...a: any[]) => ({ run: async () => st().run(...a), first: async () => st().get(...a) ?? null, all: async () => ({ results: st().all(...a) }) }); return { ...bound(), bind: (...a: any[]) => bound(...a) }; } }; };
const kitJson = (kit: string) => ({ version: 1, kit, letters: [] });
const r2 = (missing: string[] = []) => ({
  get: async (key: string) => missing.includes(key) ? null : { json: async () => kitJson(key.replace(/^app-kits\/|\.json$/g, '')) },
  head: async (key: string) => missing.includes(key) ? null : { size: 10 },
});
const stripe = (sku: string, payment_status = 'paid') => async (url: string) => {
  if (!String(url).startsWith('https://api.stripe.com/')) throw Error('unexpected ' + url);
  const id = decodeURIComponent(String(url).split('/').pop()!);
  return Response.json({ id, payment_status, status: 'complete', metadata: { sku }, customer_details: { email: 'buyer@example.com' } });
};
const order = 'cs_live_' + 'a1B2c3D4e5'.repeat(3);
const ask = (body: unknown, ip = '198.51.100.7') => new Request('https://approvalprep.com/api/app-website-unlock', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify(body) });

test('#12 a paid website order opens its kit in the app at no charge; an unpaid or unknown one never does', async t => {
  const env = { STRIPE_SECRET_KEY: 'sk_fake', DOWNLOAD_SIGNING_SECRET: 'sig', PRODUCT_ASSETS_R2: r2(), PRODUCTS_DB: rateDb() };
  t.mock.method(globalThis, 'fetch', stripe('credit-letter-kit'));
  // Only the order code is read out of a pasted link.
  const ok = await websiteUnlock({ request: ask({ order: `https://approvalprep.com/checkout/success?session_id=${order}&sku=credit-letter-kit` }), env });
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.sku, 'credit-letter-kit');
  assert.deepEqual(body.kits.map((k: { kit: string }) => k.kit), ['credit-letter-kit']);
  assert.deepEqual(body.files.map((f: { kit: string }) => f.kit), ['credit-letter-kit']);
  assert.ok(body.files[0].files.every((f: { url: string }) => f.url.startsWith('https://approvalprep.com/api/app-files-file?kit=credit-letter-kit&')));
  assert.equal(body.archiveUrl, undefined);
  assert.equal((await websiteUnlock({ request: ask({ order: 'not an order' }), env })).status, 403);
  t.mock.method(globalThis, 'fetch', stripe('credit-letter-kit', 'unpaid'));
  assert.equal((await websiteUnlock({ request: ask({ order }), env })).status, 403);
  t.mock.method(globalThis, 'fetch', stripe('complete-approvalprep-bundle'));
  const bundle = await (await websiteUnlock({ request: ask({ order }), env })).json();
  assert.equal(bundle.kits.length, 2);
  assert.equal(bundle.files.length, 7);
  assert.match(bundle.archiveUrl, /^https:\/\/approvalprep\.com\/api\/app-bundle-file\?/);
  assert.deepEqual(orderContents('rental-application-kit'), { templates: [], files: ['rental-application-kit'], bundle: false });
  assert.equal(orderContents('unknown'), null);
  // A refunded order (revoked in the refunds table) opens nothing.
  env.PRODUCTS_DB.raw.exec('CREATE TABLE download_entitlements (stripe_session_id TEXT, revoked_at TEXT)');
  env.PRODUCTS_DB.raw.prepare('INSERT INTO download_entitlements VALUES (?, ?)').run(order, '2026-11-14');
  assert.equal((await websiteUnlock({ request: ask({ order }), env })).status, 403);
  // Missing server setup is a named stop, never a silent refusal.
  assert.deepEqual(await (await websiteUnlock({ request: ask({ order }), env: { ...env, STRIPE_SECRET_KEY: undefined } })).json(), { stop: 'WEBSITE_UNLOCK_NOT_READY' });
});

test('#12 the eleventh website unlock in an hour from one caller is refused', async t => {
  const env = { STRIPE_SECRET_KEY: 'sk_fake', DOWNLOAD_SIGNING_SECRET: 'sig', PRODUCT_ASSETS_R2: r2(), PRODUCTS_DB: rateDb() };
  t.mock.method(globalThis, 'fetch', stripe('life-admin-letter-kit', 'unpaid'));
  for (let n = 0; n < 10; n++) assert.equal((await websiteUnlock({ request: ask({ order }, '203.0.113.9'), env })).status, 403);
  assert.equal((await websiteUnlock({ request: ask({ order }, '203.0.113.9'), env })).status, 429);
});

test('#12 the app sends only the order code, follows only our own signed links and saves what the order holds', async t => {
  assert.equal(websiteOrderCode(`see https://approvalprep.com/checkout/success?session_id=${order}&sku=x`), order);
  assert.equal(websiteOrderCode('hello'), null);
  const sent: string[] = [];
  const file = (kit: string, type: string) => ({ type, url: `https://approvalprep.com/api/app-files-file?kit=${kit}&type=${type}&expires=1&sig=${'0'.repeat(64)}` });
  let reply: any = { sku: 'rental-application-kit', kits: [], files: [{ kit: 'rental-application-kit', files: [file('rental-application-kit', 'pdf'), file('rental-application-kit', 'docx')] }] };
  t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => { sent.push(String(init.body)); return Response.json(reply); });
  const saved: string[] = [];
  const deps = { saveKit: async () => true, saveFiles: async (sku: string) => { saved.push(sku); }, installBundle: async () => { saved.push('bundle'); } };
  assert.deepEqual(await unlockWebsiteOrder(`https://approvalprep.com/checkout/success?session_id=${order}&sku=rental-application-kit`, deps), { sku: 'rental-application-kit' });
  assert.deepEqual(sent, [JSON.stringify({ order })]);
  assert.deepEqual(saved, ['rental-application-kit']);
  reply = { ...reply, files: [{ kit: 'rental-application-kit', files: [{ type: 'pdf', url: 'https://elsewhere.invalid/x' }, file('rental-application-kit', 'docx')] }] };
  await assert.rejects(unlockWebsiteOrder(order, deps), /WEBSITE_UNLOCK_UNAVAILABLE/);
  await assert.rejects(unlockWebsiteOrder('nothing', deps), /ORDER_LINK_INVALID/);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'ORDER_NOT_FOUND' }, { status: 403 }));
  await assert.rejects(unlockWebsiteOrder(order, deps), /ORDER_NOT_FOUND/);
  assert.deepEqual(saved, ['rental-application-kit']);
});

test('no link: the app sends only the typed email, to our own server, and never learns whether it bought anything', async t => {
  const calls: { url: string; body: string }[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => { calls.push({ url: String(url), body: String(init.body) }); return Response.json({ status: 'ACCEPTED' }, { status: 202 }); });
  assert.equal(await emailWebsiteOrderLinks('  Buyer@Example.com ', false), EMAIL_LOOKUP_SENT);
  assert.deepEqual(calls, [{ url: 'https://approvalprep.com/api/email-download-links', body: JSON.stringify({ email: 'buyer@example.com' }) }]);
  assert.notEqual(await emailWebsiteOrderLinks('not an email', false), EMAIL_LOOKUP_SENT);
  assert.notEqual(await emailWebsiteOrderLinks('buyer@example.com', true), EMAIL_LOOKUP_SENT);
  assert.equal(calls.length, 1);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ status: 'RATE_LIMITED' }, { status: 429 }));
  assert.match(await emailWebsiteOrderLinks('buyer@example.com', false), /Too many tries/);
});

test('#1 a TestFlight (sandbox) purchase opens its kit only while the server allows sandbox purchases (switch on, review window open)', async t => {
  const { purchase, rcFetch } = await import('./revenuecatV2');
  t.mock.method(globalThis, 'fetch', rcFetch(() => [purchase('ap_credit_kit', { environment: 'sandbox' })]));
  const env = { PRODUCTS_DB: rateDb(), APPROVALPREP_REVENUECAT_SECRET: 'k', DOWNLOAD_SIGNING_SECRET: 's', PRODUCT_ASSETS_R2: {} };
  const req = () => new Request('https://approvalprep.com/api/app-unlock', { method: 'POST', headers: { Authorization: 'Bearer $RCAnonymousID:' + 'b'.repeat(32) } });
  assert.equal((await appUnlock({ request: req(), env })).status, 403);
  assert.equal((await appUnlock({ request: req(), env: { ...env, APPROVALPREP_ACCEPT_SANDBOX_PURCHASES: '1', REVIEW_UNTIL: new Date(Date.now() + 10 * 86_400_000).toISOString() } })).status, 200);
});
