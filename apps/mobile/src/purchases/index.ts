import { Platform } from 'react-native';
import { acceptedKey, MockPurchases, type PurchasesProvider } from './provider';
let opening: Promise<PurchasesProvider> | undefined;
export function purchases(): Promise<PurchasesProvider> {
  if (!opening) opening = (async () => {
    const key = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_AP_REVENUECAT_IOS_KEY : process.env.EXPO_PUBLIC_AP_REVENUECAT_ANDROID_KEY;
    if (process.env.EXPO_PUBLIC_AP_PREVIEW === '1' || !acceptedKey(Platform.OS, key)) return new MockPurchases();
    const { RevenueCat } = await import('./revenuecat');
    return new RevenueCat(key!);
  })().catch(error => { opening = undefined; throw error; });
  return opening;
}
