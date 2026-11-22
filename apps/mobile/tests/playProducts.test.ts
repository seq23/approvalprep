// The Google Play catalog the shared tool (~/bin/play-products) reads. The tool itself (plan, apply,
// outages, ceilings) is tested in seq-bin (tests/store/play-products.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore plain JavaScript module
import { catalog, kitSetsByTier } from '../scripts/store/play-products.mjs';
import { catalog as revenuecat } from '../scripts/revenuecat/setup';
import { ALL_KIT_IDS, COMPLETE_BUNDLE, UPGRADE_TIERS, upgradeFor } from '../src/kit';

type P = { id: string; title: string; description: string; priceUsd: number | null; ceiling?: { whole: string; parts: string[][] } };
const products: P[] = catalog.products;

// The approved store prices, written out by hand so a change in the code fails here first.
const APPROVED: Record<string, number> = {
  ap_complete_bundle: 49.99,
  ap_explanation_kit: 14.99, ap_income_employment_kit: 19.99, ap_credit_kit: 19.99, ap_rental_application_kit: 29.99,
  ap_loan_prep_kit: 29.99, ap_business_funding_kit: 39.99, ap_life_admin_kit: 19.99,
  ap_bundle_upgrade_3499: 34.99, ap_bundle_upgrade: 29.99, ap_bundle_upgrade_1999: 19.99, ap_bundle_upgrade_1499: 14.99,
  ap_bundle_upgrade_999: 9.99, ap_bundle_upgrade_499: 4.99,
};

test('Play gets every product RevenueCat sells, at the approved price, with a listing Play accepts', () => {
  assert.equal(catalog.packageName, 'com.approvalprep.app');
  assert.deepEqual(products.map(p => p.id), revenuecat.products.map(p => p.id));
  assert.deepEqual(Object.fromEntries(products.map(p => [p.id, p.priceUsd])), APPROVED);
  for (const p of products) {
    assert.ok(p.title.length > 0 && p.title.length <= 55, p.id);
    assert.ok(p.description.length > 0 && p.description.length <= 200, p.id);
    assert.doesNotMatch(`${p.title} ${p.description}`, /\$|\d+\.\d\d/, `${p.id}: no price in the text, Play shows it in the buyer's currency`);
  }
});

test('every kit set that leads to an upgrade is a ceiling part of that upgrade, and in dollars none passes the bundle', () => {
  const cents = (n: number) => Math.round(n * 100);
  const sets = kitSetsByTier();
  let pairs = 0;
  for (let mask = 1; mask < 1 << ALL_KIT_IDS.length; mask++) {
    const set = ALL_KIT_IDS.filter((_, i) => mask & (1 << i));
    const tier = upgradeFor(set)?.tier;
    if (!tier) continue;
    pairs++;
    const up = products.find(p => p.id === tier.id)!;
    assert.equal(up.ceiling?.whole, COMPLETE_BUNDLE.productId);
    assert.ok(up.ceiling!.parts.some(part => part.join() === set.join()), `${set.join('+')} -> ${tier.id}`);
    const paid = set.reduce((sum, id) => sum + cents(APPROVED[id]), 0);
    assert.ok(paid + cents(APPROVED[tier.id]) <= cents(APPROVED.ap_complete_bundle), `${set.join('+')} + ${tier.id}`);
  }
  assert.ok(pairs >= 12, `only ${pairs} kit sets lead to an upgrade`);
  assert.equal([...sets.keys()].length, UPGRADE_TIERS.length, 'every upgrade tier is reachable');
  for (const p of products.filter(p => !UPGRADE_TIERS.some(t => t.id === p.id))) assert.equal(p.ceiling, undefined, p.id);
});
