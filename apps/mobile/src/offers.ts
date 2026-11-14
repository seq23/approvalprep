// Everything the app offers, in one place, so the first screen, the letter list, the kit screens
// and the bundle screen all name the same things (hostile review, 13 Nov 2026: "idk what is being
// offered on this app"). Prices are never typed here: screens show the store's price (usePrices).
import { KIT, EXPLANATION_KIT, COMPLETE_BUNDLE, FILE_KITS, SITE_SKU, fileKitBySku, isUpgrade } from './kit';
import { LETTERS, EXPLANATION_LETTERS } from './letters';
import { situations } from './studio';
import { BUNDLE_SKU, WEBSITE_KITS, WEBSITE_PRODUCTS, websiteKit } from './websiteKits';

export const TRACKING_LINE = 'Mark as sent, the day count and a reminder on day 30';
const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
export const CREDIT_KIT = {
  id: 'credit-letter-kit', productId: KIT.productId, name: 'Credit Letter Kit',
  letters: LETTERS.filter(l => l.access === 'kit'),
  get what() { return `${count(this.letters.length, 'more credit letter')}, plus mark as sent and a day-30 reminder`; },
} as const;
export const EXPLANATION_KIT_OFFER = {
  id: 'letter-of-explanation-kit', productId: EXPLANATION_KIT.productId, name: 'Letter of Explanation Kit',
  letters: EXPLANATION_LETTERS,
  get what() { return `${count(this.letters.length, 'letter')} for a landlord, lender or employer, plus mark as sent and a day-30 reminder`; },
} as const;
export const BUNDLE_OFFER = {
  productId: COMPLETE_BUNDLE.productId, name: 'Complete ApprovalPrep Bundle',
  get what() { return `All ${WEBSITE_KITS.length} kits above, paid once.`; },
} as const;
export const KIT_OFFERS = [CREDIT_KIT, EXPLANATION_KIT_OFFER] as const;
export const kitOfferFor = (kitId: string) => kitId === EXPLANATION_KIT_OFFER.id ? EXPLANATION_KIT_OFFER : CREDIT_KIT;

/** "Credit Letter Kit · $19.99 once", or without the price until the store has answered. */
export const offerTitle = (name: string, price?: string) => price ? `${name} · ${price} once` : `${name} · paid once`;
/** A locked letter says which kit holds it and what that kit costs. */
export const lockedLine = (kitName: string, price?: string) => price ? `In the ${kitName}, ${price} once` : `In the ${kitName}, paid once`;

export const STUDIO_COUNT = situations.length;
export const FREE_LINE = `Free, as often as you like: the Letter Studio (${STUDIO_COUNT} situations) and the credit bureau dispute letter with its PDF.`;
export const PAID_ONCE_LINE = 'Each is paid once. There is no subscription.';

// The app's two letter kits also carry the website kit of the same name, as its files.
// Said once, on the kit screen, with the website's own count.
export function websiteDifference(kitId: string): string {
  const offer = kitOfferFor(kitId);
  const site = websiteKit(kitId === EXPLANATION_KIT_OFFER.id ? 'letter-of-explanation' : 'credit-letter-kit');
  const files = site ? ` It also unlocks the website's ${site.name} as files: a PDF guide and an editable Word file with its ${count(site.documents, 'document')}.` : '';
  return `In this app the ${offer.name} is the ${count(offer.letters.length, 'letter')} above, filled in here, plus tracking.${files} A kit bought on the website does not appear in this app, and a kit bought here does not appear on the website.`;
}
/** The website kits the bundle delivers as files, by name. */
export const bundleWebsiteKits = () => WEBSITE_KITS.map(k => k.name);
export const bundleFilesLine = () => `The ${WEBSITE_KITS.length} website kits as files (a PDF guide and editable Word templates for each), in one ZIP:`;

// The five website kits the app sells as files only.
export const FILE_KIT_OFFERS = FILE_KITS.map(k => {
  const site = websiteKit(k.sku)!;
  return { id: k.sku, productId: k.productId, name: site.name, documentNames: site.documentNames,
    what: `${count(site.documents, 'document')} as files: a PDF guide and an editable Word file` };
});

export type ProductScreen = '/letters/unlock' | '/letters/files' | '/letters/bundle';
export interface ProductOffer { sku: string; productId: string; name: string; what: string; screen: ProductScreen; params: Record<string, string> }
/**
 * Everything for sale, in the website's order with the website's names (her ruling 13 Nov 2026,
 * "Exact mirror"). Home and More list exactly this; tests/offers.test.ts holds it to products.json.
 */
export const PRODUCTS: ProductOffer[] = WEBSITE_PRODUCTS.map((site): ProductOffer => {
  if (site.sku === BUNDLE_SKU) return { sku: site.sku, productId: COMPLETE_BUNDLE.productId, name: site.name, what: BUNDLE_OFFER.what, screen: '/letters/bundle', params: {} };
  if (site.sku === 'credit-letter-kit') return { sku: site.sku, productId: KIT.productId, name: site.name, what: CREDIT_KIT.what, screen: '/letters/unlock', params: { kit: CREDIT_KIT.id } };
  if (site.sku === 'letter-of-explanation') return { sku: site.sku, productId: EXPLANATION_KIT.productId, name: site.name, what: EXPLANATION_KIT_OFFER.what, screen: '/letters/unlock', params: { kit: EXPLANATION_KIT_OFFER.id } };
  const file = fileKitBySku(site.sku);
  if (!file) throw Error(`NAMED STOP [WEBSITE_KIT_NOT_IN_APP] ${site.sku} is sold on the website but has no in-app product in src/kit.ts`);
  return { sku: site.sku, productId: file.productId, name: site.name, what: FILE_KIT_OFFERS.find(o => o.id === site.sku)!.what, screen: '/letters/files', params: { kit: site.sku } };
});
/** Single kits only, in the website's order. */
export const KIT_ORDER = PRODUCTS.filter(p => p.productId !== COMPLETE_BUNDLE.productId).map(p => p.productId);
export function productName(id: string): string {
  if (isUpgrade(id)) return 'Complete Bundle upgrade';
  return PRODUCTS.find(p => p.productId === id)?.name ?? id;
}
export function productRoute(id: string): { pathname: ProductScreen; params: Record<string, string> } {
  if (isUpgrade(id)) return { pathname: '/letters/bundle', params: {} };
  const p = PRODUCTS.find(x => x.productId === id);
  if (!p) throw Error(`UNKNOWN_PRODUCT ${id}`);
  return { pathname: p.screen, params: p.params };
}
/** "Get the other 6 kits for $34.99 (you’ve already paid $14.99)". */
export const upgradeLine = (otherKits: number, price: string, paid: number) =>
  `Get the other ${count(otherKits, 'kit')} for ${price} (you’ve already paid $${paid.toFixed(2)})`;
/** The bundle, said the same way on every screen. */
export const BUNDLE_LINE = `All ${WEBSITE_KITS.length} kits, paid once`;
export const siteSkuFor = (productId: string) => SITE_SKU[productId] ?? null;
