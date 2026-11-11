import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { Button, Screen, Sheet } from '../../../src/ui';
import { type } from '../../../src/theme';
import { HONEST_LIMIT } from '../../../src/copy';
import { renderDispute } from '../../../src/letterQuestions';
import { savedLetters } from '../../../src/savedLetters';
import type { SavedLetter } from '../../../src/letterStorage';
import { KIT_KINDS, KIT_LOCKED_LINE, kitLetter, loadDeliveredKit, renderKitLetter, type KitKind, type KitLetter } from '../../../src/kitTemplates';
export default function Draft() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [letter, setLetter] = useState<SavedLetter | null>(null);
  const [message, setMessage] = useState('Opening your letter…');
  const [paid, setPaid] = useState<KitLetter | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    savedLetters().then(store => id ? store.get(id) : null).then(async value => {
      const template = value && KIT_KINDS.includes(value.kind as KitKind) ? kitLetter(await loadDeliveredKit(), value.kind) : null;
      if (!active) return;
      setPaid(template);
      if (value && (value.kind === 'bureau-dispute' || template)) setLetter(value);
      else if (value && KIT_KINDS.includes(value.kind as KitKind)) { setLetter(null); setMessage(KIT_LOCKED_LINE); }
      else setMessage('This draft could not be found. Open Write a letter to start one.');
    }).catch(() => { if (active) setMessage('Your letter could not be loaded. Go back and try again.'); });
    return () => { active = false; };
  }, [id]));
  const rendered = !letter ? null : letter.kind === 'bureau-dispute' ? renderDispute(letter.answers) : paid && paid.kind === letter.kind ? renderKitLetter(paid, letter.answers) : null;
  return <Screen route="/letters/draft" label="Your letter, first draft" title="Read it before you mail it">
    <Text style={type.sub}>{HONEST_LIMIT}</Text>
    {rendered && letter ? <>
      <Sheet><Text selectable style={type.body}>{rendered.text}</Text></Sheet>
      {rendered.blanks.length ? <Text style={type.sub}>Fill in the brackets before mailing: {rendered.blanks.join(', ')}.</Text> : null}
      {paid?.honestLine ? <Text style={type.sub}>{paid.honestLine}</Text> : null}
      {(paid?.notes ?? []).map(note => <Text key={note} style={type.sub}>{note}</Text>)}
      <Button label="Mark as sent ›" onPress={() => router.push({ pathname: '/letters/sent', params: { id: letter.id } })} />
      <Button label="Edit my answers ›" onPress={() => router.push({ pathname: '/letters/[kind]', params: { kind: letter.kind, id: letter.id } })} />
    </> : <Text style={type.sub}>{message}</Text>}
  </Screen>;
}
