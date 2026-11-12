import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KIT, COMPLETE_BUNDLE, BUNDLE_UPGRADE, kitPurchaseGate } from '../src/kit';
import { EXPLANATION_PRODUCT, offersFor, ownershipFrom, NO_OWNERSHIP } from '../src/purchases/bundleOffers';
import { restoreBundle, validBundleKits } from '../src/purchases/bundleDelivery';
// @ts-ignore Pages runtime is JavaScript
import { onRequestPost } from '../../../functions/api/app-bundle.js';
// @ts-ignore Pages runtime is JavaScript
import { onRequestGet } from '../../../functions/api/app-bundle-file.js';
// @ts-ignore Pages runtime is JavaScript
import { bundleUrl } from '../../../functions/_runtime/app-bundle.js';
const owned = (creditKit = false, explanationKit = false, bundle = false) => ({ creditKit, explanationKit, bundle });
test('offers cover each ownership combination without selling an owned kit again', () => {
  assert.deepEqual(offersFor(owned()), [COMPLETE_BUNDLE.productId, KIT.productId]);
  assert.deepEqual(offersFor(owned(), 'explanation'), [COMPLETE_BUNDLE.productId, EXPLANATION_PRODUCT]);
  assert.deepEqual(offersFor(owned(true)), [EXPLANATION_PRODUCT, BUNDLE_UPGRADE.productId]);
  assert.deepEqual(offersFor(owned(false, true)), [KIT.productId, BUNDLE_UPGRADE.productId]);
  assert.deepEqual(offersFor(owned(true, true)), [BUNDLE_UPGRADE.productId]);
  for (const credit of [false, true]) for (const explanation of [false, true]) assert.deepEqual(offersFor(owned(credit, explanation, true)), []);
  assert.equal(kitPurchaseGate().ok, false);
});
test('either bundle product grants both kits; individual kits remain independent', () => {
  for (const product of [COMPLETE_BUNDLE.productId, BUNDLE_UPGRADE.productId]) assert.deepEqual(ownershipFrom({ [product]: { productIdentifier: product, expirationDate: null } }), owned(true, true, true));
  assert.deepEqual(ownershipFrom({ [KIT.productId]: { productIdentifier: KIT.productId } }), owned(true));
  assert.deepEqual(ownershipFrom({ [EXPLANATION_PRODUCT]: { productIdentifier: EXPLANATION_PRODUCT } }), owned(false, true));
  assert.deepEqual(ownershipFrom({ [COMPLETE_BUNDLE.productId]: { productIdentifier: KIT.productId } }), NO_OWNERSHIP);
});
const kinds = ['goodwill', 'debt-validation', 'settlement-terms', 'follow-up'];
const explanationKinds = ['credit', 'income-gap', 'employment-gap', 'address-history', 'rental-issue', 'late-payment', 'bank-statement', 'life-event', 'general-application'].map(k => `explanation-${k}`);
const fakeLetter = (kind: string) => ({ kind, name: `FAKE ${kind}`, template: 'FAKE {{a|A}} {{b|B}} {{c|C}} {{d|D}}', questions: ['a', 'b', 'c', 'd'].map(name => ({ title: 'FAKE question', fields: [{ name, label: 'FAKE field' }] })) });
const fakeKits = () => [{ kit: 'credit-letter-kit', version: 1, letters: kinds.map(fakeLetter) }, { kit: 'letter-of-explanation-kit', version: 1, letters: explanationKinds.map(fakeLetter) }];
const request = () => new Request('https://approvalprep.com/api/app-bundle', { method: 'POST', headers: { authorization: `Bearer $RCAnonymousID:${'a'.repeat(32)}` } });
const subscriber = (product: string = COMPLETE_BUNDLE.productId, sandbox = false) => ({ entitlements: { [product]: { product_identifier: product, expires_date: null } }, non_subscriptions: { [product]: [{ is_sandbox: sandbox }] } });

