import { Platform } from 'react-native';
import { KIT, COMPLETE_BUNDLE, FILE_KITS, FILE_KIT_IDS, UPGRADE_IDS, UPGRADE_TIERS, kitPurchaseGate } from '../kit';
import { EXPLANATION_PRODUCT, NO_OWNERSHIP, offersFor, ownershipFrom, type BundleOwnership, type OfferId } from './bundleOffers';
import { PREVIEW_ENABLED, previewBuy, previewOwns, previewBundle } from '../previewSamples';
// The bundle, its upgrade and the five file-only kits are bought through this account.
const SOLD_HERE = [COMPLETE_BUNDLE.productId, ...UPGRADE_IDS, ...FILE_KIT_IDS];
/** Labelled preview prices: the approved prices, shown only where no store exists. */
const PREVIEW_PRICES: BundlePrice[] = [
  { id: COMPLETE_BUNDLE.productId, price: `$${COMPLETE_BUNDLE.approvedPriceUSD}` },
  ...UPGRADE_TIERS.map(t => ({ id: t.id, price: `$${t.price}` })),
  ...FILE_KITS.map(k => ({ id: k.productId, price: `$${k.approvedPriceUSD}` })),
];
/** What the web preview's pretend purchases add up to. */
export function previewOwnership(): BundleOwnership {
  const bundle = previewBundle();
  return { bundle, creditKit: previewOwns(KIT.productId), explanationKit: previewOwns(EXPLANATION_PRODUCT), fileKits: FILE_KIT_IDS.filter(id => previewOwns(id)) };
}
export interface BundlePrice { id: string; price: string }
export interface BundlePurchases {
  mock: boolean;
  /** The free web preview: purchases are pretend, session-only and never reach a store. */
  preview?: boolean;
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
  if (PREVIEW_ENABLED) {
    return { mock: true, preview: true, products: async () => PREVIEW_PRICES, ownership: async () => previewOwnership(), restore: async () => previewOwnership(),
      buy: async id => { if (!SOLD_HERE.includes(id) || !offersFor(previewOwnership(), id).includes(id)) throw Error('OFFER_NOT_AVAILABLE'); previewBuy(id); },
      userId: async () => { throw Error('REVENUECAT_KEY_MISSING'); } };
  }
  if (!accepted) {
    return { mock: true, products: async () => PREVIEW_PRICES.slice(0, 1 + UPGRADE_TIERS.length), ownership: async () => NO_OWNERSHIP, restore: async () => NO_OWNERSHIP,
    buy: async () => { const gate = kitPurchaseGate(); throw Error(gate.ok ? 'REVENUECAT_KEY_MISSING' : gate.stop); },
    userId: async () => { throw Error('REVENUECAT_KEY_MISSING'); } };
  }
  const { default: Purchases, PRODUCT_CATEGORY } = await import('react-native-purchases');
  if (!await Purchases.isConfigured()) Purchases.configure({ apiKey: key!, diagnosticsEnabled: false, automaticDeviceIdentifierCollectionEnabled: false });
  const ownership = async () => ownershipFrom((await Purchases.getCustomerInfo()).entitlements.active);
  return {
    mock: false,
    products: async () => (await Purchases.getProducts([KIT.productId, EXPLANATION_PRODUCT, ...SOLD_HERE], PRODUCT_CATEGORY.NON_SUBSCRIPTION)).filter(p => p.subscriptionPeriod === null).map(p => ({ id: p.identifier, price: p.priceString })),
    ownership, restore: async () => ownershipFrom((await Purchases.restorePurchases()).entitlements.active), userId: () => Purchases.getAppUserID(),
    buy: async id => {
      const gate = kitPurchaseGate();
      if (!gate.ok) throw Error(gate.stop);
      if (!SOLD_HERE.includes(id)) throw Error('STORE_PRODUCTS_MISSING');
      if (!offersFor(await ownership(), id).includes(id)) throw Error('OFFER_NOT_AVAILABLE');
      const product = (await Purchases.getProducts([id], PRODUCT_CATEGORY.NON_SUBSCRIPTION)).find(p => p.identifier === id && p.subscriptionPeriod === null);
      if (!product) throw Error('STORE_PRODUCTS_MISSING');
      await Purchases.purchaseStoreProduct(product);
    },
  };
}
