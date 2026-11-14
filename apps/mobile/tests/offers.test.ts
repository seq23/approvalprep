// Hostile review, 13 Nov 2026: "idk what is being offered on this app". Every screen names the same
// offers from one list, a locked letter names its kit and price, and Restore does what it says.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUNDLE_OFFER, CREDIT_KIT, EXPLANATION_KIT_OFFER, KIT_OFFERS, KIT_ORDER, PRODUCTS, bundleWebsiteKits, kitOfferFor, lockedLine, offerTitle, productRoute, websiteDifference } from '../src/offers';
import catalog from '../../../data/products/products.json';
import { WEBSITE_KITS, websiteKit } from '../src/websiteKits';
import { LETTERS, EXPLANATION_LETTERS } from '../src/letters';
import { kitForKind, kindsForKit } from '../src/kitTemplates';
import { otherKits } from '../src/purchases/bundleOffers';
import { KIT, EXPLANATION_KIT, COMPLETE_BUNDLE, FILE_KITS, SITE_SKU, ALL_KIT_IDS } from '../src/kit';
import { restoreAll, restoreMessage } from '../src/purchases/restoreAll';

test('every locked letter names its own kit, and both kits hold exactly their letters', () => {
  for (const letter of [...LETTERS, ...EXPLANATION_LETTERS].filter(l => l.access === 'kit')) {
    const kit = kitOfferFor(kitForKind(letter.kind));
    assert.ok(kit.letters.some(l => l.kind === letter.kind), letter.kind);
    assert.equal(lockedLine(kit.name, 'PRICE'), `In the ${kit.name}, PRICE once`);
  }
  for (const kit of KIT_OFFERS) assert.deepEqual(kit.letters.map(l => l.kind).sort(), [...kindsForKit(kit.id)].sort());
  assert.equal(offerTitle('A kit', undefined), 'A kit · paid once');
  assert.deepEqual(KIT_OFFERS.map(k => k.productId), [KIT.productId, EXPLANATION_KIT.productId]);
});

// Her ruling 13 Nov 2026, "Exact mirror": the app sells the website's 8 products, same names, same order.
test('the app sells exactly the website\'s paid products, in the website\'s order, under the website\'s names', () => {
  const site = (catalog.products as { sku: string; name: string; status: string; stripe_enabled?: boolean; priceLabel: string }[]).filter(p => p.status === 'active_paid' && p.stripe_enabled);
  assert.equal(site.length, 8);
  assert.deepEqual(PRODUCTS.map(p => p.name), site.map(p => p.name));
  assert.deepEqual(PRODUCTS.map(p => p.sku), site.map(p => p.sku));
  // Every product is its own one-time product id, and each single kit opens its own screen for itself.
  assert.equal(new Set(PRODUCTS.map(p => p.productId)).size, 8);
  for (const p of PRODUCTS) {
    assert.deepEqual(productRoute(p.productId), { pathname: p.screen, params: p.params });
    if (p.productId === COMPLETE_BUNDLE.productId) { assert.equal(p.screen, '/letters/bundle'); continue; }
    assert.equal(SITE_SKU[p.productId], p.sku, `${p.name} unlocks the website's own files`);
    assert.ok(p.what.length > 10);
  }
  assert.deepEqual([...KIT_ORDER].sort(), [...ALL_KIT_IDS].sort());
  // Nearest store price to the price the website shows.
  const approved: Record<string, number> = { [KIT.productId]: KIT.approvedPriceUSD, [EXPLANATION_KIT.productId]: EXPLANATION_KIT.approvedPriceUSD, [COMPLETE_BUNDLE.productId]: COMPLETE_BUNDLE.approvedPriceUSD, ...Object.fromEntries(FILE_KITS.map(k => [k.productId, k.approvedPriceUSD])) };
  for (const p of PRODUCTS) {
    const dollars = Number(site.find(s => s.sku === p.sku)!.priceLabel.replace(/^\$/, ''));
    assert.ok(dollars > 0, p.name);
    assert.ok(Math.abs(approved[p.productId] - dollars) < 1, `${p.name}: ${approved[p.productId]} vs ${dollars}`);
    assert.match(String(approved[p.productId]), /\.99$/);
  }
});

test('the bundle names every website kit it delivers, counted from the website product list', () => {
  assert.equal(WEBSITE_KITS.length, 7);
  assert.deepEqual(bundleWebsiteKits(), WEBSITE_KITS.map(k => k.name));
  assert.ok(BUNDLE_OFFER.what.includes(String(WEBSITE_KITS.length)));
});

test('the bundle screen offers every kit she does not own, in the website\'s order', () => {
  const none = { creditKit: false, explanationKit: false, bundle: false, fileKits: [] as string[] };
  assert.deepEqual(otherKits(none, KIT_ORDER), KIT_ORDER);
  assert.deepEqual(otherKits({ ...none, creditKit: true }, KIT_ORDER), KIT_ORDER.filter(id => id !== KIT.productId));
  assert.deepEqual(otherKits({ ...none, explanationKit: true }, KIT_ORDER), KIT_ORDER.filter(id => id !== EXPLANATION_KIT.productId));
  assert.deepEqual(otherKits({ ...none, fileKits: [FILE_KITS[1].productId] }, KIT_ORDER), KIT_ORDER.filter(id => id !== FILE_KITS[1].productId));
  assert.deepEqual(otherKits({ creditKit: true, explanationKit: true, bundle: true }, KIT_ORDER), []);
});

test('the kit screen says it also unlocks the website kit of the same name, with the website\'s own figures', () => {
  const site = websiteKit('credit-letter-kit')!;
  const text = websiteDifference(CREDIT_KIT.id);
  assert.ok(text.includes(site.name) && text.includes(String(site.documents)));
  assert.ok(text.includes(String(CREDIT_KIT.letters.length)));
  assert.match(text, /PDF guide and an editable Word file/);
  assert.match(text, /does not appear in this app/);
  assert.match(websiteDifference(EXPLANATION_KIT_OFFER.id), /does not appear in this app/);
});

test('Restore a purchase checks the bundle and the kits itself, and says what it found', async () => {
  const calls: string[] = [];
  const deps = (bundle: boolean, kits: boolean) => ({
    provider: async () => ({}) as never, account: async () => ({}) as never,
    restoreBundle: async () => { calls.push('bundle'); return bundle; },
    restoreKit: async () => { calls.push('kits'); return kits; },
    saveKit: async () => true, installBundle: async () => {},
  });
  assert.equal(await restoreAll(deps(true, false)), 'bundle');
  assert.deepEqual(calls.splice(0), ['bundle']);
  assert.equal(await restoreAll(deps(false, true)), 'kits');
  assert.deepEqual(calls.splice(0), ['bundle', 'kits']);
  assert.equal(await restoreAll(deps(false, false)), 'none');
  // A failure never shows a code, and never suggests buying again.
  for (const preview of [false, true]) for (const result of ['none', Error('STORE_ACCOUNTS_NOT_READY'), Error('KIT_RESTORE_PARTIAL')] as const) {
    const said = restoreMessage(result, preview);
    assert.doesNotMatch(said, /[A-Z]{4,}_|undefined/);
    assert.ok(said.length > 20);
  }
  assert.notEqual(restoreMessage('none', false), restoreMessage('none', true));
});
