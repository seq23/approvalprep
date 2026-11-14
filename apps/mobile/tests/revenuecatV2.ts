// Real RevenueCat v2 replies captured 14 Nov 2026 (tests/fixtures/revenuecat at the repo root).
// The purchase item follows RevenueCat's v2 Purchase object: no real store purchase exists yet to capture.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
export const fixture = (name: string) => JSON.parse(readFileSync(join(process.cwd(), '../../tests/fixtures/revenuecat', `${name}.json`), 'utf8')) as { status: number; body: any };
export const products = fixture('v2-products').body;
export const productId = (store: string): string => products.items.find((p: any) => p.store_identifier === store && p.app_id === 'app2a93b6ae45')?.id ?? 'prod_unknown';
const buyer = '$RCAnonymousID:' + '0'.repeat(32);
export const purchase = (product: string, extra: object = {}) => ({ object: 'purchase', id: `purc_fictional_${product}`, customer_id: buyer, original_customer_id: buyer,
  product_id: productId(product), purchased_at: Date.parse('2026-11-10T16:00:00Z'), quantity: 1, status: 'owned', environment: 'production', store: 'app_store',
  store_purchase_identifier: 'fictional-transaction', ownership: 'purchased', ...extra });
/** Owned App Store purchases of each product, with any field overridden. */
export const purchases = (product: string | string[], extra: object = {}) => ([] as string[]).concat(product).map(id => purchase(id, extra));
/** A fetch that answers RevenueCat's product list with the real fixture and the buyer's purchases with `items()`. */
export const rcFetch = (items: () => unknown, status: () => number = () => 200) => async (input: unknown) =>
  String(input).includes('/products?') ? Response.json(products) : Response.json({ object: 'list', items: items(), next_page: null }, { status: status() });
