import { router } from 'expo-router';
import { Button, Planned, Screen } from '../../../src/ui';
// S4 Your letter: the sheet, the wrong line highlighted, Save as PDF / Share or print. Plan: screen S4.
export default function Draft() {
  return <Screen route="/letters/draft" label="Your letter, first draft" title="Read it, then send it yourself"><Planned /><Button label="Mark as sent ›" onPress={() => router.push('/letters/sent')} /></Screen>;
}
