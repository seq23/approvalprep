import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KIT, KIT_SALES_ENABLED, kitPurchaseGate } from '../src/kit';

test('the kit is the approved product and price (her ruling 6 Nov 2026)', () => {
  assert.equal(KIT.productId, 'ap_credit_kit');
  assert.equal(KIT.approvedPriceUSD, 19.99);
});

test('kit sales are on (store products and RevenueCat live, 14 Nov 2026); switched off, buying is a named stop', () => {
  assert.equal(KIT_SALES_ENABLED, true);
  assert.deepEqual(kitPurchaseGate(), { ok: true });
  const off = kitPurchaseGate(false);
  assert.equal(off.ok, false);
  assert.equal(!off.ok && off.stop, 'STORE_ACCOUNTS_NOT_READY');
});
