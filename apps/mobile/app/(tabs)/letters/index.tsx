import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Row, Screen } from '../../../src/ui';
import { LETTERS } from '../../../src/letters';
import { kitLetter, loadDeliveredKit, type KitTemplates } from '../../../src/kitTemplates';
export default function Letters() {
  const [kit, setKit] = useState<KitTemplates | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    loadDeliveredKit().then(value => { if (active) setKit(value); });
    return () => { active = false; };
  }, []));
  return <Screen route="/letters" label="Write a letter" title="Which letter do you need?">
    <Row title="Free Letter Studio" sub="A first-pass letter for your situation" onPress={() => router.push('/letters/studio')} />
    {LETTERS.map(l => <Row key={l.kind} title={`${l.name} · ${l.access === 'free' ? 'Free' : 'In the kit'}`} sub={l.when}
      onPress={() => router.push(l.access === 'free' || kitLetter(kit, l.kind) ? `/letters/${l.kind}` : '/letters/unlock')} />)}
  </Screen>;
}
