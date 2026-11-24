// ApprovalPrep's RevenueCat setup, built from the app's own product code (src/kit.ts and the shared
// src/lib/appUpgrade.mjs), so the dashboard can never drift from what the app sells.
// The shared tool in seq-bin (~/bin/revenuecat-setup) reads this catalog, sets RevenueCat up and reads it
// back; how to run it and what each flag does is in its header. Remaining store-side steps: docs/APP_PLAN.md.
//   cd ~/GitHub/boss-os && npm run -s vault:run -- ~/bin/revenuecat-setup ~/GitHub/approvalprep/apps/mobile/scripts/revenuecat/setup.ts
import { KIT, EXPLANATION_KIT, COMPLETE_BUNDLE, FILE_KITS, UPGRADE_TIERS, ALL_KIT_IDS } from '../../src/kit';

const usd = (n: number) => `$${n.toFixed(2)}`;
const products = [
  { id: COMPLETE_BUNDLE.productId, kind: 'non_consumable', name: `Complete Bundle ${usd(COMPLETE_BUNDLE.approvedPriceUSD)}` },
  { id: KIT.productId, kind: 'non_consumable', name: `Credit Letter Kit ${usd(KIT.approvedPriceUSD)}` },
  { id: EXPLANATION_KIT.productId, kind: 'non_consumable', name: `Letter of Explanation Kit ${usd(EXPLANATION_KIT.approvedPriceUSD)}` },
  ...FILE_KITS.map(k => ({ id: k.productId, kind: 'non_consumable', name: `${k.sku} ${usd(k.approvedPriceUSD)}` })),
  ...UPGRADE_TIERS.map(t => ({ id: t.id, kind: 'non_consumable', name: `Bundle upgrade ${usd(t.price)}` })),
];

export const catalog = {
  app: 'ApprovalPrep', projectName: 'ApprovalPrep', vaultPrefix: 'AP', secretEnv: 'REVENUECAT_AP_V2_SECRET_KEY',
  bundleId: 'com.approvalprep.app', // apps/mobile/app.config.ts (iOS bundle id = Android package)
  products,
  // The app reads ownership as entitlements.active[<product id>] (src/purchases/bundleOffers.ts ownershipFrom).
  entitlements: products.map(p => ({ key: p.id, name: p.name, products: [p.id] })),
  // The bundle first, then the single kits, then the upgrade tiers (offersFor / otherKits order).
  offerings: [{ key: 'default', name: 'Kits', current: true, packages: products.map(p => p.id) }],
};

if (products.length !== 1 + ALL_KIT_IDS.length + UPGRADE_TIERS.length) throw Error('catalog does not cover every kit');
