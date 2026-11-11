import { KIT, EXPLANATION_KIT, kitPurchaseGate } from '../kit';
export interface Product { id: string; price: string; amount: number; currency: string }
export interface Entitlement { creditKit: boolean; explanationKit?: boolean }
export interface PurchasesProvider {
  readonly mode: 'mock' | 'store';
  products(): Promise<Product[]>;
  entitlement(): Promise<Entitlement>;
  purchase(id: string): Promise<Entitlement>;
  restore(): Promise<Entitlement>;
  userId(): Promise<string>;
}
export class MockPurchases implements PurchasesProvider {
  readonly mode = 'mock';
  async products() { return [{ id: KIT.productId, price: '$19.99', amount: KIT.approvedPriceUSD, currency: 'USD' }, { id: EXPLANATION_KIT.productId, price: '$14.99', amount: EXPLANATION_KIT.approvedPriceUSD, currency: 'USD' }]; }
  async entitlement() { return { creditKit: false }; }
  async purchase(_id: string): Promise<Entitlement> { throw Error('REVENUECAT_KEY_MISSING'); }
  async restore() { return { creditKit: false }; }
  async userId(): Promise<string> { throw Error('REVENUECAT_KEY_MISSING'); }
}
export function acceptedKey(os: string, key?: string): boolean {
  return !!key && ((os === 'ios' && key.startsWith('appl_')) || (os === 'android' && key.startsWith('goog_')));
}
// This guard lives above the provider so no caller can bypass the sales switch.
export async function buyKit(provider: PurchasesProvider, id: string = KIT.productId): Promise<Entitlement> {
  const gate = kitPurchaseGate();
  if (!gate.ok) throw Error(gate.stop);
  if (![KIT.productId, EXPLANATION_KIT.productId].includes(id as typeof KIT.productId)) throw Error('STORE_PRODUCTS_MISSING');
  return provider.purchase(id);
}
