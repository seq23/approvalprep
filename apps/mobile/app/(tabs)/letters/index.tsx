import { router } from 'expo-router';
import { Row, Screen } from '../../../src/ui';
import { LETTERS } from '../../../src/letters';
export default function Letters() {
  return <Screen route="/letters" label="Write a letter" title="Which letter do you need?">
    {LETTERS.map(l => <Row key={l.kind} title={`${l.name} · ${l.access === 'free' ? 'Free' : 'In the kit'}`} sub={l.when}
      onPress={() => router.push(l.access === 'free' ? `/letters/${l.kind}` : '/letters/unlock')} />)}
  </Screen>;
}
