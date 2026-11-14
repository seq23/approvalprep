// The phone app's Complete Bundle upgrade (owner rule, 13 Nov 2026): nobody ever pays more in total
// than the $49.99 bundle. A kit owner's upgrade is $49.99 minus what her kits cost, rounded DOWN to one
// of a few fixed store price tiers; once her kits add up to $49.99 (or less than the smallest tier is
// left), the rest unlocks free with no purchase. Shared by the app (offers, ownership) and the server
// (functions/_runtime/app-bundle.js), so both apply the same rule. The website has no kit-owner upgrade.
export const BUNDLE_PRODUCT = 'ap_complete_bundle';
export const BUNDLE_PRICE = 49.99;
/** The app's seven single kits and their approved store prices. */
export const KIT_PRICES = {
  ap_explanation_kit: 14.99,
  ap_income_employment_kit: 19.99,
  ap_credit_kit: 19.99,
  ap_rental_application_kit: 29.99,
  ap_loan_prep_kit: 29.99,
  ap_business_funding_kit: 39.99,
  ap_life_admin_kit: 19.99,
};
/** Fixed one-time upgrade products, highest first. `ap_bundle_upgrade` keeps its original id. */
export const UPGRADE_TIERS = [
  { id: 'ap_bundle_upgrade_3499', price: 34.99 },
  { id: 'ap_bundle_upgrade', price: 29.99 },
  { id: 'ap_bundle_upgrade_1999', price: 19.99 },
  { id: 'ap_bundle_upgrade_1499', price: 14.99 },
  { id: 'ap_bundle_upgrade_999', price: 9.99 },
  { id: 'ap_bundle_upgrade_499', price: 4.99 },
];
export const UPGRADE_IDS = UPGRADE_TIERS.map(t => t.id);
export const isUpgrade = id => UPGRADE_IDS.includes(id);
const cents = n => Math.round(n * 100);
/** What her kits cost, in dollars (two decimals). Unknown ids count for nothing. */
export function paidFor(kitIds) {
  return [...new Set(kitIds)].reduce((sum, id) => sum + cents(KIT_PRICES[id] ?? 0), 0) / 100;
}
/**
 * null when she owns no kit (the full bundle is her offer). Otherwise { paid, free, tier }:
 * free when nothing at or above the smallest tier is left to pay; else the highest tier not above
 * what is left.
 */
export function upgradeFor(kitIds) {
  const owned = [...new Set(kitIds)].filter(id => id in KIT_PRICES);
  if (!owned.length) return null;
  const paid = paidFor(owned);
  const left = cents(BUNDLE_PRICE) - cents(paid);
  const tier = left > 0 ? UPGRADE_TIERS.find(t => cents(t.price) <= left) ?? null : null;
  return { paid, free: !tier, tier };
}
/**
 * The bundle is hers when she bought it, when her kits already cover it, or when she bought an
 * upgrade at least as high as the tier her kits call for. A lower or kitless upgrade opens nothing.
 */
export function bundleUnlocked({ kits = [], upgrades = [], bundle = false }) {
  if (bundle) return true;
  const offer = upgradeFor(kits);
  if (!offer) return false;
  if (offer.free) return true;
  const best = Math.max(0, ...upgrades.filter(isUpgrade).map(id => cents(UPGRADE_TIERS.find(t => t.id === id).price)));
  return best >= cents(offer.tier.price);
}
