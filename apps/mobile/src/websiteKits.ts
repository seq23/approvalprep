// The kits sold on approvalprep.com, read from the website's own product list so a name, a price
// or a count here can never drift from the site. Names, prices and counts only: these are the
// public facts on the pricing page. No kit wording is in this file or in the app.
import catalog from '../../../data/products/products.json';
interface WebsiteProduct { sku: string; name: string; priceLabel: string; status: string; stripe_enabled?: boolean; included_offerings?: string[] }
const paid = (catalog.products as WebsiteProduct[]).filter(p => p.status === 'active_paid' && p.stripe_enabled);
const BUNDLE_SKU = 'complete-approvalprep-bundle';
export interface WebsiteKit { sku: string; name: string; price: string; documents: number }
export const WEBSITE_KITS: WebsiteKit[] = paid.filter(p => p.sku !== BUNDLE_SKU)
  .map(p => ({ sku: p.sku, name: p.name, price: p.priceLabel, documents: (p.included_offerings ?? []).length }));
export const websiteKit = (sku: string) => WEBSITE_KITS.find(k => k.sku === sku) ?? null;
/** The two website kits that share a name with a kit sold inside the app. */
export const SOLD_IN_APP = ['credit-letter-kit', 'letter-of-explanation'];
