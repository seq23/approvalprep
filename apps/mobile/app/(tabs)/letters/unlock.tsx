import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Text } from 'react-native';
import { Button, Screen, Sheet } from '../../../src/ui';
import { type } from '../../../src/theme';
import { HONEST_LIMIT } from '../../../src/copy';
import { KIT, EXPLANATION_KIT, KIT_SALES_ENABLED } from '../../../src/kit';
import { LETTERS, EXPLANATION_LETTERS } from '../../../src/letters';
import { KIT_ID, EXPLANATION_KIT_ID, loadDeliveredKit, saveDeliveredKit } from '../../../src/kitTemplates';
import { purchases } from '../../../src/purchases';
import { buyKit, type Product } from '../../../src/purchases/provider';
import { restoreKit } from '../../../src/purchases/delivery';
export default function Unlock() {
  const { kit } = useLocalSearchParams<{ kit?: string }>();
  const explanation = kit === EXPLANATION_KIT_ID;
  const kitId = explanation ? EXPLANATION_KIT_ID : KIT_ID;
  const offer = explanation ? EXPLANATION_KIT : KIT;
  const kitName = explanation ? 'Letter of Explanation Kit' : 'Credit Letter Kit';
  const [product, setProduct] = useState<Product | null>(null);
  const [mock, setMock] = useState(false);
  const [owned, setOwned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const kit = await loadDeliveredKit(kitId);
      if (!active) return;
      setOwned(!!kit); setMessage('');
      if (kit) { setProduct(null); return; }
      const provider = await purchases();
      const products = await provider.products();
      if (active) { setProduct(products.find(p => p.id === offer.productId) ?? null); setMock(provider.mode === 'mock'); }
    })().catch(() => { if (active) setMessage('The store could not be loaded. Try Restore purchase again.'); });
    return () => { active = false; };
  }, [kitId, offer.productId]));
  async function act(action: 'buy' | 'restore') {
    if (busy || (action === 'buy' && owned)) return;
    setBusy(true); setMessage('');
    try {
      const provider = await purchases();
      if (action === 'buy') await buyKit(provider, offer.productId);
      const restored = await restoreKit(provider, saveDeliveredKit);
      setOwned(!!await loadDeliveredKit(kitId));
      setMessage(restored ? 'Your kit is saved on this phone and ready offline.' : 'No letter kit purchase was found for this store account.');
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      console.warn('Kit restore failed', code);
      setOwned(!!await loadDeliveredKit(kitId));
      setMessage(code === 'KIT_RESTORE_PARTIAL' ? 'Available kits are saved on this phone. Another kit could not be restored; try Restore again. You do not need to buy it again.'
        : code === 'STORE_ACCOUNTS_NOT_READY' ? 'Purchases are not available yet.'
        : code === 'REVENUECAT_KEY_MISSING' ? 'Purchases are not available in this preview.'
        : code === 'REVENUECAT_SECRET_MISSING' ? 'Kit downloads are not available yet. Your purchase can be restored when downloads are ready.'
        : 'Your kit could not be restored. Try again; you do not need to buy it again.');
    } finally { setBusy(false); }
  }
  return <Screen route="/letters/unlock" label={kitName} title={owned ? 'Your kit is on this phone' : explanation ? 'Nine explanation letters, paid once' : 'Four more letters, paid once'}>
    <Text style={type.body}>Templates you fill in and send yourself. {explanation ? 'One purchase covers the nine explanation letters.' : 'One purchase covers every letter and every dispute round.'}</Text>
    <Sheet>{(explanation ? EXPLANATION_LETTERS : LETTERS.filter(l => l.access === 'kit')).map(l => <Text key={l.kind} style={type.body}>{l.name}</Text>)}</Sheet>
    <Text style={type.sub}>{HONEST_LIMIT}</Text>
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
