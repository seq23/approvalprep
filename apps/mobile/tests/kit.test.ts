import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KIT, KIT_SALES_ENABLED, kitPurchaseGate } from '../src/kit';

test('the kit is the approved product and price (her ruling 6 Nov 2026)', () => {
  assert.equal(KIT.productId, 'ap_credit_kit');
  assert.equal(KIT.approvedPriceUSD, 19.99);
});

test('kit sales stay off behind a named stop until the store accounts and RevenueCat exist', () => {
  assert.equal(KIT_SALES_ENABLED, false);
  const gate = kitPurchaseGate();
  assert.equal(gate.ok, false);
  assert.equal(!gate.ok && gate.stop, 'STORE_ACCOUNTS_NOT_READY');
  assert.deepEqual(kitPurchaseGate(true), { ok: true });
});
