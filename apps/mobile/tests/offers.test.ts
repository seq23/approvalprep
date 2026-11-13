// Hostile review, 13 Nov 2026: "idk what is being offered on this app". Every screen names the same
// offers from one list, a locked letter names its kit and price, and Restore does what it says.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUNDLE_OFFER, CREDIT_KIT, EXPLANATION_KIT_OFFER, KIT_OFFERS, bundleWebsiteKits, kitOfferFor, lockedLine, notSoldHere, offerTitle, websiteDifference } from '../src/offers';
import { WEBSITE_KITS, websiteKit } from '../src/websiteKits';
import { LETTERS, EXPLANATION_LETTERS } from '../src/letters';
import { kitForKind, kindsForKit } from '../src/kitTemplates';
import { otherKits } from '../src/purchases/bundleOffers';
import { KIT, EXPLANATION_KIT } from '../src/kit';
import { situations, studioDraft } from '../src/studio';
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

test('the bundle names every website kit it delivers, counted from the website product list', () => {
  assert.ok(WEBSITE_KITS.length >= 5);
  assert.deepEqual(bundleWebsiteKits(), WEBSITE_KITS.map(k => k.name));
  assert.ok(BUNDLE_OFFER.what.includes(String(WEBSITE_KITS.length)));
  // A kit the Studio recommends but the app does not sell on its own is named on the bundle screen.
  for (const s of situations) {
    const draft = studioDraft(s.id, {});
    if (draft.kitRoute.pathname !== '/letters/bundle') continue;
    assert.ok(bundleWebsiteKits().includes(draft.kitName), `${draft.kitName} is offered by the Studio but not named in the bundle`);
    assert.ok(notSoldHere(draft.kitName).includes(BUNDLE_OFFER.name));
  }
});

test('the bundle screen offers both kits until one is owned', () => {
  const none = { creditKit: false, explanationKit: false, bundle: false };
  assert.deepEqual(otherKits(none), [KIT.productId, EXPLANATION_KIT.productId]);
  assert.deepEqual(otherKits({ ...none, creditKit: true }), [EXPLANATION_KIT.productId]);
  assert.deepEqual(otherKits({ ...none, explanationKit: true }), [KIT.productId]);
  assert.deepEqual(otherKits({ creditKit: true, explanationKit: true, bundle: true }), []);
});

test('the kit screen says how it differs from the website kit of the same name, with the website\'s own figures', () => {
  const site = websiteKit('credit-letter-kit')!;
  const text = websiteDifference(CREDIT_KIT.id);
  assert.ok(text.includes(site.price) && text.includes(String(site.documents)));
  assert.ok(text.includes(String(CREDIT_KIT.letters.length)));
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
