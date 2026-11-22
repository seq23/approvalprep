// ApprovalPrep's Google Play one-time products, as a catalog for the shared tool in seq-bin
// (~/bin/play-products, which creates, activates and reads back; how it decides and what it never does
// is in its header). Built from the app's own code: the product list is the RevenueCat catalog
// (scripts/revenuecat/setup.ts, from src/kit.ts and src/lib/appUpgrade.mjs), the prices are the approved
// USD prices in that same code, and the titles and descriptions are the ones the app's screens use.
// Dry run, then --apply (docs: store/google-play/play-console.md):
//   cd ~/GitHub/boss-os && npm run -s vault:run -- ~/bin/play-products ~/GitHub/approvalprep/apps/mobile/scripts/store/play-products.mjs
import { catalog as revenuecat } from '../revenuecat/setup.ts';
import { COMPLETE_BUNDLE, UPGRADE_TIERS, ALL_KIT_IDS, isUpgrade, kitPrice, upgradeFor } from '../../src/kit.ts';
import { PRODUCTS, BUNDLE_LINE, productName } from '../../src/offers.ts';

/** The approved USD price for a product id, or null when the code has none (a NAMED STOP for that product). */
export function priceFor(id) {
  if (id === COMPLETE_BUNDLE.productId) return COMPLETE_BUNDLE.approvedPriceUSD;
  if (isUpgrade(id)) return UPGRADE_TIERS.find(t => t.id === id)?.price ?? null;
  return kitPrice(id) || null;
}
// No price in the text: Play shows it in the buyer's own currency, and a dollar figure here would be
// wrong in every other region.
function describe(id) {
  if (id === COMPLETE_BUNDLE.productId) return `${BUNDLE_LINE}: both letter kits and every kit's PDF guide and editable Word files.`;
  if (isUpgrade(id)) return 'The rest of the Complete Bundle, for owners of one or more kits. Paid once.';
  const what = PRODUCTS.find(p => p.productId === id)?.what;
  return what ? `${what[0].toUpperCase()}${what.slice(1)}. Paid once.` : '';
}

/** Every set of kits a buyer can own, grouped by the upgrade tier the app offers her for it. */
export function kitSetsByTier() {
  const sets = new Map();
  for (let mask = 1; mask < 1 << ALL_KIT_IDS.length; mask++) {
    const set = ALL_KIT_IDS.filter((_, i) => mask & (1 << i));
    const tier = upgradeFor(set)?.tier;
    if (tier) sets.set(tier.id, [...(sets.get(tier.id) ?? []), set]);
  }
  return sets;
}
const sets = kitSetsByTier();

export const catalog = {
  app: 'ApprovalPrep', packageName: revenuecat.bundleId,
  products: revenuecat.products.map(p => ({
    id: p.id, title: productName(p.id), description: describe(p.id), priceUsd: priceFor(p.id),
    // The owner rule (appUpgrade.mjs): nobody pays more in total than the bundle, in any region. Play
    // converts each price on its own, so the tool caps each upgrade per region against every kit set
    // that leads to it.
    ...(isUpgrade(p.id) ? { ceiling: { whole: COMPLETE_BUNDLE.productId, parts: sets.get(p.id) ?? [] } } : {}),
  })),
};
