import { router } from 'expo-router';
import { Text } from 'react-native';
import { useState } from 'react';
import { PREVIEW_ENABLED, loadSamples } from '../src/previewSamples';
import { savedLetters } from '../src/savedLetters';
import { Button, Screen } from '../src/ui';
import { type } from '../src/theme';
import { IDEA_LINE, PRIVACY_LINE } from '../src/copy';
// S1 Start (first open). Plan: docs/APP_PLAN.md, screen S1.
export default function Start() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
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
    <Screen route="/" label="DIY credit letters" title={IDEA_LINE}>
      <Text style={type.body}>Write your own letters and send them yourself.</Text>
      <Button primary label="Draft a free letter ›" onPress={() => router.replace('/letters')} />
      <Text style={type.sub}>{PRIVACY_LINE}</Text>
      <Button label="See the Credit Letter Kit ›" onPress={() => router.push('/letters/unlock')} />
      {PREVIEW_ENABLED ? <Button label="Preview only: load sample letters ›" disabled={loading} onPress={() => void samples()} /> : null}
      {message ? <Text accessibilityRole="alert" style={type.sub}>{message}</Text> : null}
    </Screen>
  );
}
