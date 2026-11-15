import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { BottomSheet, Button, Row, Screen } from '../../../src/ui';
import { color, space, type } from '../../../src/theme';
import { savedLetters } from '../../../src/savedLetters';
import type { SavedLetter } from '../../../src/letterStorage';
import { hasTrackingKit } from '../../../src/kitTemplates';
import { dueDate, hasAnswerDate, myLetters, showDate } from '../../../src/myLetters';
import { unmarkSent } from '../../../src/sentLetter';
import { localReminders } from '../../../src/localReminders';
import { draftHref } from '../../../src/studioDrafts';
import { openFrom } from '../../../src/nav';
export default function Mine() {
  const [letters, setLetters] = useState<SavedLetter[]>([]);
  const [hasKit, setHasKit] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selected, setSelected] = useState<SavedLetter | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const close = useCallback(() => { setSelected(null); setConfirmDelete(false); setNote(''); }, []);
  // One letter at a time (finding #10): delete it, or take back a "Mark as sent" tapped by mistake.
  async function change(action: 'delete' | 'unsend') {
    if (!selected || busy) return;
    setBusy(true); setNote('');
    try {
      const store = await savedLetters();
      if (action === 'delete') await store.remove(selected.id);
      else await unmarkSent(selected, { update: store.update, reminders: localReminders });
      close(); await load();
    } catch { setNote(action === 'delete' ? 'The letter could not be deleted. Try again.' : 'The letter could not be changed. Try again.'); }
    finally { setBusy(false); }
  }
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
      <Row title={row.title} sub={row.sub} onPress={() => setSelected(row.letter)} />
    </View>) : null}
    {letters.some(letter => letter.status === 'sent') ? <Text style={type.sub}>Answer dates are reminders based on the mailing dates you entered, not a confirmed deadline.</Text> : null}
    <BottomSheet visible={!!selected} title={selected?.status === 'draft' ? 'Your draft' : 'Your saved letter'} onClose={close}>
      {selected ? <>
        {selected.status === 'draft' ? <Button primary label="Continue writing ›" onPress={() => { const letter = selected; close(); router.push(draftHref(letter, '/mine')); }} /> : <>
          <Text style={type.letter}>{`Date mailed: ${selected.sentDate ? showDate(new Date(`${selected.sentDate}T12:00:00`)) : 'Not entered'}`}</Text>
          {dueDate(selected) ? <><Text style={type.letter}>{`Answer date: ${showDate(dueDate(selected)!)}`}</Text><Text style={type.sub}>This is a reminder based on the date you entered.</Text></> : null}
          {selected.answerNote ? <Text style={type.body}>{`Answer recorded: ${selected.answerNote}`}</Text> : null}
          <Button label="Open my letter ›" onPress={() => { const letter = selected; close(); openFrom('/mine', '/letters/draft', { id: letter.id }); }} />
          {hasAnswerDate(selected.kind) ? <Button label="Record or change answer ›" onPress={() => { const letter = selected; close(); router.push({ pathname: '/mine/answer', params: { id: letter.id } }); }} /> : null}
          {selected.status === 'sent' ? <Button label="Not sent yet" disabled={busy} onPress={() => void change('unsend')} /> : null}
        </>}
        {confirmDelete ? <>
          <Text style={type.body}>Delete this letter and its details from this phone? This cannot be undone.</Text>
          <Button label="Yes, delete it" disabled={busy} onPress={() => void change('delete')} />
          <Button label="Keep it" disabled={busy} onPress={() => setConfirmDelete(false)} />
        </> : <Button label="Delete this letter" disabled={busy} onPress={() => setConfirmDelete(true)} />}
        {note ? <Text accessibilityRole="alert" style={type.sub}>{note}</Text> : null}
      </> : null}
    </BottomSheet>
  </Screen>;
}
