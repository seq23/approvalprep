import { router, useFocusEffect } from 'expo-router';
import { Text } from 'react-native';
import { useCallback, useState } from 'react';
import { PREVIEW_ENABLED, loadSamples } from '../src/previewSamples';
import { savedLetters } from '../src/savedLetters';
import { Button, Row, Screen, Sheet } from '../src/ui';
import { hasTrackingKit } from '../src/kitTemplates';
import type { SavedLetter } from '../src/letterStorage';
import { startModel } from '../src/start';
import { type } from '../src/theme';
import { IDEA_LINE, PRIVACY_LINE } from '../src/copy';
// S1 Start (first open). Plan: docs/APP_PLAN.md, screen S1.
export default function Start() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [letters, setLetters] = useState<SavedLetter[]>([]);
  const [hasKit, setHasKit] = useState(false);
  // Start never waits on storage: the way to write a letter is drawn first, her letters join it.
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
      router.replace('/mine');
    } catch { setMessage('Sample letters could not be loaded. Try again.'); }
    finally { setLoading(false); }
  }
  return (
    <Screen route="/" label="DIY credit letters" title={model.returning ? model.summary : IDEA_LINE}>
      {model.returning ? null : <Text style={type.body}>Write your own letters and send them yourself.</Text>}
      <Button primary label={model.returning ? 'Write a letter ›' : 'Draft a free letter ›'} onPress={() => router.replace('/letters')} />
      {model.returning ? null : <Text style={type.sub}>The first credit bureau dispute letter is free, as a PDF.</Text>}
      {model.next ? <Sheet>
        <Text style={type.sub}>Next answer date</Text>
        <Text style={type.subhead}>{model.next.date}</Text>
        <Text style={type.body}>{model.next.title}</Text>
        <Text style={type.sub}>A reminder based on the mailing date you entered.</Text>
      </Sheet> : null}
      {model.recent.map(row => <Row key={row.letter.id} title={row.title} sub={row.sub} onPress={() => {
        if (row.letter.status === 'draft') router.push({ pathname: '/letters/[kind]', params: { kind: row.letter.kind, id: row.letter.id } });
        else router.push('/mine');
      }} />)}
      {model.returning ? <Button label="All my letters ›" onPress={() => router.push('/mine')} /> : null}
      <Text style={type.sub}>{PRIVACY_LINE}</Text>
      <Button label="See the Credit Letter Kit ›" onPress={() => router.push('/letters/unlock')} />
      {PREVIEW_ENABLED ? <Button label="Preview only: try sample letters and kits ›" disabled={loading} onPress={() => void samples()} /> : null}
      {message ? <Text accessibilityRole="alert" style={type.sub}>{message}</Text> : null}
    </Screen>
  );
}
