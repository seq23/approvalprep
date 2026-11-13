// Everything the app offers, in one place, so the first screen, the letter list, the kit screens
// and the bundle screen all name the same things (hostile review, 13 Nov 2026: "idk what is being
// offered on this app"). Prices are never typed here: screens show the store's price (usePrices).
import { KIT, EXPLANATION_KIT, COMPLETE_BUNDLE } from './kit';
import { LETTERS, EXPLANATION_LETTERS } from './letters';
import { situations } from './studio';
import { WEBSITE_KITS, websiteKit } from './websiteKits';

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
  get what() { return `Both kits, plus the ${WEBSITE_KITS.length} website kits as files`; },
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

// The app's Credit Letter Kit and the website's kit of the same name are different products.
// Said once, on the kit screen, with the website's own count and price.
export function websiteDifference(kitId: string): string {
  const offer = kitOfferFor(kitId);
  const site = websiteKit(kitId === EXPLANATION_KIT_OFFER.id ? 'letter-of-explanation' : 'credit-letter-kit');
  const same = site ? `On approvalprep.com the ${site.name} is a different product: ${count(site.documents, 'document')} you download, for ${site.price}. ` : '';
  return `${same}In this app the ${offer.name} is the ${count(offer.letters.length, 'letter')} above plus tracking. A kit bought on the website does not appear in this app, and a kit bought here does not appear on the website.`;
}
/** The website kits the bundle delivers as files, by name. */
export const bundleWebsiteKits = () => WEBSITE_KITS.map(k => k.name);
export const bundleFilesLine = () => `The ${WEBSITE_KITS.length} website kits as files (a PDF guide and editable Word templates for each), in one ZIP:`;
/** A website kit the app does not sell on its own: where it can be had, said plainly. */
export const notSoldHere = (kitName: string) => `The ${kitName} is not sold on its own in this app. It comes as files (a PDF guide and editable Word templates) inside the ${BUNDLE_OFFER.name}, or on its own at approvalprep.com.`;
