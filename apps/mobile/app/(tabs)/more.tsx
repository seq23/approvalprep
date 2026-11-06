import { Text } from 'react-native';
import { Planned, Screen } from '../../src/ui';
import { type } from '../../src/theme';
import { PRIVACY_LINE } from '../../src/copy';
// S8 More: privacy, "not a credit repair company", restore purchase, terms, support. Plan: screen S8.
export default function More() {
  return (
    <Screen label="More" title="About ApprovalPrep">
      <Text style={type.body}>{PRIVACY_LINE}</Text>
      <Text style={type.body}>ApprovalPrep is not a credit repair company. You write and send every letter yourself.</Text>
      <Planned what="restore purchase, privacy, terms and support links (task 9)" />
    </Screen>
  );
}
