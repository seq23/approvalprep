import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../scripts/revenuecat/setup';
// @ts-ignore plain JavaScript module
import { diff } from '../scripts/revenuecat/engine.mjs';
import { ALL_KIT_IDS, UPGRADE_IDS, COMPLETE_BUNDLE } from '../src/kit';

const ids = catalog.products.map(p => p.id);
// A RevenueCat project that matches the catalog exactly, as the engine reads it back.
const live = () => ({
  apps: [{ id: 'a1', type: 'app_store', app_store: { bundle_id: catalog.bundleId } }, { id: 'a2', type: 'play_store', play_store: { package_name: catalog.bundleId } }, { id: 'a3', type: 'test_store' }],
  products: ['a1', 'a2', 'a3'].flatMap(app_id => ids.map(store_identifier => ({ app_id, store_identifier }))),
  entitlementProducts: Object.fromEntries(ids.map(id => [id, [id]])),
  offeringPackages: { default: ids.map((key, i) => ({ key, position: i + 1, products: [key] })) },
  currentOffering: ['default'],
});

test('the RevenueCat catalog sells every product the app can buy, each as its own entitlement', () => {
  assert.deepEqual([...ids].sort(), [COMPLETE_BUNDLE.productId, ...ALL_KIT_IDS, ...UPGRADE_IDS].sort());
  assert.ok(catalog.products.every(p => p.kind === 'non_consumable'));
  assert.ok(catalog.entitlements.every(e => e.products.length === 1 && e.products[0] === e.key));
});

test('the read-back check passes only when RevenueCat matches the code', () => {
  assert.deepEqual(diff(catalog, live()), []);
  const wrong = live();
  wrong.products = wrong.products.filter(p => !(p.app_id === 'a2' && p.store_identifier === 'ap_credit_kit'));
  wrong.entitlementProducts.ap_complete_bundle = [];
  wrong.offeringPackages.default[0].position = 99;
  (wrong.apps[0] as { app_store: { bundle_id: string } }).app_store.bundle_id = 'com.other';
  assert.deepEqual(diff(catalog, wrong).length, 4);
});
