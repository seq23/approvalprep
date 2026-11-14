import { router, useFocusEffect } from 'expo-router';
import { Text } from 'react-native';
import { useCallback, useState } from 'react';
import { PREVIEW_ENABLED, loadSamples } from '../../src/previewSamples';
import { savedLetters } from '../../src/savedLetters';
import { Button, Row, Screen, Sheet } from '../../src/ui';
import { hasTrackingKit } from '../../src/kitTemplates';
import type { SavedLetter } from '../../src/letterStorage';
import { startModel } from '../../src/start';
import { type } from '../../src/theme';
import { PRIVACY_LINE, WHAT_IT_IS } from '../../src/copy';
import { FREE_LINE, PAID_ONCE_LINE, PRODUCTS, offerTitle } from '../../src/offers';
import { usePrices } from '../../src/purchases/prices';
import { openFrom } from '../../src/nav';
import { draftHref } from '../../src/studioDrafts';
// S1 Home (the first screen, and a tab so it can always be reached again). Plan: docs/APP_PLAN.md,
// screen S1 and pattern (j): what this is, what is free, the free Studio as the one main button,
// then everything that is for sale, by name, each with its price: the website's eight products in the
// website's order with the website's names (her ruling 13 Nov 2026, "Exact mirror").
export default function Home() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [letters, setLetters] = useState<SavedLetter[]>([]);
  const [hasKit, setHasKit] = useState(false);
  const prices = usePrices();
  // Home never waits on storage: the way to write a letter is drawn first, her letters join it.
  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([savedLetters().then(store => store.list()), hasTrackingKit()])
      .then(([saved, kit]) => { if (active) { setLetters(saved); setHasKit(kit); } })
      .catch(() => {});
    return () => { active = false; };
  }, []));
  const model = startModel(letters, hasKit);
  async function samples() {
    if (loading) return;
    setLoading(true); setMessage('');
    try {
      await loadSamples(await savedLetters(), PREVIEW_ENABLED);
      router.navigate('/mine');
    } catch { setMessage('Sample letters could not be loaded. Try again.'); }
    finally { setLoading(false); }
  }
  return (
    <Screen route="/" label="ApprovalPrep" title={WHAT_IT_IS}>
      <Text style={type.body}>For a credit bureau, a landlord, a lender or an employer. You answer a few questions and the app writes the letter. You print it and mail it.</Text>
      <Button primary label="Open the free Letter Studio ›" onPress={() => openFrom('/', '/letters/studio')} />
      <Text style={type.sub}>{FREE_LINE}</Text>
      <Button label="Free credit bureau dispute letter ›" onPress={() => openFrom('/', '/letters/[kind]', { kind: 'bureau-dispute' })} />
      {model.next ? <Sheet>
        <Text style={type.sub}>Next answer date</Text>
        <Text style={type.subhead}>{model.next.date}</Text>
        <Text style={type.body}>{model.next.title}</Text>
        <Text style={type.sub}>A reminder based on the mailing date you entered.</Text>
      </Sheet> : null}
      {model.returning ? <Text style={type.section} accessibilityRole="header">{model.summary}</Text> : null}
      {model.recent.map(row => <Row key={row.letter.id} title={row.title} sub={row.sub} onPress={() => {
        if (row.letter.status === 'draft') router.push(draftHref(row.letter, '/'));
        else router.navigate('/mine');
      }} />)}
      {model.returning ? <Button label="All my letters ›" onPress={() => router.navigate('/mine')} /> : null}
      <Text style={type.section} accessibilityRole="header">Kits, if you want more</Text>
      <Text style={type.sub}>The same kits approvalprep.com sells, in the same order. {PAID_ONCE_LINE}</Text>
      {PRODUCTS.map(p => <Row key={p.sku} title={offerTitle(p.name, prices[p.productId])} sub={p.what} onPress={() => openFrom('/', p.screen, p.params)} />)}
      <Text style={type.sub}>{PRIVACY_LINE}</Text>
      {PREVIEW_ENABLED ? <Button label="Preview only: load sample letters and kits ›" disabled={loading} onPress={() => void samples()} /> : null}
      {message ? <Text accessibilityRole="alert" style={type.sub}>{message}</Text> : null}
    </Screen>
  );
}
