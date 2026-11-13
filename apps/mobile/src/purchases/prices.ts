import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { purchases } from './index';
import { bundleAccount } from './bundleAccount';
/** The store's own prices by product id. Empty until the store answers; a screen then says "paid once" without a figure. */
export async function storePrices(): Promise<Record<string, string>> {
  const found: Record<string, string> = {};
  const lists = await Promise.allSettled([purchases().then(p => p.products()), bundleAccount().then(a => a.products())]);
  for (const list of lists) if (list.status === 'fulfilled') for (const item of list.value) found[item.id] = item.price;
  return found;
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
