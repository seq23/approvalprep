import { router } from 'expo-router';
import { Text } from 'react-native';
import { Button, Screen } from '../src/ui';
import { type } from '../src/theme';
import { IDEA_LINE, PRIVACY_LINE } from '../src/copy';
// S1 Start (first open). Plan: docs/APP_PLAN.md, screen S1.
export default function Start() {
  return (
    <Screen route="/" label="DIY credit letters" title={IDEA_LINE}>
      <Text style={type.body}>Write your own letters and send them yourself.</Text>
      <Button primary label="Draft a free letter ›" onPress={() => router.replace('/letters')} />
      <Text style={type.sub}>{PRIVACY_LINE}</Text>
    </Screen>
  );
}
