import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KIT } from '../src/kit';
import { MockPurchases, acceptedKey, buyKit } from '../src/purchases/provider';
import { restoreKit } from '../src/purchases/delivery';
// @ts-ignore Pages function is shared JS
import { onRequestPost } from '../../../functions/api/app-unlock.js';
// @ts-ignore Pages function is shared JS
import { onRequestGet } from '../../../functions/api/app-kit-file.js';
// @ts-ignore shared signing helper
import { signedKitUrl } from '../../../functions/_runtime/app-kit.js';

test('preview cannot charge or unlock; sales switch prevents reaching any provider', async () => {
  const mock = new MockPurchases();
  assert.equal((await mock.products())[0].id, KIT.productId);
  assert.equal((await mock.entitlement()).creditKit, false);
  await assert.rejects(mock.purchase(KIT.productId), /REVENUECAT_KEY_MISSING/);
  let calls = 0;
  await assert.rejects(buyKit({ ...mock, mode: 'store', purchase: async () => { calls++; return { creditKit: true }; } } as any), /STORE_ACCOUNTS_NOT_READY/);
  assert.equal(calls, 0);
  assert.equal(await restoreKit(mock, async () => { calls++; return true; }), false);
  assert.equal(calls, 0);
  assert.equal(acceptedKey('web', 'appl_fake'), false);
  assert.equal(acceptedKey('android', 'appl_fake'), false);
  assert.equal(acceptedKey('ios', 'appl_fake'), true);
});

test('download door refuses unknown, refunded, sandbox and unentitled purchases identically; signed files expire and reject tampering', async () => {
  const original = globalThis.fetch;
  const env = { APPROVALPREP_REVENUECAT_SECRET: 'fake-server-test-key', DOWNLOAD_SIGNING_SECRET: 'fake-test-signing-key', PRODUCT_ASSETS_R2: { get: async (key: string) => { assert.equal(key, 'app-kits/credit-letter-kit.json'); return { body: 'FAKE TEST KIT' }; } } };
  const request = new Request('https://approvalprep.com/api/app-unlock', { method: 'POST', headers: { Authorization: 'Bearer $RCAnonymousID:0123456789abcdef0123456789abcdef' } });
  const subscriber = { entitlements: { [KIT.productId]: { product_identifier: KIT.productId, expires_date: null } }, non_subscriptions: { [KIT.productId]: [{ is_sandbox: false }] } };
  let data: any = {};
  let status = 200;
  globalThis.fetch = async () => new Response(JSON.stringify(data), { status });
  try {
    assert.equal((await onRequestPost({ request, env: {} })).status, 503);
    for (const value of [{}, { subscriber: { ...subscriber, entitlements: {} } }, { subscriber: { ...subscriber, non_subscriptions: { [KIT.productId]: [{ is_sandbox: true }] } } }, { subscriber: { ...subscriber, non_subscriptions: { [KIT.productId]: [{ is_sandbox: false, refunded_at: '2026-11-11' }] } } }]) {
      data = value;
      const refused = await onRequestPost({ request, env });
      assert.equal(refused.status, 403); assert.deepEqual(await refused.json(), { error: 'KIT_NOT_AVAILABLE' });
    }
    status = 404;
    assert.equal((await onRequestPost({ request, env })).status, 403);
    status = 200; data = { subscriber };
    const response = await onRequestPost({ request, env });
    assert.equal(response.status, 200);
    const { url } = await response.json() as { url: string };
    const file = await onRequestGet({ request: new Request(url), env });
    assert.equal(await file.text(), 'FAKE TEST KIT');
    assert.equal(file.headers.get('cache-control'), 'private, no-store');
    const tampered = new URL(url); tampered.searchParams.set('sig', '0'.repeat(64));
    assert.equal((await onRequestGet({ request: new Request(tampered), env })).status, 403);
    const expired = await signedKitUrl('https://approvalprep.com', env.DOWNLOAD_SIGNING_SECRET, Date.now() - 600000);
    assert.equal((await onRequestGet({ request: new Request(expired), env })).status, 403);
    assert.equal((await onRequestGet({ request: new Request('https://approvalprep.com/api/app-kit-file'), env })).status, 403);
  } finally { globalThis.fetch = original; }
});

test('restore never stores a bad or redirected kit and exposes missing server setup', async () => {
  const original = globalThis.fetch;
  const provider = new MockPurchases();
  provider.restore = async () => ({ creditKit: true });
  provider.userId = async () => '$RCAnonymousID:0123456789abcdef0123456789abcdef';
  let saves = 0;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ stop: 'REVENUECAT_SECRET_MISSING' }), { status: 503 });
    await assert.rejects(restoreKit(provider, async () => { saves++; return true; }), /REVENUECAT_SECRET_MISSING/);
    globalThis.fetch = async () => new Response(JSON.stringify({ url: 'https://elsewhere.invalid/api/app-kit-file' }));
    await assert.rejects(restoreKit(provider, async () => { saves++; return true; }), /KIT_DOWNLOAD_UNAVAILABLE/);
    globalThis.fetch = async input => new Response(JSON.stringify(new URL(String(input)).pathname === '/api/app-unlock' ? { url: 'https://approvalprep.com/api/app-kit-file?fake=test' } : { letters: [] }));
    await assert.rejects(restoreKit(provider, async () => { saves++; return true; }), /KIT_DOWNLOAD_UNAVAILABLE/);
    assert.equal(saves, 0);
  } finally { globalThis.fetch = original; }
});

test('confirmed Restore downloads a complete kit and saves it for offline use', async () => {
  const original = globalThis.fetch;
  const provider = new MockPurchases();
  provider.restore = async () => ({ creditKit: true });
  provider.userId = async () => '$RCAnonymousID:0123456789abcdef0123456789abcdef';
  const kit = { version: 1, kit: 'credit-letter-kit', letters: ['goodwill', 'debt-validation', 'settlement-terms', 'follow-up'].map(kind => ({
    kind, name: `FAKE ${kind}`, questions: ['a', 'b', 'c', 'd'].map(name => ({ title: `FAKE ${name}`, fields: [{ name, label: `FAKE ${name}` }] })),
    template: 'FAKE {{a|A}} {{b|B}} {{c|C}} {{d|D}}',
  })) };
  const requests: string[] = [];
  globalThis.fetch = async input => {
    requests.push(String(input));
    return new Response(JSON.stringify(new URL(String(input)).pathname === '/api/app-unlock' ? { url: 'https://approvalprep.com/api/app-kit-file?fake=test' } : kit));
  };
  try {
    let saved: unknown;
    assert.equal(await restoreKit(provider, async value => { saved = value; return true; }), true);
    assert.deepEqual(saved, kit);
    assert.equal(requests.length, 2);
    assert.ok(requests.every(url => url.startsWith('https://approvalprep.com/api/app-')));
  } finally { globalThis.fetch = original; }
});
