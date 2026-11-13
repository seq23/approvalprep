import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Text } from 'react-native';
import { Button, Row, Screen, Sheet } from '../../../src/ui';
import { type } from '../../../src/theme';
import { HONEST_LIMIT } from '../../../src/copy';
import { COMPLETE_BUNDLE, BUNDLE_UPGRADE, KIT, KIT_SALES_ENABLED } from '../../../src/kit';
import { offersFor, NO_OWNERSHIP, EXPLANATION_PRODUCT, type BundleOwnership, type OfferId } from '../../../src/purchases/bundleOffers';
import { bundleAccount, type BundlePrice } from '../../../src/purchases/bundleAccount';
import { restoreBundle } from '../../../src/purchases/bundleDelivery';
import { bundleFile, installBundle, shareBundle } from '../../../src/purchases/bundleFiles';
const nameOf = (id: OfferId) => id === COMPLETE_BUNDLE.productId ? 'Complete ApprovalPrep Bundle' : id === BUNDLE_UPGRADE.productId ? 'Complete Bundle upgrade' : id === KIT.productId ? 'Credit Letter Kit' : 'Letter of Explanation Kit';
export default function Bundle() {
  const { kit } = useLocalSearchParams<{ kit?: string }>();
  const requested = kit === 'letter-of-explanation-kit' ? 'explanation' : 'credit';
  const [ownership, setOwnership] = useState<BundleOwnership>(NO_OWNERSHIP);
  const [prices, setPrices] = useState<BundlePrice[]>([]);
  const [mock, setMock] = useState(false);
  const [local, setLocal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    setReady(false);
    (async () => {
      const localFile = await bundleFile();
      if (active) setLocal(!!localFile);
      const account = await bundleAccount();
      const [owned, products] = await Promise.all([account.ownership(), account.products()]);
      if (active) { setOwnership(owned); setPrices(products); setMock(account.mock); setReady(true); }
    })().catch(() => { if (active) setMessage('The store could not be loaded. Your saved documents are still available. Try Restore again when online.'); });
    return () => { active = false; };
  }, []));
  const offers = offersFor(local ? { creditKit: true, explanationKit: true, bundle: true } : ownership, requested);
  const selected = offers.find(id => id === COMPLETE_BUNDLE.productId || id === BUNDLE_UPGRADE.productId);
  const price = prices.find(p => p.id === selected)?.price;
  async function act(buy: boolean) {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const account = await bundleAccount();
      if (buy && selected) await account.buy(selected);
      // Straight after a purchase the store has already confirmed it; its own Restore is not run again.
      const restored = await restoreBundle(buy && selected ? { restore: account.ownership, userId: account.userId } : account, installBundle);
      setOwnership(await account.ownership()); setLocal(!!await bundleFile());
      setMessage(restored ? 'Both kits and your documents are saved on this phone. Use Save or share to open the ZIP in Files.' : 'No bundle purchase was found. A previous kit purchase is restored from its kit screen.');
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      console.warn('Bundle restore failed', code);
      setMessage(code === 'STORE_ACCOUNTS_NOT_READY' ? 'Purchases are not available yet.'
        : code === 'NATIVE_DOWNLOAD_REQUIRED' ? 'Document downloads are available in the phone app. This preview cannot make purchases.'
        : 'Your bundle could not be downloaded. Try Restore again. You do not need to buy it again.');
    } finally { setBusy(false); }
  }
  return <Screen route="/letters/bundle" label="Complete ApprovalPrep Bundle" title={ownership.bundle || local ? 'Your Complete Bundle' : 'Both kits and the document library'}>
    <Text style={type.body}>Paid once. Templates you fill in and send yourself.</Text>
    <Sheet>
      <Text style={type.body}>Credit Letter Kit</Text>
      <Text style={type.body}>Letter of Explanation Kit</Text>
      <Text style={type.body}>Mark as sent, tracking and local reminders</Text>
      <Text style={type.body}>Every website kit’s PDF guide and editable DOCX templates, in one ZIP</Text>
    </Sheet>
    <Text style={type.sub}>{HONEST_LIMIT}</Text>
    {local ? <Button primary label="Save or share documents ›" onPress={() => { void shareBundle().catch(() => setMessage('The documents could not be shared. Try Restore to download them again.')); }} /> : null}
    {selected && !local ? <>
      {mock ? <Text style={type.sub}>Preview price only. No purchase can be made here.</Text> : null}
      <Button primary disabled={busy || !ready || !price} label={price ? `Get ${selected === BUNDLE_UPGRADE.productId ? 'the upgrade' : 'the bundle'}, ${price} once` : 'Store price unavailable'} onPress={() => void act(true)} />
      {!KIT_SALES_ENABLED ? <Text style={type.sub}>Purchases are not available yet.</Text> : null}
    </> : null}
    {offers.some(id => id === KIT.productId || id === EXPLANATION_PRODUCT) ? <Text style={type.sub}>Other options</Text> : null}
    {offers.filter(id => id === KIT.productId || id === EXPLANATION_PRODUCT).map(id => <Row key={id} title={nameOf(id)} sub={prices.find(p => p.id === id)?.price ? `${prices.find(p => p.id === id)!.price}, paid once` : 'One kit, paid once'} onPress={() => router.push({ pathname: '/letters/unlock', params: { kit: id === KIT.productId ? 'credit-letter-kit' : 'letter-of-explanation-kit' } })} />)}
    <Button label={busy ? 'Checking…' : 'Restore purchase'} disabled={busy} onPress={() => void act(false)} />
    {message ? <Text accessibilityRole="alert" style={type.sub}>{message}</Text> : null}
    <Button label="Terms ›" onPress={() => void Linking.openURL('https://approvalprep.com/terms/')} />
    <Button label="Privacy ›" onPress={() => void Linking.openURL('https://approvalprep.com/privacy/')} />
  </Screen>;
}
