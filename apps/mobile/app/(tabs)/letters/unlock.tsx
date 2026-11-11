import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Text } from 'react-native';
import { Button, Screen, Sheet } from '../../../src/ui';
import { type } from '../../../src/theme';
import { HONEST_LIMIT } from '../../../src/copy';
import { KIT, KIT_SALES_ENABLED } from '../../../src/kit';
import { LETTERS } from '../../../src/letters';
import { loadDeliveredKit, saveDeliveredKit } from '../../../src/kitTemplates';
import { purchases } from '../../../src/purchases';
import { buyKit, type Product } from '../../../src/purchases/provider';
import { restoreKit } from '../../../src/purchases/delivery';
export default function Unlock() {
  const [product, setProduct] = useState<Product | null>(null);
  const [mock, setMock] = useState(false);
  const [owned, setOwned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const kit = await loadDeliveredKit();
      if (!active) return;
      setOwned(!!kit); setMessage('');
      if (kit) { setProduct(null); return; }
      const provider = await purchases();
      const products = await provider.products();
      if (active) { setProduct(products.find(p => p.id === KIT.productId) ?? null); setMock(provider.mode === 'mock'); }
    })().catch(() => { if (active) setMessage('The store could not be loaded. Try Restore purchase again.'); });
    return () => { active = false; };
  }, []));
  async function act(action: 'buy' | 'restore') {
    if (busy || (action === 'buy' && owned)) return;
    setBusy(true); setMessage('');
    try {
      const provider = await purchases();
      if (action === 'buy') await buyKit(provider);
      const restored = await restoreKit(provider, saveDeliveredKit);
      if (restored) setOwned(true);
      setMessage(restored ? 'Your kit is saved on this phone and ready offline.' : 'No Credit Letter Kit purchase was found for this store account.');
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      setMessage(code === 'STORE_ACCOUNTS_NOT_READY' ? 'STORE_ACCOUNTS_NOT_READY · Purchases are not available yet.'
        : code === 'REVENUECAT_KEY_MISSING' ? 'REVENUECAT_KEY_MISSING · Purchases are not available in this preview.'
        : code === 'REVENUECAT_SECRET_MISSING' ? 'REVENUECAT_SECRET_MISSING · Kit downloads are not available yet. Your purchase can be restored when downloads are ready.'
        : 'Your kit could not be restored. Try again; you do not need to buy it again.');
    } finally { setBusy(false); }
  }
  return <Screen route="/letters/unlock" label="Credit Letter Kit" title={owned ? 'Your kit is on this phone' : 'Four more letters, paid once'}>
    <Text style={type.body}>Templates you fill in and send yourself. One purchase covers every letter and every dispute round.</Text>
    <Sheet>{LETTERS.filter(l => l.access === 'kit').map(l => <Text key={l.kind} style={type.body}>{l.name}</Text>)}</Sheet>
    <Text style={type.sub}>{HONEST_LIMIT}</Text>
    <Text style={type.sub}>Mark as sent, tracking and reminders: not in this build yet.</Text>
    {owned ? <Button primary label="Write a kit letter ›" onPress={() => router.replace('/letters')} /> : <>
      {mock ? <Text style={type.sub}>Preview price only. No purchase can be made here.</Text> : null}
      <Button primary disabled={busy || !product} label={product ? `Get this kit, ${product.price} once` : 'Store price unavailable'} onPress={() => void act('buy')} />
      {!KIT_SALES_ENABLED ? <Text style={type.sub}>Purchases are not available yet.</Text> : null}
    </>}
    <Button label={busy ? 'Checking…' : 'Restore purchase'} disabled={busy} onPress={() => void act('restore')} />
    {message ? <Text accessibilityRole="alert" style={type.sub}>{message}</Text> : null}
    <Button label="Terms ›" onPress={() => void Linking.openURL('https://approvalprep.com/terms/')} />
    <Button label="Privacy ›" onPress={() => void Linking.openURL('https://approvalprep.com/privacy/')} />
  </Screen>;
}
