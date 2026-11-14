import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { purchases } from './index';
import { bundleAccount } from './bundleAccount';
import { withFallbackPrices } from '../offers';
/** The store's own price strings by product id, with the approved price for any product the store did not answer for. Empty until the store answers. */
export async function storePrices(): Promise<Record<string, string>> {
  const found: Record<string, string> = {};
  const lists = await Promise.allSettled([purchases().then(p => p.products()), bundleAccount().then(a => a.products())]);
  for (const list of lists) if (list.status === 'fulfilled') for (const item of list.value) found[item.id] = item.price;
  return withFallbackPrices(found);
}
export function usePrices() {
  const [prices, setPrices] = useState<Record<string, string>>({});
  useFocusEffect(useCallback(() => {
    let active = true;
    storePrices().then(value => { if (active) setPrices(value); }).catch(() => {});
    return () => { active = false; };
  }, []));
  return prices;
}
