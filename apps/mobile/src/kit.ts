// The app's one-time in-app products. Her rulings: the Credit Letter Kit at $19.99 (6 Nov 2026),
// the Letter of Explanation Kit at $14.99 (10 Nov), the Complete Bundle at $49.99 with one upgrade
// for kit owners (10 Nov), and on 13 Nov 2026 "Exact mirror": every kit the website sells is sold
// here too, same name, same order, nearest store price, each unlocking the files the site delivers.
// All are non-consumable (paid once, no subscription), sold under the COMPANY store accounts.
// Switched OFF until those accounts and RevenueCat exist; she signs up for them herself.
export const KIT = { productId: 'ap_credit_kit', approvedPriceUSD: 19.99, approved: '2026-11-06' } as const;
export const KIT_SALES_ENABLED = false;
export const KIT_STOP = 'STORE_ACCOUNTS_NOT_READY';

// Buying while switched off is a named stop, never a charge or a silent no-op.
export function kitPurchaseGate(enabled: boolean = KIT_SALES_ENABLED): { ok: true } | { ok: false; stop: typeof KIT_STOP; reason: string } {
  if (enabled) return { ok: true };
  return { ok: false, stop: KIT_STOP, reason: 'The company store accounts and RevenueCat are not set up yet, so the letter kits cannot be bought.' };
}

export const EXPLANATION_KIT = { productId: 'ap_explanation_kit', approvedPriceUSD: 14.99, approved: '2026-11-10' } as const;
export const COMPLETE_BUNDLE = { productId: 'ap_complete_bundle', approvedPriceUSD: 49.99 } as const;
// One upgrade for anyone who owns any kit, whichever and however many (docs/APP_PLAN.md, "Bundle upgrade").
export const BUNDLE_UPGRADE = { productId: 'ap_bundle_upgrade', approvedPriceUSD: 29.99 } as const;

// The five website kits that are files only in the app (the website's PDF guide and editable Word
// file), keyed by the website's own sku. Nearest store price to the website's price.
export const FILE_KITS = [
  { sku: 'income-employment-letter-kit', productId: 'ap_income_employment_kit', approvedPriceUSD: 19.99, approved: '2026-11-13' },
  { sku: 'rental-application-kit', productId: 'ap_rental_application_kit', approvedPriceUSD: 29.99, approved: '2026-11-13' },
  { sku: 'loan-prep-letter-kit', productId: 'ap_loan_prep_kit', approvedPriceUSD: 29.99, approved: '2026-11-13' },
  { sku: 'business-funding-prep-kit', productId: 'ap_business_funding_kit', approvedPriceUSD: 39.99, approved: '2026-11-13' },
  { sku: 'life-admin-letter-kit', productId: 'ap_life_admin_kit', approvedPriceUSD: 19.99, approved: '2026-11-13' },
] as const;
export type FileKitProductId = (typeof FILE_KITS)[number]['productId'];
export const FILE_KIT_IDS: readonly string[] = FILE_KITS.map(k => k.productId);
export const fileKitBySku = (sku: string) => FILE_KITS.find(k => k.sku === sku) ?? null;
export const fileKitByProduct = (id: string) => FILE_KITS.find(k => k.productId === id) ?? null;

// Each kit's product id → the website sku whose PDF and Word file it unlocks.
export const SITE_SKU: Record<string, string> = {
  [KIT.productId]: 'credit-letter-kit',
  [EXPLANATION_KIT.productId]: 'letter-of-explanation',
  ...Object.fromEntries(FILE_KITS.map(k => [k.productId, k.sku])),
};
/** Every single kit, in no particular order (screens use the website's order from src/offers.ts). */
export const ALL_KIT_IDS: readonly string[] = Object.keys(SITE_SKU);
