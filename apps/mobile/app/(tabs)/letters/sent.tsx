import { storageDeadline } from '../../../src/phoneDatabase';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Switch, Text, View } from 'react-native';
import { Button, Field, Row, Screen, Sheet } from '../../../src/ui';
import { type, space } from '../../../src/theme';
import { savedLetters } from '../../../src/savedLetters';
import { loadDeliveredKit } from '../../../src/kitTemplates';
import type { SavedLetter } from '../../../src/letterStorage';
import { dateInput, MAIL_METHODS, markSent, reminderDate, type MailMethod } from '../../../src/sentLetter';
import { MailingDateField } from '../../../src/MailingDateField';
import { localReminders } from '../../../src/localReminders';
import { showDate } from '../../../src/myLetters';
import { CREDIT_KIT, offerTitle } from '../../../src/offers';
import { usePrices } from '../../../src/purchases/prices';
// Dated-letter detail structure from APP_PLAN screen pattern (h); the person records mailing.
export default function Sent() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [letter, setLetter] = useState<SavedLetter | null>(null);
  const [owned, setOwned] = useState(false);
  const [ready, setReady] = useState(false);
  const [date, setDate] = useState(dateInput());
  const [method, setMethod] = useState<MailMethod>('Certified mail');
  const [choosing, setChoosing] = useState(false);
  const [tracking, setTracking] = useState('');
  const [remind, setRemind] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const prices = usePrices();
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoadError(false); setReady(false); setMessage('');
    storageDeadline(Promise.all([savedLetters().then(store => id ? store.get(id) : null), loadDeliveredKit(undefined, true)])).then(([value, kit]) => {
      if (!active) return;
      setLetter(value); setOwned(!!kit); setReady(true);
      if (value) {
        setDate(value.sentDate || dateInput()); setTracking(value.trackingNumber || '');
        setMethod(MAIL_METHODS.includes(value.method as MailMethod) ? value.method as MailMethod : 'Certified mail');
        setRemind(!!value.reminderDate);
      }
    }).catch(() => { if (active) { setLoadError(true); setReady(true); setLetter(null); setMessage('Your letter could not be loaded. Go back and try again.'); } });
    return () => { active = false; };
  }, [id, attempt]));
  let due = '';
  try { due = showDate(reminderDate(date)); } catch {}
  async function save() {
    if (!letter || busy) return;
    setBusy(true); setMessage('');
    try {
      const result = await markSent(letter, { date, method, tracking, remind }, {
        ownsKit: async () => !!await loadDeliveredKit(), update: (await savedLetters()).update, reminders: localReminders,
      });
      setLetter(result.letter);
      setMessage(result.reminder === 'scheduled' ? 'Saved as sent. Your reminder is set for the answer date.'
        : result.reminder === 'denied' ? 'Saved as sent without a reminder. Notifications are not allowed; you can enable them in phone settings and save again.'
        : result.reminder === 'past' ? 'Saved as sent. That reminder date has passed, so no notification was set.' : 'Saved as sent without a reminder.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save. Please try again.'); }
    finally { setBusy(false); }
  }
  return <Screen route="/letters/sent" label="Mark as sent" title="When did you send it?">
    {loadError ? <>
      <Text accessibilityRole="alert" style={type.sub}>{message}</Text>
      <Button label="Try again" onPress={() => setAttempt(value => value + 1)} />
      <Button label="My letters ›" onPress={() => router.replace('/mine')} />
    </> : !ready ? <Text style={type.sub}>Opening your letter…</Text> : !owned ? <>
      <Text style={type.body}>Marking as sent, the day count and the day-30 reminder come with a kit ({offerTitle(CREDIT_KIT.name, prices[CREDIT_KIT.productId])}). Your letter and its PDF stay free.</Text>
      <Button label={`See the ${CREDIT_KIT.name} ›`} onPress={() => router.push('/letters/unlock')} />
    </> : !letter ? <Text style={type.sub}>{message || 'Open a saved letter before recording when you mailed it.'}</Text>
      : letter.status === 'answered' ? <Text style={type.body}>This letter already has an answer recorded.</Text> : <>
        <Text style={type.body}>Save this after you mail the letter yourself.</Text>
        <MailingDateField value={date} onChange={setDate} disabled={busy} />
        <Button label={`How it was sent: ${method} ▾`} disabled={busy} onPress={() => setChoosing(!choosing)} />
        {choosing ? <Sheet>{MAIL_METHODS.map(value => <Row key={value} title={value} selected={method === value} onPress={() => { setMethod(value); setChoosing(false); }} />)}</Sheet> : null}
        <Field label="Tracking number (optional)" value={tracking} onChangeText={setTracking} />
        {due ? <Text style={type.body}>{`Answer date: ${due}`}</Text> : null}
        <Text style={type.sub}>This is a reminder based on the mailing date you enter, not a confirmed deadline.</Text>
        {Platform.OS === 'web' ? <Text style={type.sub}>Local notifications need the phone app. This preview saves your sent details without a notification.</Text> : <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <Text style={[type.body, { flex: 1 }]}>Remind me on day 30</Text>
          <Switch accessibilityLabel="Remind me on day 30" disabled={busy} value={remind} onValueChange={setRemind} />
        </View>}
        <Button primary label={busy ? 'Saving…' : 'Save sent details ›'} disabled={busy} onPress={() => void save()} />
        {message ? <Text accessibilityRole="alert" style={type.sub}>{message}</Text> : null}
        <Button label="My letters ›" disabled={busy} onPress={() => router.push('/mine')} />
      </>}
  </Screen>;
}
