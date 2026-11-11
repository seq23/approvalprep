import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { EXPLANATION_KIT, KIT, KIT_SALES_ENABLED } from '../src/kit';
import { EXPLANATION_LETTERS } from '../src/letters';
import { EXPLANATION_KIT_ID, KIT_ID, EXPLANATION_KINDS, KIT_KINDS, kitLetter, kitStore, parseKitTemplates, renderKitLetter, kitForKind } from '../src/kitTemplates';
import { MockPurchases, buyKit } from '../src/purchases/provider';
import { restoreKit } from '../src/purchases/delivery';
import { HONEST_LIMIT, SELF_HELP_LINE } from '../src/copy';
import { letterHtml } from '../src/letterPdf';
// @ts-ignore Pages JS
import { onRequestPost } from '../../../functions/api/app-unlock.js';
// @ts-ignore signing capability
import { signedKitUrl, validKitUrl } from '../../../functions/_runtime/app-kit.js';
const fake = (kit: string, kinds: readonly string[]) => ({ version: 1, kit, letters: kinds.map(kind => ({
  kind, name: `FAKE ${kind}`, questions: ['a', 'b', 'c', 'd'].map(name => ({ title: `FAKE ${name}`, fields: [{ name, label: `FAKE ${name}` }] })),
  template: 'FAKE {{a|A}} {{b|B}} {{c|C}} {{d|D}}', honestLine: HONEST_LIMIT,
})) });
const explanation = fake(EXPLANATION_KIT_ID, EXPLANATION_KINDS);
const credit = fake(KIT_ID, KIT_KINDS);
for (const kind of EXPLANATION_KINDS) test(`${kind} fills delivered blanks and uses the shared self-help PDF`, () => {
  const kit = parseKitTemplates(explanation)!;
  const letter = kitLetter(kit, kind)!;
  assert.ok(letter);
  assert.equal(kitForKind(kind), EXPLANATION_KIT_ID);
  assert.equal(kitLetter(parseKitTemplates(credit), kind), null);
  const full = renderKitLetter(letter, { a: 'ONE', b: 'TWO', c: 'THREE', d: 'FOUR' });
  assert.equal(full.text, 'FAKE ONE TWO THREE FOUR');
  assert.deepEqual(full.blanks, []);
  assert.deepEqual(renderKitLetter(letter, {}).blanks, ['A', 'B', 'C', 'D']);
  assert.ok(letterHtml(full.text).includes(SELF_HELP_LINE));
  assert.equal(letter.honestLine, HONEST_LIMIT);
});
test('kit storage keeps ownership independent across restart and rejects cross-kit letters', async () => {
  assert.equal(EXPLANATION_LETTERS.length, 9);
  assert.equal(EXPLANATION_KIT.productId, 'ap_explanation_kit');
  assert.equal(EXPLANATION_KIT.approvedPriceUSD, 14.99);
  assert.equal(KIT_SALES_ENABLED, false);
  assert.equal(parseKitTemplates({ ...explanation, letters: credit.letters }), null);
  const db = new DatabaseSync(':memory:');
  const adapter = { execAsync: async (sql: string) => { db.exec(sql); }, runAsync: async (sql: string, ...args: any[]) => db.prepare(sql).run(...args), getAllAsync: async <T>(sql: string, ...args: any[]) => db.prepare(sql).all(...args) as T[] };
  try {
    const c = await kitStore(adapter), e = await kitStore(adapter, EXPLANATION_KIT_ID);
    assert.equal(await e.save(explanation), true);
    assert.equal(await c.read(), null);
    assert.equal(await c.save(explanation), false);
    assert.equal(await c.save(credit), true);
    assert.deepEqual(await (await kitStore(adapter, EXPLANATION_KIT_ID)).read(), explanation);
    await c.remove();
    assert.deepEqual(await e.read(), explanation);
    assert.equal(await c.read(), null);
  } finally { db.close(); }
});
test('Restore independently delivers each owned kit or both; switched-off Buy never reaches store', async () => {
  const original = globalThis.fetch;
  try {
    for (const owns of [{ creditKit: true, explanationKit: false }, { creditKit: false, explanationKit: true }, { creditKit: true, explanationKit: true }]) {
      const provider = new MockPurchases();
      const mockProvider = { ...provider, restore: async () => owns, userId: async () => '$RCAnonymousID:0123456789abcdef0123456789abcdef', purchase: async () => { throw Error('MUST_NOT_REACH_STORE'); } } as any;
      const saved: string[] = [];
      globalThis.fetch = async input => {
        const url = new URL(String(input)), kit = url.searchParams.get('kit')!;
        return new Response(JSON.stringify(url.pathname.endsWith('app-unlock') ? { url: `https://approvalprep.com/api/app-kit-file?kit=${kit}` } : kit === KIT_ID ? credit : explanation));
      };
      assert.equal(await restoreKit(mockProvider, async kit => { saved.push(kit.kit); return true; }), true);
      assert.deepEqual(saved, [ ...(owns.creditKit ? [KIT_ID] : []), ...(owns.explanationKit ? [EXPLANATION_KIT_ID] : []) ]);
      await assert.rejects(buyKit(mockProvider, EXPLANATION_KIT.productId), /STORE_ACCOUNTS_NOT_READY/);
    }
  } finally { globalThis.fetch = original; }
});
test('server checks the selected entitlement and signatures cannot switch kits', async () => {
  const original = globalThis.fetch;
  const rate = new DatabaseSync(':memory:');
  const statement = (sql: string, args: any[] = []) => ({ run: async () => rate.prepare(sql).run(...args), first: async () => rate.prepare(sql).get(...args) });
  const PRODUCTS_DB = { prepare: (sql: string) => ({ ...statement(sql), bind: (...args: any[]) => statement(sql, args) }) };
  const env = { PRODUCTS_DB, APPROVALPREP_REVENUECAT_SECRET: 'FAKE', DOWNLOAD_SIGNING_SECRET: 'FAKE', PRODUCT_ASSETS_R2: {} };
  const request = (kit: string) => new Request(`https://approvalprep.com/api/app-unlock?kit=${kit}`, { method: 'POST', headers: { Authorization: 'Bearer $RCAnonymousID:0123456789abcdef0123456789abcdef' } });
  try {
    for (const product of [KIT.productId, EXPLANATION_KIT.productId]) {
      globalThis.fetch = async () => new Response(JSON.stringify({ subscriber: { entitlements: { [product]: { product_identifier: product, expires_date: null } }, non_subscriptions: { [product]: [{ is_sandbox: false }] } } }));
      assert.equal((await onRequestPost({ request: request(product === KIT.productId ? KIT_ID : EXPLANATION_KIT_ID), env })).status, 200);
      assert.equal((await onRequestPost({ request: request(product === KIT.productId ? EXPLANATION_KIT_ID : KIT_ID), env })).status, 403);
    }
    const url = new URL(await signedKitUrl('https://approvalprep.com', 'FAKE', Date.now(), EXPLANATION_KIT_ID));
    assert.equal(await validKitUrl(url, 'FAKE'), true);
    url.searchParams.set('kit', KIT_ID);
    assert.equal(await validKitUrl(url, 'FAKE'), false);
  } finally { globalThis.fetch = original; }
});

