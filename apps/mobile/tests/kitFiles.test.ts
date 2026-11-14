// Her ruling 13 Nov 2026, "Exact mirror": each in-app kit unlocks the same PDF and Word file the
// website delivers, only after the store purchase is checked again on the server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { KIT, COMPLETE_BUNDLE, BUNDLE_UPGRADE, FILE_KITS, SITE_SKU, kitPurchaseGate } from '../src/kit';
import { validFileLinks } from '../src/purchases/kitFileLinks';
import { restoreFileKits } from '../src/purchases/restoreAll';
import { MockPurchases, PreviewPurchases, buyKit } from '../src/purchases/provider';
import { previewBuy, previewOwns, previewKit, resetPreviewPurchases } from '../src/previewSamples';
// @ts-ignore Pages runtime is JavaScript
import { onRequestPost } from '../../../functions/api/app-files.js';
// @ts-ignore Pages runtime is JavaScript
import { onRequestGet } from '../../../functions/api/app-files-file.js';
// @ts-ignore Pages runtime is JavaScript
import { APP_FILE_KITS, signedFileUrl } from '../../../functions/_runtime/app-files.js';
// @ts-ignore Pages runtime is JavaScript
import { productAssetKey } from '../../../functions/_runtime/asset-keys.js';

function rateDb() {
  const raw = new DatabaseSync(':memory:');
  const stmt = (sql: string, args: any[] = []) => ({ run: async () => raw.prepare(sql).run(...args), first: async () => raw.prepare(sql).get(...args) });
  return { prepare: (sql: string) => ({ ...stmt(sql), bind: (...args: any[]) => stmt(sql, args) }) };
}
const request = (kit: string) => new Request(`https://approvalprep.com/api/app-files?kit=${kit}`, { method: 'POST', headers: { authorization: `Bearer $RCAnonymousID:${'b'.repeat(32)}` } });
const subscriber = (product: string, extra: object = {}) => ({ entitlements: { [product]: { product_identifier: product, expires_date: null } }, non_subscriptions: { [product]: [{ is_sandbox: false, ...extra }] } });

test('the server and the app name the same kit for every product, and each is the website kit\'s own files', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(APP_FILE_KITS).map(([sku, id]) => [id, sku])), SITE_SKU);
  assert.equal(Object.keys(APP_FILE_KITS).length, 7);
});

