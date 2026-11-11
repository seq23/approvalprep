import { Platform } from 'react-native';
import { KIT, COMPLETE_BUNDLE, BUNDLE_UPGRADE, kitPurchaseGate } from '../kit';
import { EXPLANATION_PRODUCT, NO_OWNERSHIP, offersFor, ownershipFrom, type BundleOwnership, type OfferId } from './bundleOffers';
export interface BundlePrice { id: string; price: string }
export interface BundlePurchases {
  mock: boolean;
  products(): Promise<BundlePrice[]>;
  ownership(): Promise<BundleOwnership>;
  restore(): Promise<BundleOwnership>;
  buy(id: OfferId): Promise<void>;
  userId(): Promise<string>;
}
let opening: Promise<BundlePurchases> | undefined;
export function bundleAccount(): Promise<BundlePurchases> {
  if (!opening) opening = open().catch(error => { opening = undefined; throw error; });
  return opening;
}
async function open(): Promise<BundlePurchases> {
  const key = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_AP_REVENUECAT_IOS_KEY : process.env.EXPO_PUBLIC_AP_REVENUECAT_ANDROID_KEY;
  const accepted = !!key && (Platform.OS === 'ios' ? key.startsWith('appl_') : Platform.OS === 'android' && key.startsWith('goog_'));
  if (process.env.EXPO_PUBLIC_AP_PREVIEW === '1' || !accepted) {
    return { mock: true, products: async () => [
      { id: COMPLETE_BUNDLE.productId, price: '$49.99' }, { id: BUNDLE_UPGRADE.productId, price: '$29.99' },
    ], ownership: async () => NO_OWNERSHIP, restore: async () => NO_OWNERSHIP,
    buy: async () => { const gate = kitPurchaseGate(); throw Error(gate.ok ? 'REVENUECAT_KEY_MISSING' : gate.stop); },
    userId: async () => { throw Error('REVENUECAT_KEY_MISSING'); } };
  }
  const { default: Purchases, PRODUCT_CATEGORY } = await import('react-native-purchases');
  if (!await Purchases.isConfigured()) Purchases.configure({ apiKey: key!, diagnosticsEnabled: false, automaticDeviceIdentifierCollectionEnabled: false });
  const ownership = async () => ownershipFrom((await Purchases.getCustomerInfo()).entitlements.active);
  return {
    mock: false,
    products: async () => (await Purchases.getProducts([KIT.productId, EXPLANATION_PRODUCT, COMPLETE_BUNDLE.productId, BUNDLE_UPGRADE.productId], PRODUCT_CATEGORY.NON_SUBSCRIPTION)).filter(p => p.subscriptionPeriod === null).map(p => ({ id: p.identifier, price: p.priceString })),
    ownership, restore: async () => ownershipFrom((await Purchases.restorePurchases()).entitlements.active), userId: () => Purchases.getAppUserID(),
    buy: async id => {
      const gate = kitPurchaseGate();
      if (!gate.ok) throw Error(gate.stop);
      if (![COMPLETE_BUNDLE.productId, BUNDLE_UPGRADE.productId].includes(id as typeof COMPLETE_BUNDLE.productId)) throw Error('STORE_PRODUCTS_MISSING');
      if (!offersFor(await ownership()).includes(id)) throw Error('OFFER_NOT_AVAILABLE');
      const product = (await Purchases.getProducts([id], PRODUCT_CATEGORY.NON_SUBSCRIPTION)).find(p => p.identifier === id && p.subscriptionPeriod === null);
      if (!product) throw Error('STORE_PRODUCTS_MISSING');
      await Purchases.purchaseStoreProduct(product);
    },
  };
}
