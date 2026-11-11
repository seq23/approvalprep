import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Row, Screen } from '../../../src/ui';
import { LETTERS } from '../../../src/letters';
import { kitLetter, loadDeliveredKit, type KitTemplates } from '../../../src/kitTemplates';
export default function Letters() {
  const [kit, setKit] = useState<KitTemplates | null>(null);
  useEffect(() => { let active = true; loadDeliveredKit().then(value => { if (active) setKit(value); }); return () => { active = false; }; }, []);
  return <Screen route="/letters" label="Write a letter" title="Which letter do you need?">
    {LETTERS.map(l => <Row key={l.kind} title={`${l.name} · ${l.access === 'free' ? 'Free' : 'In the kit'}`} sub={l.when}
      onPress={() => router.push(l.access === 'free' || kitLetter(kit, l.kind) ? `/letters/${l.kind}` : '/letters/unlock')} />)}
  </Screen>;
}
