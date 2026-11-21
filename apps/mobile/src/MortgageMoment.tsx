import { router } from 'expo-router';
import { Linking, Text } from 'react-native';
import { Button, Row, Sheet } from './ui';
import { type } from './theme';
import { MORTGAGE_DISPUTE_LINE, MORTGAGE_SOURCE, UNDERWRITER_CONDITIONS, UNDERWRITER_INTRO, UNDERWRITER_TITLE } from './mortgage';
import { savedLetters } from './savedLetters';
import { letterHref } from './studioDrafts';

const Source = () => <Button quiet label={`Source: ${MORTGAGE_SOURCE.label} ›`} onPress={() => void Linking.openURL(MORTGAGE_SOURCE.url).catch(() => {})} />;

/** The dispute caution alone, where a dispute letter starts. */
export function MortgageCaution() {
  return <Sheet><Text style={type.body}>{MORTGAGE_DISPUTE_LINE}</Text><Source /></Sheet>;
}

/** The underwriter's questions mapped to the letter that answers each. `open`: each row opens that
 * letter (the letter screen itself says when it needs the kit); without it the list is read-only.
 * `caution`: the ask-your-loan-officer line, only where a dispute letter is also on offer. */
export function UnderwriterGuide({ open = true, caution = true }: { open?: boolean; caution?: boolean }) {
  const go = (kind: string) => void savedLetters().then(store => letterHref(store, kind)).catch(() => ({ params: { kind } }))
    .then(href => router.push({ ...href, pathname: '/letters/[kind]' }));
  return <Sheet>
    <Text style={type.subhead} accessibilityRole="header">{UNDERWRITER_TITLE}</Text>
    <Text style={type.body}>{UNDERWRITER_INTRO}</Text>
    {UNDERWRITER_CONDITIONS.map(c => open
      ? <Row key={c.kind} title={c.asks} sub={c.letter} onPress={() => go(c.kind)} />
      : <Text key={c.kind} style={type.body}>{c.asks}{'\n'}<Text style={type.sub}>{c.letter}</Text></Text>)}
    {caution ? <><Text style={type.sub}>{MORTGAGE_DISPUTE_LINE}</Text><Source /></> : null}
  </Sheet>;
}
