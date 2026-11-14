import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Text } from 'react-native';
import { Button, Row, Screen, Sheet } from '../../../src/ui';
import { type } from '../../../src/theme';
import { HONEST_LIMIT } from '../../../src/copy';
import { PREVIEW_ENABLED } from '../../../src/previewSamples';
import { BUNDLE_LINE, KIT_OFFERS, KIT_ORDER, PRODUCTS, upgradeLine, TRACKING_LINE, bundleFilesLine, bundleWebsiteKits, offerTitle, productName, productRoute } from '../../../src/offers';
import { COMPLETE_BUNDLE, KIT_SALES_ENABLED, isUpgrade, upgradeFor } from '../../../src/kit';
import { offersFor, otherKits, ownedKitIds, NO_OWNERSHIP, type BundleOwnership } from '../../../src/purchases/bundleOffers';
import { bundleAccount, type BundlePrice } from '../../../src/purchases/bundleAccount';
import { storePrices } from '../../../src/purchases/prices';
import { restoreBundle } from '../../../src/purchases/bundleDelivery';
import { bundleFile, installBundle, shareBundle } from '../../../src/purchases/bundleFiles';
export default function Bundle() {
  const { kit } = useLocalSearchParams<{ kit?: string }>();
  const requested = PRODUCTS.find(p => p.params.kit === kit)?.productId ?? 'credit';
  const [ownership, setOwnership] = useState<BundleOwnership>(NO_OWNERSHIP);
  const [prices, setPrices] = useState<BundlePrice[]>([]);
  const [mock, setMock] = useState(false);
  const [preview, setPreview] = useState(false);
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
      const [owned, products] = await Promise.all([account.ownership(), storePrices()]);
      if (active) { setOwnership(owned); setPrices(Object.entries(products).map(([id, price]) => ({ id, price }))); setMock(account.mock); setPreview(!!account.preview); setReady(true); }
    })().catch(() => { if (active) setMessage('The store could not be loaded. Your saved documents are still available. Try Restore again when online.'); });
    return () => { active = false; };
  }, []));
  const all = { creditKit: true, explanationKit: true, bundle: true };
  const owned = local || ownership.bundle;
  const offers = offersFor(local ? all : ownership, requested);
  const selected = offers.find(id => id === COMPLETE_BUNDLE.productId || isUpgrade(id));
  const mine = local ? [] : ownedKitIds(ownership);
  const paid = upgradeFor(mine)?.paid ?? 0;
  const price = prices.find(p => p.id === selected)?.price;
  // Every kit is named here, whichever screen she came from, so none looks like the only one.
  // A kit she could not add without passing the bundle price is left to the upgrade.
  const kits = otherKits(local ? all : ownership, KIT_ORDER).filter(id => offersFor(ownership, id).includes(id));
  const canBuy = (KIT_SALES_ENABLED && !mock) || preview;
  async function act(buy: boolean) {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const account = await bundleAccount();
      if (buy && selected) await account.buy(selected);
      if (account.preview) {
        const now = await account.ownership();
        setOwnership(now);
        setMessage(now.bundle ? 'Preview: every kit is unlocked for this visit. Nothing was charged.' : 'This is a preview, so there are no purchases to restore here.');
        return;
      }
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
  return <Screen route="/letters/bundle" label="Complete ApprovalPrep Bundle" title={owned ? 'Your Complete Bundle' : `${BUNDLE_LINE}`}>
    <Text style={type.body}>Paid once. Templates you fill in and send yourself.</Text>
    <Sheet>
      <Text style={type.subhead}>The two letter kits, to use in this app</Text>
      {KIT_OFFERS.map(kit => <Text key={kit.id} style={type.body}>{kit.name}: {kit.letters.length} letters</Text>)}
      <Text style={type.body}>{TRACKING_LINE}</Text>
    </Sheet>
    <Sheet>
      <Text style={type.subhead}>{bundleFilesLine()}</Text>
      {bundleWebsiteKits().map(name => <Text key={name} style={type.body}>{name}</Text>)}
      <Text style={type.sub}>These files open in Files or Word, not inside this app. A bundle bought on the website does not appear in this app.</Text>
    </Sheet>
    <Text style={type.sub}>{HONEST_LIMIT}</Text>
    {local ? <Button primary label="Save or share documents ›" onPress={() => { void shareBundle().catch(() => setMessage('The documents could not be shared. Try Restore to download them again.')); }} /> : null}
    {/* In the preview the bundle's files are opened kit by kit, from each kit's own screen. */}
    {preview && ownership.bundle ? PRODUCTS.filter(p => p.productId !== COMPLETE_BUNDLE.productId).map(p => <Row key={p.sku} title={`${p.name}: your files ›`} sub="Open the PDF guide and the Word file" onPress={() => router.push({ pathname: productRoute(p.productId).pathname, params: p.params })} />) : null}
    {selected && !owned ? <>
      <Button primary disabled={busy || !ready || !price || !canBuy} label={!price ? 'Store price unavailable' : isUpgrade(selected) ? upgradeLine(KIT_ORDER.length - mine.length, price, paid) : `Get the bundle, ${price} once`} onPress={() => void act(true)} />
      {preview ? <Text testID="buying-pretend" style={type.sub}>This is a preview: buying here is pretend, nothing is charged, and it lasts until you close the page.</Text>
        : canBuy ? null : <Text testID="buying-off" style={type.sub}>{PREVIEW_ENABLED ? 'This is a preview, so buying is switched off and the button above does nothing. The price is shown so you can see it.' : 'Buying is not available right now.'}</Text>}
    </> : null}
    {kits.length ? <Text style={type.sub}>Other options</Text> : null}
    {kits.map(id => <Row key={id} title={offerTitle(productName(id), prices.find(p => p.id === id)?.price)} sub={PRODUCTS.find(p => p.productId === id)?.what} onPress={() => router.push(productRoute(id))} />)}
    <Button quiet label={busy ? 'Checking…' : 'Restore purchase'} disabled={busy} onPress={() => void act(false)} />
    {message ? <Text accessibilityRole="alert" style={type.sub}>{message}</Text> : null}
    <Button quiet label="Terms ›" onPress={() => void Linking.openURL('https://approvalprep.com/terms/')} />
    <Button quiet label="Privacy ›" onPress={() => void Linking.openURL('https://approvalprep.com/privacy/')} />
  </Screen>;
}
