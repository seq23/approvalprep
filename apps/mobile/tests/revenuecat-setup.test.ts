// The RevenueCat catalog the shared tool (~/bin/revenuecat-setup) reads. The tool itself and its
// read-back are tested in seq-bin (tests/store/revenuecat-setup.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../scripts/revenuecat/setup';
import { ALL_KIT_IDS, UPGRADE_IDS, COMPLETE_BUNDLE } from '../src/kit';

const ids = catalog.products.map(p => p.id);

test('the RevenueCat catalog sells every product the app can buy, each as its own entitlement', () => {
  assert.deepEqual([...ids].sort(), [COMPLETE_BUNDLE.productId, ...ALL_KIT_IDS, ...UPGRADE_IDS].sort());
  assert.ok(catalog.entitlements.every(e => e.products.length === 1 && e.products[0] === e.key));
});

test('every product is non_consumable: on Play a one-time purchase RevenueCat does not hold as non_consumable is consumed, and restore gives nothing back', () => {
  for (const p of catalog.products) assert.equal(p.kind, 'non_consumable', p.id);
});
