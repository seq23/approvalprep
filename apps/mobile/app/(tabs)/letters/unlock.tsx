import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Text } from 'react-native';
import { Button, Row, Screen, Sheet } from '../../../src/ui';
import { CREDIT_REPAIR_DEFENSE_LABEL, CREDIT_REPAIR_DEFENSE_URL } from '../../../src/more';
import { type } from '../../../src/theme';
import { HONEST_LIMIT, REQUEST_LINE } from '../../../src/copy';
import { PREVIEW_ENABLED } from '../../../src/previewSamples';
import { TRACKING_LINE, kitOfferFor, websiteDifference, productName, productRoute, siteSkuFor } from '../../../src/offers';
import { KitFiles } from '../../../src/KitFiles';
import { KIT, EXPLANATION_KIT, COMPLETE_BUNDLE, KIT_SALES_ENABLED } from '../../../src/kit';
import { LETTERS, EXPLANATION_LETTERS } from '../../../src/letters';
import { KIT_ID, EXPLANATION_KIT_ID, loadDeliveredKit, saveDeliveredKit } from '../../../src/kitTemplates';
import { purchases } from '../../../src/purchases';
import { buyKit, type Product } from '../../../src/purchases/provider';
import { restoreKit } from '../../../src/purchases/delivery';
import { bundleAccount } from '../../../src/purchases/bundleAccount';
import { bundleFile, installBundle } from '../../../src/purchases/bundleFiles';
import { restoreBundle } from '../../../src/purchases/bundleDelivery';
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
  const [preview, setPreview] = useState(false);
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
      if (active) { setOwnership({ creditKit: local.creditKit || remote.creditKit, explanationKit: local.explanationKit || remote.explanationKit, bundle: local.bundle || remote.bundle }); setPrices([...products, ...bundlePrices]); setProduct(products.find(p => p.id === offer.productId) ?? null); setMock(provider.mode !== 'store'); setPreview(provider.mode === 'preview'); }
    })().catch(() => { if (active) setMessage(current => current || 'The store could not be loaded. Try Restore purchase again.'); });
    return () => { active = false; };
  }, [kitId, offer.productId, revision]));
  async function act(action: 'buy' | 'restore') {
    if (busy || (action === 'buy' && owned)) return;
    setBusy(true); setMessage('');
    try {
      const provider = await purchases();
      const bought = action === 'buy' ? await buyKit(provider, offer.productId) : undefined;
      if (provider.mode === 'preview') {
        // A pretend purchase: the kit opens for this visit only; nothing is fetched or charged.
        const has = !!await loadDeliveredKit(kitId);
        setOwned(has);
        setMessage(has ? 'Preview: this kit is unlocked for this visit. Nothing was charged.' : 'This is a preview, so there are no purchases to restore here.');
        return;
      }
      // A bundle buyer who lands here from a locked letter gets her kits through the bundle door.
      const restored = await restoreKit(provider, saveDeliveredKit, bought) || (!bought && await restoreBundle(await bundleAccount(), installBundle));
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
  const option = (id: (typeof offers)[number]) => {
    const route = productRoute(id);
    const everything = route.pathname === '/letters/bundle';
    return <Row key={id} title={productName(id)}
      sub={`${everything ? 'Every kit, in this app and as files' : 'Self-help letter templates'} · ${prices.find(p => p.id === id)?.price || 'Store price unavailable'} · paid once`}
      onPress={() => router.push(everything ? { pathname: '/letters/bundle', params: { kit: kitId } } : { pathname: route.pathname, params: route.params })} />;
  };
  const canBuy = (KIT_SALES_ENABLED && !mock) || preview;
  const other = kitOfferFor(explanation ? KIT_ID : EXPLANATION_KIT_ID);
  return <Screen route="/letters/unlock" label={kitName} title={owned ? 'Your kit is on this phone' : explanation ? 'Nine explanation letters, paid once' : 'Four more letters, paid once'}>
    <Text style={type.body}>A kit is a set of letter templates you unlock once in this app, fill in and send yourself. {explanation ? 'One purchase covers the nine explanation letters.' : 'One purchase covers every letter and every dispute round.'}</Text>
    {explanation ? null : <Text style={type.body}>Looking for a cheaper, easier, fairer alternative to a credit repair company? Do it yourself with these letters, paid once, no monthly fee.</Text>}
    <Sheet>{(explanation ? EXPLANATION_LETTERS : LETTERS.filter(l => l.access === 'kit')).map(l => <Text key={l.kind} style={type.body}>{l.name}</Text>)}<Text style={type.body}>{TRACKING_LINE}</Text></Sheet>
    <Text style={type.sub}>{explanation ? REQUEST_LINE : HONEST_LIMIT}</Text>
    <Text style={type.sub}>{websiteDifference(kitId)}</Text>
    {offers[0] === COMPLETE_BUNDLE.productId ? option(offers[0]) : null}
    {owned ? <>
      <Button primary label="Write a kit letter ›" onPress={() => router.replace('/letters')} />
      <KitFiles sku={siteSkuFor(offer.productId)!} productId={offer.productId} name={kitName} />
    </> : <>
      <Button primary disabled={busy || !canBuy || !product || !offers.includes(offer.productId)} label={product ? `Get this kit, ${product.price} once` : 'Store price unavailable'} onPress={() => void act('buy')} />
      {preview ? <Text testID="buying-pretend" style={type.sub}>This is a preview: buying here is pretend, nothing is charged, and it lasts until you close the page.</Text>
        : canBuy ? null : <Text testID="buying-off" style={type.sub}>{PREVIEW_ENABLED ? 'This is a preview, so buying is switched off and the button above does nothing. The price is shown so you can see it.' : 'Buying is not available right now.'}</Text>}
      <Button quiet label={CREDIT_REPAIR_DEFENSE_LABEL} onPress={() => void Linking.openURL(CREDIT_REPAIR_DEFENSE_URL)} />
    </>}
    {offers.some(id => id !== offer.productId && id !== COMPLETE_BUNDLE.productId) ? <Text style={type.sub}>Other options</Text> : null}
    {offers.filter(id => id !== offer.productId && id !== COMPLETE_BUNDLE.productId).map(option)}
    {/* The other kit is named here too, so neither kit looks like the only one. */}
    {ownership.bundle || (explanation ? ownership.creditKit : ownership.explanationKit) ? null : <Text style={type.sub}>{`This app also has the ${other.name}: ${other.what}. It is in the bundle above and on the Write a letter list.`}</Text>}
    <Button quiet label={busy ? 'Checking…' : 'Restore purchase'} disabled={busy} onPress={() => void act('restore')} />
    {message ? <Text accessibilityRole="alert" style={type.sub}>{message}</Text> : null}
    <Button quiet label="Terms ›" onPress={() => void Linking.openURL('https://approvalprep.com/terms/')} />
    <Button quiet label="Privacy ›" onPress={() => void Linking.openURL('https://approvalprep.com/privacy/')} />
  </Screen>;
}
