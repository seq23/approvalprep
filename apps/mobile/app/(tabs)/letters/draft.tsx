import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { Button, Screen, Sheet } from '../../../src/ui';
import { type } from '../../../src/theme';
import { HONEST_LIMIT } from '../../../src/copy';
import { renderDispute } from '../../../src/letterQuestions';
import { savedLetters } from '../../../src/savedLetters';
import type { SavedLetter } from '../../../src/letterStorage';
export default function Draft() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [letter, setLetter] = useState<SavedLetter | null>(null);
  const [message, setMessage] = useState('Opening your letter…');
  useFocusEffect(useCallback(() => {
    let active = true;
    savedLetters().then(store => id ? store.get(id) : null).then(value => {
      if (!active) return;
      if (value?.kind === 'bureau-dispute') setLetter(value);
      else setMessage('This draft could not be found. Open Write a letter to start one.');
    }).catch(() => { if (active) setMessage('Your letter could not be loaded. Go back and try again.'); });
    return () => { active = false; };
  }, [id]));
  const rendered = letter ? renderDispute(letter.answers) : null;
  return <Screen route="/letters/draft" label="Your letter, first draft" title="Read it before you mail it">
    <Text style={type.sub}>{HONEST_LIMIT}</Text>
    {rendered && letter ? <>
      <Sheet><Text selectable style={type.body}>{rendered.text}</Text></Sheet>
      {rendered.blanks.length ? <Text style={type.sub}>Fill in the brackets before mailing: {rendered.blanks.join(', ')}.</Text> : null}
      <Button label="Mark as sent ›" onPress={() => router.push({ pathname: '/letters/sent', params: { id: letter.id } })} />
      <Button label="Edit my answers ›" onPress={() => router.push({ pathname: '/letters/bureau-dispute', params: { id: letter.id } })} />
    </> : <Text style={type.sub}>{message}</Text>}
  </Screen>;
}
