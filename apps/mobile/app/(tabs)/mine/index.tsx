import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { BottomSheet, Button, Row, Screen } from '../../../src/ui';
import { color, space, type } from '../../../src/theme';
import { savedLetters } from '../../../src/savedLetters';
import type { SavedLetter } from '../../../src/letterStorage';
import { hasTrackingKit } from '../../../src/kitTemplates';
import { dueDate, myLetters, showDate } from '../../../src/myLetters';
export default function Mine() {
  const [letters, setLetters] = useState<SavedLetter[]>([]);
  const [hasKit, setHasKit] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selected, setSelected] = useState<SavedLetter | null>(null);
  const load = useCallback(async () => {
    setState('loading');
    try {
      const [saved, kit] = await Promise.all([savedLetters().then(store => store.list()), hasTrackingKit()]);
      setLetters(saved); setHasKit(!!kit); setState('ready');
    } catch { setState('error'); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const model = myLetters(letters, hasKit);
  return <Screen route="/mine" label="My letters" title={state === 'ready' ? model.summary : 'My letters'}>
    <Button label="+ Write a letter ›" onPress={() => router.push('/letters')} />
    {state === 'loading' ? <Text style={type.sub}>Opening your letters…</Text> : null}
    {state === 'error' ? <><Text style={type.sub}>Your letters could not be loaded.</Text><Button label="Try again ›" onPress={() => void load()} /></> : null}
    {state === 'ready' && !letters.length ? <Text style={type.body}>No saved letters yet. Start a letter and your draft will appear here.</Text> : null}
    {state === 'ready' ? model.rows.map(row => <View key={row.letter.id} style={row.needsAnswer ? { backgroundColor: color.highlighter, paddingHorizontal: space[2] } : undefined}>
      <Row title={row.title} sub={row.sub} onPress={() => {
        if (row.letter.status === 'draft') router.push({ pathname: '/letters/[kind]', params: { kind: row.letter.kind, id: row.letter.id } });
        else setSelected(row.letter);
      }} />
    </View>) : null}
    {letters.some(letter => letter.status === 'sent') ? <Text style={type.sub}>Answer dates are reminders based on the mailing dates you entered, not a confirmed deadline.</Text> : null}
    <BottomSheet visible={!!selected} title="Your saved letter" onClose={() => setSelected(null)}>
      {selected ? <>
        <Text style={type.body}>Date mailed: {selected.sentDate || 'Not entered'}</Text>
        {dueDate(selected) ? <Text style={type.body}>Answer date: {showDate(dueDate(selected)!)}</Text> : null}
        <Text style={type.sub}>This is a reminder based on the date you entered.</Text>
        {selected.answerNote ? <Text style={type.body}>Answer recorded: {selected.answerNote}</Text> : null}
        <Button label="Open my letter ›" onPress={() => { setSelected(null); router.push({ pathname: '/letters/draft', params: { id: selected.id } }); }} />
        <Button label="Record or change answer ›" onPress={() => { setSelected(null); router.push({ pathname: '/mine/answer', params: { id: selected.id } }); }} />
      </> : null}
    </BottomSheet>
  </Screen>;
}
