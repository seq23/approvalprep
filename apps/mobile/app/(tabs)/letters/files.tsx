import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Text } from 'react-native';
import { Button, Row, Screen, Sheet } from '../../../src/ui';
import { CREDIT_REPAIR_DEFENSE_LABEL, CREDIT_REPAIR_DEFENSE_URL } from '../../../src/more';
import { type } from '../../../src/theme';
import { REQUEST_LINE } from '../../../src/copy';
import { PREVIEW_ENABLED } from '../../../src/previewSamples';
import { FILE_KIT_OFFERS, productName, productRoute, BUNDLE_LINE, KIT_ORDER, upgradeLine } from '../../../src/offers';
import { COMPLETE_BUNDLE, KIT_SALES_ENABLED, isUpgrade, upgradeFor } from '../../../src/kit';
import { KitFiles } from '../../../src/KitFiles';
import { bundleAccount, type BundlePrice } from '../../../src/purchases/bundleAccount';
import { storePrices } from '../../../src/purchases/prices';
import { downloadKitFiles } from '../../../src/purchases/kitFiles';
import { NO_OWNERSHIP, offersFor, ownedKitIds, ownsKit, type BundleOwnership } from '../../../src/purchases/bundleOffers';
// One of the five website kits the app sells as files (her ruling 13 Nov 2026, "Exact mirror"):
// the same PDF guide and Word file the website delivers, paid once. Pattern (g), like the kit screen.
export default function Files() {
  const { kit } = useLocalSearchParams<{ kit?: string }>();
  const offer = FILE_KIT_OFFERS.find(o => o.id === kit) ?? FILE_KIT_OFFERS[0];
  const [ownership, setOwnership] = useState<BundleOwnership>(NO_OWNERSHIP);
  const [prices, setPrices] = useState<BundlePrice[]>([]);
  const [mock, setMock] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const account = await bundleAccount();
      const [owned, found] = await Promise.all([account.ownership(), storePrices()]);
      if (active) { setOwnership(owned); setPrices(Object.entries(found).map(([id, price]) => ({ id, price }))); setMock(account.mock); setPreview(!!account.preview); }
    })().catch(() => { if (active) setMessage(current => current || 'The store could not be loaded. Try Restore purchase again.'); });
    return () => { active = false; };
  }, [offer.productId, revision]));
  const owned = ownsKit(ownership, offer.productId);
  const offers = offersFor(ownership, offer.productId);
  const price = prices.find(p => p.id === offer.productId)?.price;
  const canBuy = (KIT_SALES_ENABLED && !mock) || preview;
  async function act(action: 'buy' | 'restore') {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const account = await bundleAccount();
      if (action === 'buy') await account.buy(offer.productId);
      if (account.preview) {
        const now = await account.ownership();
        setOwnership(now);
        setMessage(ownsKit(now, offer.productId) ? 'Preview: this kit is unlocked for this visit. Nothing was charged.' : 'This is a preview, so there are no purchases to restore here.');
        return;
      }
      // Straight after a purchase the store has already confirmed it; its own Restore is not run again.
      const now = action === 'buy' ? await account.ownership() : await account.restore();
      setOwnership(now);
      if (!ownsKit(now, offer.productId)) { setMessage('No purchase of this kit was found for this store account.'); return; }
      await downloadKitFiles(offer.id, account);
      setMessage('Both files are saved on this phone.');
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      console.warn('Kit files failed', code);
      setMessage(code === 'STORE_ACCOUNTS_NOT_READY' ? 'Purchases are not available yet.'
        : code === 'REVENUECAT_KEY_MISSING' ? 'Purchases are not available in this preview.'
        : 'Your kit could not be restored. Try again; you do not need to buy it again.');
    } finally { setBusy(false); setRevision(value => value + 1); }
  }
  const option = (id: string) => {
    const route = productRoute(id);
    return <Row key={id} title={productName(id)} sub={isUpgrade(id) ? upgradeLine(KIT_ORDER.length - ownedKitIds(ownership).length, prices.find(p => p.id === id)?.price || 'the store price', upgradeFor(ownedKitIds(ownership))?.paid ?? 0)
      : `${route.pathname === '/letters/bundle' ? BUNDLE_LINE : 'Self-help templates'} · ${prices.find(p => p.id === id)?.price || 'Store price unavailable'} · paid once`}
      onPress={() => router.push(route.pathname === '/letters/bundle' ? '/letters/bundle' : { pathname: route.pathname, params: route.params })} />;
  };
  return <Screen route="/letters/files" label={offer.name} title={owned ? 'Your kit is on this phone' : `${offer.documentNames.length} documents, paid once`}>
    <Text style={type.body}>The website's {offer.name}: a PDF guide and an editable Word file. You fill in your true facts and send it yourself.</Text>
    <Sheet>{offer.documentNames.map(name => <Text key={name} style={type.body}>{name}</Text>)}</Sheet>
    <Text style={type.sub}>{REQUEST_LINE}</Text>
    <Text style={type.sub}>Self-help templates. Not legal or financial advice. We do not contact anyone for you.</Text>
    {offers[0] === COMPLETE_BUNDLE.productId ? option(offers[0]) : null}
    {owned ? <KitFiles primary sku={offer.id} productId={offer.productId} name={offer.name} /> : <>
      <Button primary disabled={busy || !canBuy || !price || !offers.includes(offer.productId)} label={price ? `Get this kit, ${price} once` : 'Store price unavailable'} onPress={() => void act('buy')} />
      {preview ? <Text testID="buying-pretend" style={type.sub}>This is a preview: buying here is pretend, nothing is charged, and it lasts until you close the page.</Text>
        : canBuy ? null : <Text testID="buying-off" style={type.sub}>{PREVIEW_ENABLED ? 'This is a preview, so buying is switched off and the button above does nothing. The price is shown so you can see it.' : 'Buying is not available right now.'}</Text>}
      <Button quiet label={CREDIT_REPAIR_DEFENSE_LABEL} onPress={() => void Linking.openURL(CREDIT_REPAIR_DEFENSE_URL)} />
    </>}
    {offers.some(id => id !== offer.productId && id !== COMPLETE_BUNDLE.productId) ? <Text style={type.sub}>Other options</Text> : null}
    {offers.filter(id => id !== offer.productId && id !== COMPLETE_BUNDLE.productId).map(option)}
    <Text style={type.sub}>A kit bought on the website does not appear in this app, and a kit bought here does not appear on the website.</Text>
    <Button quiet label={busy ? 'Checking…' : 'Restore purchase'} disabled={busy} onPress={() => void act('restore')} />
    {message ? <Text accessibilityRole="alert" style={type.sub}>{message}</Text> : null}
    <Button quiet label="Terms ›" onPress={() => void Linking.openURL('https://approvalprep.com/terms/')} />
    <Button quiet label="Privacy ›" onPress={() => void Linking.openURL('https://approvalprep.com/privacy/')} />
  </Screen>;
}
