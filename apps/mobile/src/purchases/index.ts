import { Platform } from 'react-native';
import { acceptedKey, MockPurchases, PreviewPurchases, type PurchasesProvider } from './provider';
import { PREVIEW_ENABLED } from '../previewSamples';
let opening: Promise<PurchasesProvider> | undefined;
export function purchases(): Promise<PurchasesProvider> {
  if (!opening) opening = (async () => {
    const key = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_AP_REVENUECAT_IOS_KEY : process.env.EXPO_PUBLIC_AP_REVENUECAT_ANDROID_KEY;
    if (PREVIEW_ENABLED) return new PreviewPurchases(true);
    if (!acceptedKey(Platform.OS, key)) return new MockPurchases();
    const { RevenueCat } = await import('./revenuecat');
    return new RevenueCat(key!);
  })().catch(error => { opening = undefined; throw error; });
  return opening;
}
