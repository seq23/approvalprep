import { Text } from 'react-native';
import { Screen } from '../../../src/ui';
import { type } from '../../../src/theme';
// S6 My letters: every letter with its sent date and the day count. Plan: screen S6.
export default function Mine() {
  return (
    <Screen route="/mine" label="My letters" title="Nothing sent yet">
      <Text style={type.body}>When you send a letter, mark it as sent and it shows here with the date.</Text>
    </Screen>
  );
}
