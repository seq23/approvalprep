import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Planned, Screen, Button } from '../../../src/ui';
import { loadDeliveredKit } from '../../../src/kitTemplates';
// S5 Mark as sent: date, how it was sent, optional tracking number, reminder. Plan: screen S5.
export default function Sent() {
  const [hasKit, setHasKit] = useState<boolean | null>(null);
  useEffect(() => { let active = true; loadDeliveredKit().then(kit => { if (active) setHasKit(!!kit); }); return () => { active = false; }; }, []);
  return <Screen route="/letters/sent" label="Mark as sent" title="When did you send it?">
    {hasKit === null ? null : hasKit ? <Planned /> : <Button label="See the Credit Letter Kit ›" onPress={() => router.replace('/letters/unlock')} />}
  </Screen>;
}
