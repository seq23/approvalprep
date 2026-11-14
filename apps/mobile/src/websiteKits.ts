// The kits sold on approvalprep.com, read from the website's own product list so a name, a price,
// a count or the order here can never drift from the site (the home page's product grid renders
// this same list, in this order). Names, prices, counts and document names only: these are the
// public facts on the pricing and kit pages. No kit wording is in this file or in the app.
import catalog from '../../../data/products/products.json';
interface WebsiteProduct { sku: string; name: string; priceLabel: string; status: string; stripe_enabled?: boolean; included_offerings?: string[] }
const paid = (catalog.products as WebsiteProduct[]).filter(p => p.status === 'active_paid' && p.stripe_enabled);
export const BUNDLE_SKU = 'complete-approvalprep-bundle';
export interface WebsiteKit { sku: string; name: string; price: string; documents: number; documentNames: string[] }
const asKit = (p: WebsiteProduct): WebsiteKit => ({ sku: p.sku, name: p.name, price: p.priceLabel, documents: (p.included_offerings ?? []).length, documentNames: p.included_offerings ?? [] });
/** All eight paid products, bundle included, in the website's order. */
export const WEBSITE_PRODUCTS: WebsiteKit[] = paid.map(asKit);
export const WEBSITE_KITS: WebsiteKit[] = WEBSITE_PRODUCTS.filter(p => p.sku !== BUNDLE_SKU);
export const websiteKit = (sku: string) => WEBSITE_PRODUCTS.find(k => k.sku === sku) ?? null;
