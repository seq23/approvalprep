import { useMemo, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Button, Row, Screen } from '../../../src/ui';
import { type, space, color } from '../../../src/theme';
import { PRIVACY_LINE } from '../../../src/copy';
import { MORE_LINKS, deletionController } from '../../../src/more';
import { savedLetters } from '../../../src/savedLetters';
import { openFrom } from '../../../src/nav';
import { PAID_ONCE_LINE, PRODUCTS, offerTitle } from '../../../src/offers';
import { usePrices } from '../../../src/purchases/prices';
import { PREVIEW_ENABLED } from '../../../src/previewSamples';
import { purchases } from '../../../src/purchases';
import { bundleAccount } from '../../../src/purchases/bundleAccount';
import { restoreKit } from '../../../src/purchases/delivery';
import { restoreBundle } from '../../../src/purchases/bundleDelivery';
import { installBundle } from '../../../src/purchases/bundleFiles';
import { saveDeliveredKit } from '../../../src/kitTemplates';
import { restoreAll, restoreFileKits, restoreMessage } from '../../../src/purchases/restoreAll';
import { downloadKitFiles } from '../../../src/purchases/kitFiles';
export default function More() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restored, setRestored] = useState('');
  const prices = usePrices();
  async function restore() {
    if (restoring) return;
    setRestoring(true); setRestored('');
    try { setRestored(restoreMessage(await restoreAll({ provider: purchases, account: bundleAccount, restoreKit, restoreBundle, saveKit: saveDeliveredKit, installBundle, restoreFiles: async () => restoreFileKits(await bundleAccount(), downloadKitFiles) }), PREVIEW_ENABLED)); }
    catch (error) { setRestored(restoreMessage(error instanceof Error ? error : Error('RESTORE_FAILED'), PREVIEW_ENABLED)); }
    finally { setRestoring(false); }
  }
  const deletion = useMemo(() => deletionController(async () => { await (await savedLetters()).removeAll(); }), []);
  async function remove() {
    setBusy(true); setMessage('');
    try { if (await deletion.confirm()) { setConfirming(false); setMessage('Your letters have been deleted from this phone.'); } }
    catch { setMessage('Your letters could not be deleted. Try again.'); }
    finally { setBusy(false); }
  }
  return <Screen route="/more" label="More" title="About ApprovalPrep">
    <Text style={type.body}>{PRIVACY_LINE}</Text>
    <Text style={type.body}>You write and send every letter yourself.</Text>
    <Text style={type.section} accessibilityRole="header">Kits and the bundle</Text>
    <Text style={type.sub}>{PAID_ONCE_LINE}</Text>
    {PRODUCTS.map(p => <Row key={p.sku} title={offerTitle(p.name, prices[p.productId])} sub={p.what} onPress={() => openFrom('/more', p.screen, p.params)} />)}
    <Row title={restoring ? 'Checking…' : 'Restore a purchase'} sub="Checks this store account for a kit or the bundle and puts it back on this phone" onPress={() => void restore()} />
    {restored ? <Text accessibilityRole="alert" style={type.sub}>{restored}</Text> : null}
    <Text style={type.section} accessibilityRole="header">About</Text>
    {MORE_LINKS.map(link => <Row key={link.url} title={link.label} onPress={() => { Linking.openURL(link.url).catch(() => setMessage('Could not open the page. Try again when you are online.')); }} />)}
    <View style={{ marginTop: space[6], paddingTop: space[4], borderTopWidth: 1, borderColor: color.rule, gap: space[3] }}>
      <Button label="Delete all my letters" disabled={busy || confirming} onPress={() => { deletion.request(); setConfirming(true); setMessage(''); }} />
      {confirming ? <>
        <Text style={type.body}>Delete every saved letter and its details from this phone? This cannot be undone.</Text>
        <Button label="Yes, delete" disabled={busy} onPress={remove} />
        <Button label="Keep" disabled={busy} onPress={() => { deletion.keep(); setConfirming(false); }} />
      </> : null}
    </View>
    {message ? <Text accessibilityRole="alert" style={type.sub}>{message}</Text> : null}
  </Screen>;
}