test('restore installs complete kits only after verified delivery, rejecting foreign URLs and malformed kits', async t => {
  let calls = 0, installs = 0;
  const account = { restore: async () => owned(true, true, true), userId: async () => '$RCAnonymousID:test' };
  let receipt = { archiveUrl: await bundleUrl('https://approvalprep.com', 'fake-secret'), kits: fakeKits() };
  t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json(receipt); });
  assert.equal(await restoreBundle({ ...account, restore: async () => owned(true) }, async () => { installs++; }), false);
  assert.equal(calls, 0);
  assert.equal(await restoreBundle(account, async r => { assert.equal(r.kits.length, 2); installs++; }), true);
  receipt = { ...receipt, archiveUrl: 'https://other.example/api/app-bundle-file' };
  await assert.rejects(restoreBundle(account, async () => { installs++; }));
  receipt = { archiveUrl: await bundleUrl('https://approvalprep.com', 'fake-secret'), kits: fakeKits() };
  receipt.kits[1].letters.pop();
  await assert.rejects(restoreBundle(account, async () => { installs++; }));
  assert.equal(installs, 1);
  const bad = fakeKits(); bad[1].letters[1] = bad[1].letters[0];
  assert.equal(validBundleKits(bad), false);
  const invalid = fakeKits(); invalid[0].letters[0].template = 'FAKE {{unasked|Blank}}';
  assert.equal(validBundleKits(invalid), false);
  const wrongKit = fakeKits(); wrongKit[1].kit = 'credit-letter-kit';
  assert.equal(validBundleKits(wrongKit), false);
  const wrongKind = fakeKits(); wrongKind[1].letters[0].kind = 'goodwill';
  assert.equal(validBundleKits(wrongKind), false);
});

test('server verifies live non-refunded purchases before reading assets; signed downloads expire and reject tampering', async t => {
  const reads: string[] = [];
  let info: object = subscriber();
  t.mock.method(globalThis, 'fetch', async () => Response.json({ subscriber: info }));
  const env = { APPROVALPREP_REVENUECAT_SECRET: 'fake-rc', DOWNLOAD_SIGNING_SECRET: 'fake-signing', PRODUCT_ASSETS_R2: {
    get: async (key: string) => { reads.push(key); return key.endsWith('.zip') ? { body: 'FAKE-ZIP' } : { json: async () => fakeKits()[key.includes('credit-letter') ? 0 : 1] }; },
    head: async () => ({ size: 123 }),
  } };
  for (const refused of [subscriber(KIT.productId), subscriber(COMPLETE_BUNDLE.productId, true), { ...subscriber(), non_subscriptions: {} }, { ...subscriber(), non_subscriptions: { [COMPLETE_BUNDLE.productId]: [{ is_sandbox: false, refunded_at: '2026-11-11' }] } }]) {
    info = refused;
    assert.equal((await onRequestPost({ request: request(), env })).status, 403);
  }
  assert.equal(reads.length, 0);
  for (const product of [COMPLETE_BUNDLE.productId, BUNDLE_UPGRADE.productId]) {
    info = subscriber(product);
    const response = await onRequestPost({ request: request(), env });
    assert.equal(response.status, 200);
    const receipt = await response.json();
    assert.equal(receipt.kits.length, 2);
    const file = await onRequestGet({ request: new Request(receipt.archiveUrl), env });
    assert.equal(file.status, 200); assert.equal(await file.text(), 'FAKE-ZIP');
    assert.match(file.headers.get('cache-control')!, /no-store/);
    const tampered = new URL(receipt.archiveUrl); tampered.searchParams.set('expires', '9999999999');
    assert.equal((await onRequestGet({ request: new Request(tampered), env })).status, 403);
  }
  const expired = await bundleUrl('https://approvalprep.com', 'fake-signing', Date.now() - 301000);
  assert.equal((await onRequestGet({ request: new Request(expired), env })).status, 403);
  assert.equal((await onRequestPost({ request: request(), env: {} })).status, 503);
});


test('bundle delivery requires an existing nonempty archive without custom metadata', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ subscriber: subscriber() }));
  let archive: { size: number } | null = null;
  const env = { APPROVALPREP_REVENUECAT_SECRET: 'fake', DOWNLOAD_SIGNING_SECRET: 'fake', PRODUCT_ASSETS_R2: {
    get: async (key: string) => ({ json: async () => fakeKits()[key.includes('credit-letter') ? 0 : 1] }),
    head: async () => archive,
  } };
  for (const value of [null, { size: 0 }]) {
    archive = value;
    assert.equal((await onRequestPost({ request: request(), env })).status, 503);
  }
  archive = { size: 123 };
  assert.equal((await onRequestPost({ request: request(), env })).status, 200);
});
