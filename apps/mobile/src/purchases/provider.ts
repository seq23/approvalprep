import { KIT, EXPLANATION_KIT, kitPurchaseGate } from '../kit';
import { previewBuy, previewOwns } from '../previewSamples';
export interface Product { id: string; price: string; amount: number; currency: string }
export interface Entitlement { creditKit: boolean; explanationKit?: boolean }
export interface PurchasesProvider {
  readonly mode: 'mock' | 'preview' | 'store';
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
// The free web preview only (EXPO_PUBLIC_AP_PREVIEW=1, refused for a store build by the release
// gate): a pretend purchase, session-only, no store and no charge, so every kit can be tapped through.
export class PreviewPurchases implements PurchasesProvider {
  readonly mode = 'preview';
  constructor(private readonly enabled: boolean) {}
  async products() { return new MockPurchases().products(); }
  async entitlement(): Promise<Entitlement> { return { creditKit: previewOwns(KIT.productId, this.enabled), explanationKit: previewOwns(EXPLANATION_KIT.productId, this.enabled) }; }
  async purchase(id: string): Promise<Entitlement> { previewBuy(id, this.enabled); return this.entitlement(); }
  async restore() { return this.entitlement(); }
  async userId(): Promise<string> { throw Error('REVENUECAT_KEY_MISSING'); }
}
export function acceptedKey(os: string, key?: string): boolean {
  return !!key && ((os === 'ios' && key.startsWith('appl_')) || (os === 'android' && key.startsWith('goog_')));
}
// This guard lives above the provider so no caller can bypass the sales switch.
// Only the preview provider is let past the switch, and it cannot reach a store.
export async function buyKit(provider: PurchasesProvider, id: string = KIT.productId): Promise<Entitlement> {
  if (![KIT.productId, EXPLANATION_KIT.productId].includes(id as typeof KIT.productId)) throw Error('STORE_PRODUCTS_MISSING');
  if (provider instanceof PreviewPurchases) return provider.purchase(id);
  const gate = kitPurchaseGate();
  if (!gate.ok) throw Error(gate.stop);
  return provider.purchase(id);
}
