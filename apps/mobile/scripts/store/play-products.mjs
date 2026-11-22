// ApprovalPrep's Google Play one-time products, built from the app's own code: the product list is the
// RevenueCat catalog (scripts/revenuecat/setup.ts, from src/kit.ts and src/lib/appUpgrade.mjs), the
// prices are the approved USD prices in that same code, and the titles and descriptions are the ones
// the app's screens use (src/offers.ts). How it decides and what it never does: play-engine.mjs.
// Dry run (reads Play, changes nothing):
//   cd ~/GitHub/boss-os && npm run -s vault:run -- npx --prefix ~/GitHub/approvalprep/apps/mobile tsx ~/GitHub/approvalprep/apps/mobile/scripts/store/play-products.mjs
// Add --apply to create and activate what is missing. Docs: store/google-play/play-console.md.
import { fileURLToPath } from 'node:url';
import { catalog as revenuecat } from '../revenuecat/setup.ts';
import { COMPLETE_BUNDLE, UPGRADE_TIERS, isUpgrade, kitPrice } from '../../src/kit.ts';
import { PRODUCTS, BUNDLE_LINE, productName } from '../../src/offers.ts';
// @ts-ignore shared website module is JavaScript
import { BUNDLE_PRICE } from '../../../../src/lib/appUpgrade.mjs';
// @ts-ignore shared website module is JavaScript
import { serviceAccountAccessToken } from '../../../../scripts/intelligence/_lib.mjs';
import { run } from './play-engine.mjs';

/** The approved USD price for a product id, or null when the code has none (a NAMED STOP for that product). */
export function priceFor(id) {
  if (id === COMPLETE_BUNDLE.productId) return COMPLETE_BUNDLE.approvedPriceUSD;
  if (isUpgrade(id)) return UPGRADE_TIERS.find(t => t.id === id)?.price ?? null;
  return kitPrice(id) || null;
}
function describe(id) {
  if (id === COMPLETE_BUNDLE.productId) return `${BUNDLE_LINE}: both letter kits and every kit's PDF guide and editable Word files.`;
  if (isUpgrade(id)) return `The rest of the Complete Bundle for kit owners, priced so the total never passes $${BUNDLE_PRICE.toFixed(2)}. Paid once.`;
  const what = PRODUCTS.find(p => p.productId === id)?.what;
  return what ? `${what[0].toUpperCase()}${what.slice(1)}. Paid once.` : '';
}

export const catalog = {
  app: 'ApprovalPrep', packageName: revenuecat.bundleId,
  products: revenuecat.products.map(p => ({ id: p.id, title: productName(p.id), description: describe(p.id), priceUsd: priceFor(p.id) })),
};

async function getToken() {
  const raw = process.env.GOOGLE_PLAY_UPLOAD_SA_JSON;
  if (!raw) return '';
  return serviceAccountAccessToken(JSON.parse(raw), 'https://www.googleapis.com/auth/androidpublisher');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) run(catalog, { getToken }).then(code => { process.exitCode = code; });
