import { useMemo, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Button, Field, Row, Screen, flushFields, useTypedText } from '../../../src/ui';
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
import { downloadKitFiles, saveKitFiles } from '../../../src/purchases/kitFiles';
import { emailWebsiteOrderLinks, unlockWebsiteOrder, websiteUnlockMessage } from '../../../src/purchases/websiteUnlock';
import { exportAllLetters } from '../../../src/allLetters';
import { ReviewCode } from '../../../src/ReviewCode';
export default function More() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restored, setRestored] = useState('');
  const prices = usePrices();
  const [order, setOrder, orderNow] = useTypedText();
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState('');
  const [buyerEmail, setBuyerEmail, buyerEmailNow] = useTypedText();
  const [emailing, setEmailing] = useState(false);
  const [emailed, setEmailed] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState('');
  async function unlockOrder() {
    if (unlocking) return;
    setUnlocking(true); setUnlocked('');
    await flushFields();
    const pasted = orderNow();
    if (!pasted.trim()) { setUnlocking(false); setUnlocked('Paste the link from your download page first.'); return; }
    try { setUnlocked(websiteUnlockMessage(await unlockWebsiteOrder(pasted, { saveKit: saveDeliveredKit, saveFiles: saveKitFiles, installBundle }), PREVIEW_ENABLED)); setOrder(''); }
    catch (error) { setUnlocked(websiteUnlockMessage(error instanceof Error ? error : Error('WEBSITE_UNLOCK_UNAVAILABLE'), PREVIEW_ENABLED)); }
    finally { setUnlocking(false); }
  }
  async function emailLinks() {
    if (emailing) return;
    setEmailing(true); setEmailed('');
    await flushFields();
    const typed = buyerEmailNow();
    if (!typed.trim()) { setEmailing(false); setEmailed('Enter the email you paid with first.'); return; }
    try { setEmailed(await emailWebsiteOrderLinks(typed, PREVIEW_ENABLED)); }
    finally { setEmailing(false); }
  }
  async function exportAll() {
    if (exporting) return;
    setExporting(true); setExported('');
    try { const count = await exportAllLetters(); setExported(count ? '' : 'You have no saved letters yet.'); }
    catch (error) { setExported(error instanceof Error && error.message ? error.message : 'Your letters could not be saved as a PDF. Please try again.'); }
    finally { setExporting(false); }
  }
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
    <ReviewCode />
    <Text style={type.section} accessibilityRole="header">Bought on approvalprep.com?</Text>
    <Text style={type.sub}>A kit you bought on the website opens here at no charge. Paste the link from your download page or from the email "Your ApprovalPrep download link". Only the order code in it is sent.</Text>
    <Field label="Your order link" kind="url" value={order} onChangeText={text => { setOrder(text); setUnlocked(''); }} />
    <Button label={unlocking ? 'Checking…' : 'Open my website kit ›'} disabled={unlocking} onPress={() => void unlockOrder()} />
    {unlocked ? <Text accessibilityRole="alert" style={type.sub}>{unlocked}</Text> : null}
    <Text style={type.body}>No link? Enter the email you paid with</Text>
    <Text style={type.sub}>We email the link for any kit bought with that address. Only the email you type is sent.</Text>
    <Field label="Email you paid with" kind="email" value={buyerEmail} onChangeText={text => { setBuyerEmail(text); setEmailed(''); }} />
    <Button label={emailing ? 'Sending…' : 'Email me my link ›'} disabled={emailing} onPress={() => void emailLinks()} />
    {emailed ? <Text accessibilityRole="alert" style={type.sub}>{emailed}</Text> : null}
    <Text style={type.section} accessibilityRole="header">Your letters</Text>
    <Text style={type.sub}>Your letters and mailing dates are kept only on this phone. Deleting the app deletes them. Save a copy you can keep.</Text>
    <Button label={exporting ? 'Making the PDF…' : 'Save all my letters as one PDF ›'} disabled={exporting} onPress={() => void exportAll()} />
    {exported ? <Text accessibilityRole="alert" style={type.sub}>{exported}</Text> : null}
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
