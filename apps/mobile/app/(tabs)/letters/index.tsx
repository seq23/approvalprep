import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { Row, Screen } from '../../../src/ui';
import { type } from '../../../src/theme';
import { LETTERS, EXPLANATION_LETTERS, type LetterType } from '../../../src/letters';
import { kitLetter, kitForKind, loadDeliveredKit, EXPLANATION_KIT_ID, type KitTemplates } from '../../../src/kitTemplates';
export default function Letters() {
  const [kits, setKits] = useState<(KitTemplates | null)[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([loadDeliveredKit(), loadDeliveredKit(EXPLANATION_KIT_ID)]).then(value => { if (active) setKits(value); });
    return () => { active = false; };
  }, []));
  const row = (l: LetterType) => <Row key={l.kind} title={`${l.name} · ${l.access === 'free' ? 'Free' : 'In the kit'}`} sub={l.when}
    onPress={() => router.push(l.access === 'free' || kits.some(kit => kitLetter(kit, l.kind)) ? `/letters/${l.kind}` : { pathname: '/letters/unlock', params: { kit: kitForKind(l.kind) } })} />;
  return <Screen route="/letters" label="Write a letter" title="Which letter do you need?">
    <Row title="Free Letter Studio" sub="A first-pass letter for your situation" onPress={() => router.push('/letters/studio')} />
    {LETTERS.map(row)}
    <Text style={type.body}>For a landlord, lender or employer</Text>
    {EXPLANATION_LETTERS.map(row)}
  </Screen>;
}
