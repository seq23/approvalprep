import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Screen } from '../../src/ui';
import { type } from '../../src/theme';
import { LETTERS } from '../../src/letters';
// S2 Write a letter: one list, free first. Plan: docs/APP_PLAN.md, screen S2.
export default function Letters() {
  return (
    <Screen label="Write a letter" title="Which letter do you need?">
      {LETTERS.map((l) => (
        <View key={l.kind} style={{ gap: 6 }}>
          <Text style={type.subhead}>{l.name}{l.access === 'free' ? ' · Free' : ' · In the kit'}</Text>
          <Text style={type.sub}>{l.when}</Text>
          <Button label={l.access === 'free' ? 'Start ›' : 'See the kit ›'}
            onPress={() => router.push(l.access === 'free' ? `/letter/${l.kind}` : '/unlock')} />
        </View>
      ))}
    </Screen>
  );
}
