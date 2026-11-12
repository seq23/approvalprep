import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Text } from 'react-native';
import { Button, Row, Screen, Sheet } from '../../../src/ui';
import { type } from '../../../src/theme';
import { HONEST_LIMIT } from '../../../src/copy';
import { KIT, EXPLANATION_KIT, COMPLETE_BUNDLE, BUNDLE_UPGRADE, KIT_SALES_ENABLED } from '../../../src/kit';
import { LETTERS, EXPLANATION_LETTERS } from '../../../src/letters';
import { KIT_ID, EXPLANATION_KIT_ID, loadDeliveredKit, saveDeliveredKit } from '../../../src/kitTemplates';
import { purchases } from '../../../src/purchases';
import { buyKit, type Product } from '../../../src/purchases/provider';
import { restoreKit } from '../../../src/purchases/delivery';
import { bundleAccount } from '../../../src/purchases/bundleAccount';
import { bundleFile } from '../../../src/purchases/bundleFiles';
import { offersFor, NO_OWNERSHIP, type BundleOwnership } from '../../../src/purchases/bundleOffers';
export default function Unlock() {
  const { kit } = useLocalSearchParams<{ kit?: string }>();
  const explanation = kit === EXPLANATION_KIT_ID;
  const kitId = explanation ? EXPLANATION_KIT_ID : KIT_ID;
  const offer = explanation ? EXPLANATION_KIT : KIT;
  const kitName = explanation ? 'Letter of Explanation Kit' : 'Credit Letter Kit';
  const [revision, setRevision] = useState(0);
  const [ownership, setOwnership] = useState<BundleOwnership>(NO_OWNERSHIP);
  const [prices, setPrices] = useState<{ id: string; price: string }[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [mock, setMock] = useState(false);
  const [owned, setOwned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const [credit, explanationKit, file] = await Promise.all([loadDeliveredKit(KIT_ID), loadDeliveredKit(EXPLANATION_KIT_ID), bundleFile()]);
      const kit = explanation ? explanationKit : credit;
      const local = { creditKit: !!credit, explanationKit: !!explanationKit, bundle: !!file };
      if (active) setOwnership(local);
      if (!active) return;
      setOwned(!!kit);
      if (kit) setProduct(null);
      const provider = await purchases();
      const account = await bundleAccount();
      const [products, bundlePrices, remote] = await Promise.all([provider.products(), account.products(), account.ownership()]);
      if (active) { setOwnership({ creditKit: local.creditKit || remote.creditKit, explanationKit: local.explanationKit || remote.explanationKit, bundle: local.bundle || remote.bundle }); setPrices([...products, ...bundlePrices]); setProduct(products.find(p => p.id === offer.productId) ?? null); setMock(provider.mode === 'mock'); }
    })().catch(() => { if (active) setMessage(current => current || 'The store could not be loaded. Try Restore purchase again.'); });
    return () => { active = false; };
  }, [kitId, offer.productId, revision]));
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
    } finally { setBusy(false); setRevision(value => value + 1); }
  }
  const offers = offersFor(ownership, explanation ? 'explanation' : 'credit');
  const option = (id: (typeof offers)[number]) => <Row key={id}
    title={id === COMPLETE_BUNDLE.productId ? 'Complete ApprovalPrep Bundle' : id === BUNDLE_UPGRADE.productId ? 'Complete Bundle upgrade' : id === KIT.productId ? 'Credit Letter Kit' : 'Letter of Explanation Kit'}
    sub={`${id === COMPLETE_BUNDLE.productId || id === BUNDLE_UPGRADE.productId ? 'Both kits and the document library' : 'Self-help letter templates'} · ${prices.find(p => p.id === id)?.price || 'Store price unavailable'} · paid once`}
    onPress={() => router.push(id === COMPLETE_BUNDLE.productId || id === BUNDLE_UPGRADE.productId
      ? { pathname: '/letters/bundle', params: { kit: kitId } }
      : { pathname: '/letters/unlock', params: { kit: id === KIT.productId ? KIT_ID : EXPLANATION_KIT_ID } })} />;
  return <Screen route="/letters/unlock" label={kitName} title={owned ? 'Your kit is on this phone' : explanation ? 'Nine explanation letters, paid once' : 'Four more letters, paid once'}>
    <Text style={type.body}>Templates you fill in and send yourself. {explanation ? 'One purchase covers the nine explanation letters.' : 'One purchase covers every letter and every dispute round.'}</Text>
    <Sheet>{(explanation ? EXPLANATION_LETTERS : LETTERS.filter(l => l.access === 'kit')).map(l => <Text key={l.kind} style={type.body}>{l.name}</Text>)}</Sheet>
    <Text style={type.sub}>{HONEST_LIMIT}</Text>
    {offers[0] === COMPLETE_BUNDLE.productId ? option(offers[0]) : null}
    {owned ? <Button primary label="Write a kit letter ›" onPress={() => router.replace('/letters')} /> : <>
      {mock ? <Text style={type.sub}>Preview price only. No purchase can be made here.</Text> : null}
      <Button primary disabled={busy || !product || !offers.includes(offer.productId)} label={product ? `Get this kit, ${product.price} once` : 'Store price unavailable'} onPress={() => void act('buy')} />
      {!KIT_SALES_ENABLED ? <Text style={type.sub}>Purchases are not available yet.</Text> : null}
    </>}
    {offers.some(id => id !== offer.productId && id !== COMPLETE_BUNDLE.productId) ? <Text style={type.sub}>Other options</Text> : null}
    {offers.filter(id => id !== offer.productId && id !== COMPLETE_BUNDLE.productId).map(option)}
    <Button label={busy ? 'Checking…' : 'Restore purchase'} disabled={busy} onPress={() => void act('restore')} />
    {message ? <Text accessibilityRole="alert" style={type.sub}>{message}</Text> : null}
    <Button label="Terms ›" onPress={() => void Linking.openURL('https://approvalprep.com/terms/')} />
    <Button label="Privacy ›" onPress={() => void Linking.openURL('https://approvalprep.com/privacy/')} />
  </Screen>;
}
