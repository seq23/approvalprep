import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Button, Planned, Screen } from '../../../src/ui';
import { type } from '../../../src/theme';
import { HONEST_LIMIT } from '../../../src/copy';
import { LETTERS } from '../../../src/letters';
// S3 Questions: one question per screen, answers kept on this phone. Plan: screen S3.
export default function Questions() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const letter = LETTERS.find((l) => l.kind === kind) ?? LETTERS[0];
  return (
    <Screen route="/letters/[kind]" label="Question 1 of 5" title={letter.name}>
      <Text style={type.sub}>{HONEST_LIMIT}</Text>
      <Planned />
      <Button label="See the draft ›" onPress={() => router.push('/letters/draft')} />
    </Screen>
  );
}
