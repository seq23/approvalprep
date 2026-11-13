import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { Button, Row, Screen, Sheet } from '../../../src/ui';
import { type } from '../../../src/theme';
import { savedLetters } from '../../../src/savedLetters';
import { hasTrackingKit } from '../../../src/kitTemplates';
import type { SavedLetter } from '../../../src/letterStorage';
import { dueDate, showDate } from '../../../src/myLetters';
import { ANSWER_CHOICES, answerOffer, saveBureauAnswer, type BureauAnswer } from '../../../src/answerLetter';
import { localReminders } from '../../../src/localReminders';
import { KIT_SALES_ENABLED } from '../../../src/kit';
import { MailingDateField } from '../../../src/MailingDateField';
import { dateInput } from '../../../src/sentLetter';
// APP_PLAN pattern (i): one question, three equal choices, guidance stays on the item.
export default function Answer() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [letter, setLetter] = useState<SavedLetter | null>(null);
  const [choice, setChoice] = useState<BureauAnswer | null>(null);
  const [arrived, setArrived] = useState('');
  const [hasKit, setHasKit] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setState('loading');
    const timer = setTimeout(() => { if (active) { active = false; setState('error'); } }, 8000);
    Promise.all([savedLetters().then(store => id ? store.get(id) : null), hasTrackingKit()]).then(([value, kit]) => {
      if (!active) return;
      if (!value || value.status === 'draft') { setState('error'); return; }
      setLetter(value); setHasKit(kit); setChoice(ANSWER_CHOICES.find(row => row.value === value.answerNote)?.value ?? null);
      setArrived(value.answers.answerArrivedOn || ''); setState('ready');
    }).catch(() => { if (active) setState('error'); }).finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); };
  }, [id, retry]));
  async function save() {
    if (!letter || !choice || busy) return;
    setBusy(true); setError('');
    try {
      await saveBureauAnswer(letter, choice, arrived, { update: (await savedLetters()).update, reminders: localReminders });
      router.replace('/mine');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Your answer could not be saved. Try again.'); }
    finally { setBusy(false); }
  }
  const due = letter && dueDate(letter);
  return <Screen route="/mine/answer" label="Your saved letter" title={letter ? [letter.answers.bureau, letter.answers.account || 'Your letter'].filter(Boolean).join(' · ') : 'What did they answer?'}>
    {state === 'loading' ? <Text style={type.sub}>Opening your letter…</Text> : null}
    {state === 'error' ? <><Text style={type.body}>Your mailed letter could not be opened.</Text><Button label="Try again ›" onPress={() => setRetry(value => value + 1)} /><Button label="My letters ›" onPress={() => router.replace('/mine')} /></> : null}
    {state === 'ready' && letter ? <>
      <Text style={type.body}>Mailed on {showDate(new Date(`${letter.sentDate}T12:00:00`))}.{due ? ` Day 30 ${due > new Date() ? 'is' : 'was'} ${showDate(due)}.` : ''}</Text>
      <Text style={type.sub}>These dates come from what you entered.</Text>
      {letter.answerNote ? <Text style={type.sub}>Saved answer: {letter.answerNote}. Change answer below.</Text> : null}
      <Text style={type.section}>What did they answer?</Text>
      {ANSWER_CHOICES.map(row => <Row key={row.value} title={row.label} selected={choice === row.value} onPress={() => { if (!busy) setChoice(row.value); }} />)}
      {choice && choice !== 'No answer' ? <>
        {arrived ? <><MailingDateField value={arrived} onChange={setArrived} disabled={busy} label="Answer arrived on (optional)" /><Button label="Clear answer date" disabled={busy} onPress={() => setArrived('')} /></> : <Button label="Add answer date (optional)" disabled={busy} onPress={() => setArrived(dateInput())} />}
      </> : null}
      {ANSWER_CHOICES.find(row => row.value === choice)?.guidance.map((line: string) => <Text key={line} style={type.body}>{line}</Text>)}
      {choice ? <Text style={type.sub}>Saving this answer switches off this letter’s reminder.{choice === 'No answer' ? ' Your answer date stays on the letter.' : ''}</Text> : null}
      <Button primary label={busy ? 'Saving…' : 'Save answer'} disabled={!choice || busy} onPress={() => void save()} />
      {error ? <Text accessibilityRole="alert" style={type.sub}>{error}</Text> : null}
      {answerOffer(hasKit, KIT_SALES_ENABLED) ? <Sheet><Text style={type.body}>The Credit Letter Kit adds templates you fill in and send yourself, paid once.</Text><Button label="See the Credit Letter Kit ›" onPress={() => router.push('/letters/unlock')} /></Sheet> : null}
    </> : null}
  </Screen>;
}
