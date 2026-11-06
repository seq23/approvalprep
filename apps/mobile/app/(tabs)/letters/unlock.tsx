import { Text } from 'react-native';
import { Planned, Screen } from '../../../src/ui';
import { type } from '../../../src/theme';
// S7 Credit Letter Kit: one-time purchase, no subscription. Price comes from the store only. Plan: screen S7.
export default function Unlock() {
  return (
    <Screen route="/letters/unlock" label="Credit Letter Kit" title="Four more letters, paid once">
      <Text style={type.body}>Goodwill, debt validation, pay for delete and follow-up letters, plus the PDF guide.</Text>
      <Planned what="the store price, Buy and Restore purchase (task 8)" />
    </Screen>
  );
}
