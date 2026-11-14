import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import { KIT, COMPLETE_BUNDLE, ALL_KIT_IDS, FILE_KIT_IDS, SHARED_KIT_PRICES, UPGRADE_IDS, UPGRADE_TIERS, bundleUnlocked, isUpgrade, kitPrice, kitPurchaseGate, upgradeFor } from '../src/kit';
import { EXPLANATION_PRODUCT, offersFor, ownershipFrom, ownsKit, NO_OWNERSHIP } from '../src/purchases/bundleOffers';
import { restoreBundle, validBundleKits } from '../src/purchases/bundleDelivery';
// @ts-ignore Pages runtime is JavaScript
import { onRequestPost } from '../../../functions/api/app-bundle.js';
// @ts-ignore Pages runtime is JavaScript
import { onRequestGet } from '../../../functions/api/app-bundle-file.js';
// @ts-ignore Pages runtime is JavaScript
import { bundleUrl } from '../../../functions/_runtime/app-bundle.js';
const owned = (creditKit = false, explanationKit = false, bundle = false, fileKits: string[] = []) => ({ creditKit, explanationKit, bundle, fileKits });
// Her rule, 13 Nov 2026: nobody ever pays more in total than the $49.99 Complete Bundle.
const cents = (n: number) => Math.round(n * 100);
const asOwnership = (kits: string[], bundle = false) => owned(kits.includes(KIT.productId), kits.includes(EXPLANATION_PRODUCT), bundle, kits.filter(id => FILE_KIT_IDS.includes(id)));
const subsets = <T,>(items: readonly T[]) => Array.from({ length: 2 ** items.length }, (_, mask) => items.filter((_, i) => mask >> i & 1));
test('for every combination of owned kits, what she has paid plus anything offered never passes the bundle price', () => {
  assert.equal(ALL_KIT_IDS.length, 7);
  assert.deepEqual(Object.keys(SHARED_KIT_PRICES).sort(), [...ALL_KIT_IDS].sort());
  for (const id of ALL_KIT_IDS) assert.equal(SHARED_KIT_PRICES[id], kitPrice(id), id);
  let reachable = 0, free = 0;
  for (const kits of subsets(ALL_KIT_IDS)) {
    const paid = kits.reduce((sum, id) => sum + cents(kitPrice(id)), 0);
    const mine = ownershipFrom(Object.fromEntries(kits.map(id => [id, { productIdentifier: id, expirationDate: null }])));
    // Kits that already reach the bundle price unlock it with no purchase.
    if (paid >= cents(COMPLETE_BUNDLE.approvedPriceUSD)) { assert.equal(mine.bundle, true, kits.join()); assert.deepEqual(offersFor(mine), []); continue; }
    reachable++;
    for (const requested of [...ALL_KIT_IDS, COMPLETE_BUNDLE.productId]) {
      for (const offer of offersFor(mine, requested)) {
        const price = offer === COMPLETE_BUNDLE.productId ? COMPLETE_BUNDLE.approvedPriceUSD : isUpgrade(offer) ? UPGRADE_TIERS.find(t => t.id === offer)!.price : kitPrice(offer);
        assert.ok(paid + cents(price) <= cents(COMPLETE_BUNDLE.approvedPriceUSD) + 1, `owns ${kits.join() || 'nothing'}, offered ${offer}: ${(paid + cents(price)) / 100}`);
        assert.ok(!kits.includes(offer), `an owned kit is offered again: ${offer}`);
        if (kits.length) assert.notEqual(offer, COMPLETE_BUNDLE.productId, 'a kit owner is never shown the full bundle');
      }
    }
    const up = upgradeFor(kits);
    if (!kits.length) { assert.equal(up, null); continue; }
    if (up!.free) { free++; assert.equal(mine.bundle, true, `${kits.join()} has less than the smallest tier left`); continue; }
    // The upgrade is the highest tier not above what is left, and buying it unlocks everything...
    const left = cents(COMPLETE_BUNDLE.approvedPriceUSD) - paid;
    assert.ok(cents(up!.tier!.price) <= left && !UPGRADE_TIERS.some(t => cents(t.price) <= left && t.price > up!.tier!.price));
    const withUpgrade = { ...Object.fromEntries(kits.map(id => [id, { productIdentifier: id, expirationDate: null }])), [up!.tier!.id]: { productIdentifier: up!.tier!.id, expirationDate: null } };
    assert.equal(ownershipFrom(withUpgrade).bundle, true);
    // ...while a lower tier, or an upgrade with no kit, unlocks nothing.
    for (const lower of UPGRADE_TIERS.filter(t => t.price < up!.tier!.price)) assert.equal(bundleUnlocked({ kits, upgrades: [lower.id] }), false, `${kits.join()} + ${lower.id}`);
  }
  for (const tier of UPGRADE_TIERS) assert.equal(bundleUnlocked({ kits: [], upgrades: [tier.id] }), false);
  assert.ok(reachable > 7 && free > 0);
  // The worked example from the rule: a Business Funding Prep Kit owner upgrades for $9.99.
  assert.equal(upgradeFor(['ap_business_funding_kit'])!.tier!.price, 9.99);
  assert.equal(kitPurchaseGate().ok, false);
});
test('owning nothing offers the bundle first, then the kit she asked about; owning the bundle offers nothing', () => {
  assert.deepEqual(offersFor(owned()), [COMPLETE_BUNDLE.productId, KIT.productId]);
  assert.deepEqual(offersFor(owned(), 'explanation'), [COMPLETE_BUNDLE.productId, EXPLANATION_PRODUCT]);
  assert.deepEqual(offersFor(owned(), COMPLETE_BUNDLE.productId), [COMPLETE_BUNDLE.productId]);
  assert.deepEqual(offersFor(owned(), UPGRADE_IDS[0]), [COMPLETE_BUNDLE.productId]);
  for (const kit of ALL_KIT_IDS) { assert.deepEqual(offersFor(owned(false, false, true), kit), []); assert.equal(ownsKit(owned(false, false, true), kit), true); }
});
test('the bundle grants every kit; individual kits remain independent', () => {
  assert.deepEqual(ownershipFrom({ [COMPLETE_BUNDLE.productId]: { productIdentifier: COMPLETE_BUNDLE.productId, expirationDate: null } }), owned(true, true, true, [...FILE_KIT_IDS]));
  assert.deepEqual(ownershipFrom({ [KIT.productId]: { productIdentifier: KIT.productId } }), owned(true));
  assert.deepEqual(ownershipFrom({ [EXPLANATION_PRODUCT]: { productIdentifier: EXPLANATION_PRODUCT } }), owned(false, true));
  for (const id of FILE_KIT_IDS) assert.deepEqual(ownershipFrom({ [id]: { productIdentifier: id } }), owned(false, false, false, [id]));
  assert.deepEqual(ownershipFrom({ [FILE_KIT_IDS[0]]: { productIdentifier: FILE_KIT_IDS[0], expirationDate: '2027-01-01' } }), NO_OWNERSHIP);
  assert.deepEqual(ownershipFrom({ [COMPLETE_BUNDLE.productId]: { productIdentifier: KIT.productId } }), NO_OWNERSHIP);
  assert.deepEqual(ownershipFrom({ [UPGRADE_IDS[0]]: { productIdentifier: UPGRADE_IDS[0] } }), NO_OWNERSHIP);
  void asOwnership;
});
const kinds = ['goodwill', 'debt-validation', 'settlement-terms', 'follow-up'];
const explanationKinds = ['credit', 'income-gap', 'employment-gap', 'address-history', 'rental-issue', 'late-payment', 'bank-statement', 'life-event', 'general-application'].map(k => `explanation-${k}`);
const fakeLetter = (kind: string) => ({ kind, name: `FAKE ${kind}`, template: 'FAKE {{a|A}} {{b|B}} {{c|C}} {{d|D}}', questions: ['a', 'b', 'c', 'd'].map(name => ({ title: 'FAKE question', fields: [{ name, label: 'FAKE field' }] })) });
const fakeKits = () => [{ kit: 'credit-letter-kit', version: 1, letters: kinds.map(fakeLetter) }, { kit: 'letter-of-explanation-kit', version: 1, letters: explanationKinds.map(fakeLetter) }];
function rateDb() {
  const raw = new DatabaseSync(':memory:');
  const stmt = (sql: string, args: any[] = []) => ({ run: async () => raw.prepare(sql).run(...args), first: async () => raw.prepare(sql).get(...args) });
  return { raw, prepare: (sql: string) => ({ ...stmt(sql), bind: (...args: any[]) => stmt(sql, args) }) };
}
const request = () => new Request('https://approvalprep.com/api/app-bundle', { method: 'POST', headers: { authorization: `Bearer $RCAnonymousID:${'a'.repeat(32)}` } });
const subscriber = (product: string | string[] = COMPLETE_BUNDLE.productId, sandbox = false) => { const ids = ([] as string[]).concat(product); return { entitlements: Object.fromEntries(ids.map(id => [id, { product_identifier: id, expires_date: null }])), non_subscriptions: Object.fromEntries(ids.map(id => [id, [{ is_sandbox: sandbox }]])) }; };

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
  const env = { PRODUCTS_DB: rateDb(), APPROVALPREP_REVENUECAT_SECRET: 'fake-rc', DOWNLOAD_SIGNING_SECRET: 'fake-signing', PRODUCT_ASSETS_R2: {
    get: async (key: string) => { reads.push(key); return key.endsWith('.zip') ? { body: 'FAKE-ZIP' } : { json: async () => fakeKits()[key.includes('credit-letter') ? 0 : 1] }; },
    head: async () => ({ size: 123 }),
  } };
  for (const refused of [subscriber(KIT.productId), subscriber(UPGRADE_IDS[1]), subscriber([KIT.productId, 'ap_bundle_upgrade_1999']), subscriber(COMPLETE_BUNDLE.productId, true), { ...subscriber(), non_subscriptions: {} }, { ...subscriber(), non_subscriptions: { [COMPLETE_BUNDLE.productId]: [{ is_sandbox: false, refunded_at: '2026-11-11' }] } }]) {
    info = refused;
    assert.equal((await onRequestPost({ request: request(), env })).status, 403);
  }
  assert.equal(reads.length, 0);
  // The bundle; a Credit Letter Kit owner's own $29.99 tier; kits that already add up to $49.99.
  for (const product of [COMPLETE_BUNDLE.productId, [KIT.productId, 'ap_bundle_upgrade'], ['ap_business_funding_kit', 'ap_rental_application_kit']]) {
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
  const env = { PRODUCTS_DB: rateDb(), APPROVALPREP_REVENUECAT_SECRET: 'fake', DOWNLOAD_SIGNING_SECRET: 'fake', PRODUCT_ASSETS_R2: {
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

test('the saved bundle is found again after the phone moves the app folder, and only our own file name is trusted', async () => {
  const { bundlePath } = await import('../src/purchases/bundleDelivery');
  assert.equal(bundlePath('file:///old-container/Documents/ApprovalPrep-bundle-1731400000000.zip', 'file:///new-container/Documents/'), 'file:///new-container/Documents/ApprovalPrep-bundle-1731400000000.zip');
  assert.equal(bundlePath('file:///old/Documents/../../etc/passwd', 'file:///new/Documents/'), null);
  assert.equal(bundlePath('file:///old/Documents/other.zip', 'file:///new/Documents/'), null);
  assert.equal(bundlePath('file:///old/Documents/ApprovalPrep-bundle-1.zip', null), null);
});

test('bundle door: attempts are capped per caller before RevenueCat, and sandbox purchases open only with the review switch', async t => {
  let calls = 0; let info: object = subscriber(COMPLETE_BUNDLE.productId, true);
  t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({ subscriber: info }); });
  const assets = { get: async (key: string) => ({ json: async () => fakeKits()[key.includes('credit-letter') ? 0 : 1] }), head: async () => ({ size: 9 }) };
  const base = { APPROVALPREP_REVENUECAT_SECRET: 'fake', DOWNLOAD_SIGNING_SECRET: 'fake', PRODUCT_ASSETS_R2: assets };
  // No counter to count on: refuse rather than run uncapped.
  assert.equal((await onRequestPost({ request: request(), env: base })).status, 503);
  assert.equal(calls, 0);
  const now = Date.now; Date.now = () => 1_800_000; t.after(() => { Date.now = now; });
  const env = { ...base, PRODUCTS_DB: rateDb() };
  // A sandbox purchase is refused, except while the store-review switch is on; a refund is refused either way.
  assert.equal((await onRequestPost({ request: request(), env })).status, 403);
  assert.equal((await onRequestPost({ request: request(), env: { ...env, APPROVALPREP_ACCEPT_SANDBOX_PURCHASES: 'true' } })).status, 403);
  const review = { ...env, APPROVALPREP_ACCEPT_SANDBOX_PURCHASES: '1' };
  assert.equal((await onRequestPost({ request: request(), env: review })).status, 200);
  info = { ...subscriber(), non_subscriptions: { [COMPLETE_BUNDLE.productId]: [{ is_sandbox: true, refunded_at: '2026-11-11' }] } };
  assert.equal((await onRequestPost({ request: request(), env: review })).status, 403);
  // 4 attempts so far in this window; the 121st is refused without asking RevenueCat.
  for (let n = 4; n < 120; n++) await onRequestPost({ request: request(), env });
  const before = calls;
  assert.equal((await onRequestPost({ request: request(), env })).status, 429);
  assert.equal(calls, before);
});
