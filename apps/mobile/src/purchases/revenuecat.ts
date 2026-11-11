import Purchases, { type CustomerInfo, type PurchasesStoreProduct, PRODUCT_CATEGORY } from 'react-native-purchases';
import { KIT, EXPLANATION_KIT, kitPurchaseGate } from '../kit';
import type { Entitlement, PurchasesProvider } from './provider';
const entitlement = (info: CustomerInfo): Entitlement => ({ explanationKit: info.entitlements.active[EXPLANATION_KIT.productId]?.productIdentifier === EXPLANATION_KIT.productId, creditKit: info.entitlements.active[KIT.productId]?.productIdentifier === KIT.productId });
export class RevenueCat implements PurchasesProvider {
  readonly mode = 'store';
  constructor(key: string) { Purchases.configure({ apiKey: key, diagnosticsEnabled: false, automaticDeviceIdentifierCollectionEnabled: false }); }
  private async product(id: string = KIT.productId): Promise<PurchasesStoreProduct> {
    const products = await Purchases.getProducts([id], PRODUCT_CATEGORY.NON_SUBSCRIPTION);
    const product = products.find(p => p.identifier === id && p.subscriptionPeriod === null);
    if (!product) throw Error('STORE_PRODUCTS_MISSING');
    return product;
  }
  async products() { return Promise.all([KIT.productId, EXPLANATION_KIT.productId].map(async id => { const p = await this.product(id); return { id: p.identifier, price: p.priceString, amount: p.price, currency: p.currencyCode }; })); }
  async entitlement() { return entitlement(await Purchases.getCustomerInfo()); }
  async purchase(id: string) {
    const gate = kitPurchaseGate();
    if (!gate.ok) throw Error(gate.stop);
    if (id !== KIT.productId && id !== EXPLANATION_KIT.productId) throw Error('STORE_PRODUCTS_MISSING');
    return entitlement((await Purchases.purchaseStoreProduct(await this.product(id))).customerInfo);
  }
  async restore() { return entitlement(await Purchases.restorePurchases()); }
  async userId() { return Purchases.getAppUserID(); }
}