test('Restore saves the other owned kit when either delivery fails and reports partial failure', async () => {
  const original = globalThis.fetch;
  const provider = new MockPurchases();
  provider.restore = async () => ({ creditKit: true, explanationKit: true });
  provider.userId = async () => '$RCAnonymousID:0123456789abcdef0123456789abcdef';
  try {
    for (const failed of [KIT_ID, EXPLANATION_KIT_ID]) {
      for (const failure of ['server', 'payload', 'save']) {
        const saved: string[] = [];
        globalThis.fetch = async input => {
          const url = new URL(String(input)), kit = url.searchParams.get('kit');
          if (kit === failed && failure === 'server') return new Response('{}', { status: 503 });
          if (url.pathname.endsWith('app-unlock')) return new Response(JSON.stringify({ url: `https://approvalprep.com/api/app-kit-file?kit=${kit}` }));
          return new Response(JSON.stringify(kit === failed && failure === 'payload' ? {} : kit === KIT_ID ? credit : explanation));
        };
        await assert.rejects(restoreKit(provider, async kit => {
          if (kit.kit === failed && failure === 'save') return false;
          saved.push(kit.kit); return true;
        }), /KIT_RESTORE_PARTIAL/);
        assert.deepEqual(saved, [failed === KIT_ID ? EXPLANATION_KIT_ID : KIT_ID]);
      }
    }
  } finally { globalThis.fetch = original; }
});
