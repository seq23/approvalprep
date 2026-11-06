import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Planned, Screen } from '../../src/ui';
import { type } from '../../src/theme';
import { HONEST_LIMIT } from '../../src/copy';
import { LETTERS } from '../../src/letters';
// S3 Questions: one question per screen, answers kept on this phone. Plan: screen S3.
export default function Questions() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const letter = LETTERS.find((l) => l.kind === kind) ?? LETTERS[0];
  return (
    <Screen label="Question 1 of 5" title={letter.name}>
      <Text style={type.sub}>{HONEST_LIMIT}</Text>
      <Planned what="the guided questions (task 4)" />
    </Screen>
  );
}