test('file door: refuses anyone who has not bought this kit or the bundle, before reading a file; serves the website\'s own objects on signed, expiring links', async t => {
  const reads: string[] = [];
  let info: object = {};
  let heads: Record<string, { size: number } | null> = {};
  t.mock.method(globalThis, 'fetch', async () => Response.json({ subscriber: info }));
  const env = { PRODUCTS_DB: rateDb(), APPROVALPREP_REVENUECAT_SECRET: 'fake-rc', DOWNLOAD_SIGNING_SECRET: 'fake-signing', PRODUCT_ASSETS_R2: {
    head: async (key: string) => { reads.push(key); return key in heads ? heads[key] : { size: 10 }; },
    get: async (key: string) => { reads.push(key); return { body: `FAKE ${key}` }; },
  } };
  const kit = FILE_KITS[1];
  // Not bought, another kit bought, sandbox, refunded, expiring, unknown kit: one refusal, nothing read.
  for (const [who, sku] of [[{}, kit.sku], [subscriber(FILE_KITS[0].productId), kit.sku], [subscriber(KIT.productId), kit.sku], [subscriber(kit.productId, { is_sandbox: true }), kit.sku],
    [subscriber(kit.productId, { refunded_at: '2026-11-12' }), kit.sku], [{ ...subscriber(kit.productId), entitlements: { [kit.productId]: { product_identifier: kit.productId, expires_date: '2027-01-01' } } }, kit.sku],
    [subscriber(kit.productId), 'products/../secret'], [subscriber(kit.productId), 'free-preview']] as const) {
    info = who;
    const refused = await onRequestPost({ request: request(sku), env });
    assert.equal(refused.status, 403, JSON.stringify(who));
    assert.deepEqual(await refused.json(), { error: 'KIT_NOT_AVAILABLE' });
  }
  assert.equal(reads.length, 0);
  // The kit itself, the bundle or the upgrade opens it; the credit kit owner gets the credit kit's files.
  for (const [who, sku] of [[subscriber(kit.productId), kit.sku], [subscriber(COMPLETE_BUNDLE.productId), kit.sku], [subscriber(BUNDLE_UPGRADE.productId), kit.sku], [subscriber(KIT.productId), 'credit-letter-kit']] as const) {
    info = who;
    const response = await onRequestPost({ request: request(sku), env });
    assert.equal(response.status, 200);
    const body = await response.json();
    const links = validFileLinks(body, sku);
    assert.ok(links, 'the app accepts the links the server sends');
    for (const { type, url } of links!) {
      const file = await onRequestGet({ request: new Request(url), env });
      assert.equal(file.status, 200);
      assert.equal(await file.text(), `FAKE ${productAssetKey(sku, type)}`);
      assert.match(file.headers.get('cache-control')!, /no-store/);
      assert.equal(file.headers.get('content-type'), type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      // A link for one kit or type never opens another.
      for (const [param, value] of [['kit', FILE_KITS[0].sku], ['type', type === 'pdf' ? 'docx' : 'pdf'], ['expires', '9999999999']]) {
        const tampered = new URL(url); tampered.searchParams.set(param, value);
        assert.equal((await onRequestGet({ request: new Request(tampered), env })).status, 403, param);
      }
    }
  }
  const expired = await signedFileUrl('https://approvalprep.com', 'fake-signing', kit.sku, 'pdf', Date.now() - 301000);
  assert.equal((await onRequestGet({ request: new Request(expired), env })).status, 403);
  // A missing or empty file is a named stop, never a broken download.
  info = subscriber(kit.productId);
  heads = { [productAssetKey(kit.sku, 'docx')]: { size: 0 } };
  assert.deepEqual(await (await onRequestPost({ request: request(kit.sku), env })).json(), { stop: 'APP_FILES_ASSET_MISSING' });
  assert.equal((await onRequestPost({ request: request(kit.sku), env: {} })).status, 503);
  assert.equal((await onRequestPost({ request: request(kit.sku), env: { ...env, PRODUCTS_DB: undefined } })).status, 503);
});

test('the app follows only our own signed file route for the kit it asked for', () => {
  const ok = { kit: 'rental-application-kit', files: ['pdf', 'docx'].map(type => ({ type, url: `https://approvalprep.com/api/app-files-file?kit=rental-application-kit&type=${type}&expires=1&sig=a` })) };
  assert.equal(validFileLinks(ok, 'rental-application-kit')?.length, 2);
  assert.equal(validFileLinks(ok, 'life-admin-letter-kit'), null);
  for (const url of ['https://other.example/api/app-files-file?kit=rental-application-kit&type=pdf', 'https://approvalprep.com/api/download-file?kit=rental-application-kit&type=pdf', 'https://approvalprep.com/api/app-files-file?kit=life-admin-letter-kit&type=pdf', 'not a url']) {
    assert.equal(validFileLinks({ ...ok, files: [{ type: 'pdf', url }, ok.files[1]] }, 'rental-application-kit'), null, url);
  }
  assert.equal(validFileLinks({ ...ok, files: [ok.files[0]] }, 'rental-application-kit'), null);
});

test('Restore brings back every file kit owned on its own, and says so when one fails', async () => {
  const got: string[] = [];
  const account = (fileKits: string[], bundle = false) => ({ restore: async () => ({ creditKit: false, explanationKit: false, bundle, fileKits }), userId: async () => 'id' });
  assert.equal(await restoreFileKits(account([FILE_KITS[0].productId, FILE_KITS[3].productId]), async sku => { got.push(sku); }), true);
  assert.deepEqual(got, [FILE_KITS[0].sku, FILE_KITS[3].sku]);
  assert.equal(await restoreFileKits(account([]), async () => { throw Error('never'); }), false);
  // The bundle brings its files in its own ZIP.
  assert.equal(await restoreFileKits(account([FILE_KITS[0].productId], true), async () => { throw Error('never'); }), false);
  await assert.rejects(restoreFileKits(account([FILE_KITS[0].productId, FILE_KITS[1].productId]), async sku => { if (sku === FILE_KITS[1].sku) throw Error('KIT_FILES_UNAVAILABLE'); }), /KIT_RESTORE_PARTIAL/);
  await assert.rejects(restoreFileKits(account([FILE_KITS[0].productId]), async () => { throw Error('KIT_FILES_UNAVAILABLE'); }), /KIT_FILES_UNAVAILABLE/);
});

test('pretend purchases exist only with the preview flag, and never get past the sales switch otherwise', async () => {
  resetPreviewPurchases();
  assert.equal(kitPurchaseGate().ok, false);
  assert.throws(() => previewBuy(KIT.productId, false), /REVENUECAT_KEY_MISSING/);
  assert.equal(previewOwns(KIT.productId, false), false);
  // Without the flag the app's own provider is the keyless mock, which can never unlock anything.
  await assert.rejects(buyKit(new MockPurchases(), KIT.productId), /STORE_ACCOUNTS_NOT_READY/);
  await assert.rejects(buyKit(new PreviewPurchases(false), KIT.productId), /REVENUECAT_KEY_MISSING/);
  assert.equal((await new PreviewPurchases(false).entitlement()).creditKit, false);
  // With it, each of the eight can be "bought" and is owned for the visit; the bundle owns every kit.
  const preview = new PreviewPurchases(true);
  assert.equal((await buyKit(preview, KIT.productId)).creditKit, true);
  assert.ok(previewKit('credit-letter-kit', true), 'a pretend Credit Letter Kit opens its letters');
  assert.equal(previewKit('letter-of-explanation-kit', true), null);
  for (const kit of FILE_KITS) { assert.equal(previewOwns(kit.productId, true), false); previewBuy(kit.productId, true); assert.equal(previewOwns(kit.productId, true), true); }
  resetPreviewPurchases();
  previewBuy(COMPLETE_BUNDLE.productId, true);
  for (const id of Object.keys(SITE_SKU)) assert.equal(previewOwns(id, true), true, id);
  resetPreviewPurchases();
});
