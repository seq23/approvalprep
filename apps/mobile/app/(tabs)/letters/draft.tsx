import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Text } from 'react-native';
import { Button, Hl, Row, Screen, Sheet } from '../../../src/ui';
import { type } from '../../../src/theme';
import { HONEST_LIMIT, REQUEST_LINE } from '../../../src/copy';
import { isCreditLetter } from '../../../src/letters';
import { CREDIT_KIT, offerTitle } from '../../../src/offers';
import { usePrices } from '../../../src/purchases/prices';
import { answerDue, showDate } from '../../../src/myLetters';
import { bureaus, disputeQuestions } from '../../../src/letterQuestions';
import { savedLetters } from '../../../src/savedLetters';
import type { SavedLetter } from '../../../src/letterStorage';
import { ALL_KIT_KINDS, hasTrackingKit, kitForKind, KIT_LOCKED_LINE, kitLetter, loadDeliveredKit, type KitKind, type KitLetter } from '../../../src/kitTemplates';
import { BEFORE_YOU_MAIL, disputedParts, letterHtml } from '../../../src/letterPdf';
import { saveOrPrintLetter } from '../../../src/letterExport';
import { renderSavedLetter } from '../../../src/allLetters';
import { answerRows, copyOf } from '../../../src/draftAnswers';
export default function Draft() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [letter, setLetter] = useState<SavedLetter | null>(null);
  const [message, setMessage] = useState('Opening your letter…');
  const [busy, setBusy] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [paid, setPaid] = useState<KitLetter | null>(null);
  const [tracking, setTracking] = useState(false);
  const prices = usePrices();
  useFocusEffect(useCallback(() => {
    let active = true;
    setLetter(null); setPaid(null); setExportMessage('');
    savedLetters().then(store => id ? store.get(id) : null).then(async value => {
      const template = value && ALL_KIT_KINDS.includes(value.kind as KitKind) ? kitLetter(await loadDeliveredKit(kitForKind(value.kind)), value.kind) : null;
      const kit = await hasTrackingKit().catch(() => false);
      if (!active) return;
      setPaid(template); setTracking(kit);
      if (value && (value.kind === 'bureau-dispute' || template)) setLetter(value);
      else if (value && ALL_KIT_KINDS.includes(value.kind as KitKind)) { setLetter(null); setMessage(kitForKind(value.kind) === 'credit-letter-kit' ? KIT_LOCKED_LINE : 'This letter is included in the Letter of Explanation Kit.'); }
      else setMessage('This draft could not be found. Open Write a letter to start one.');
    }).catch(() => { if (active) setMessage('Your letter could not be loaded. Go back and try again.'); });
    return () => { active = false; };
  }, [id]));
  // A mailed letter keeps the date it was mailed on (finding #6), so a reprint matches the copy she sent.
  const rendered = letter ? renderSavedLetter(letter, paid) : null;
  const output = async (action: 'save' | 'print') => {
    if (!rendered || !letter || busy) return;
    setBusy(true); setExportMessage('');
    try { await saveOrPrintLetter(letterHtml(rendered.text, letter.kind === 'bureau-dispute'), action); }
    catch (error) { setExportMessage(error instanceof Error ? error.message : 'Your PDF could not be opened. Please try again.'); }
    finally { setBusy(false); }
  };
  // A new draft from this one's answers, opened at once: for another bureau, or to change a mailed letter.
  async function copy(changes: Record<string, string>) {
    if (!letter || busy) return;
    setBusy(true); setExportMessage('');
    try {
      const next = copyOf(letter, changes);
      await (await savedLetters()).create(next);
      router.push({ pathname: '/letters/draft', params: { id: next.id } });
    } catch { setExportMessage('The copy could not be saved. Please try again.'); }
    finally { setBusy(false); }
  }
  const mailed = !!letter && letter.status !== 'draft';
  const dispute = letter?.kind === 'bureau-dispute';
  const questions = dispute ? disputeQuestions : paid?.questions ?? [];
  return <Screen route="/letters/draft" label={mailed ? 'Your letter' : 'Your letter, first draft'} title={mailed ? 'The letter you mailed' : 'Read it before you mail it'}>
    <Text style={type.sub}>{!letter || isCreditLetter(letter.kind) ? HONEST_LIMIT : REQUEST_LINE}</Text>
    {rendered && letter ? <>
      <Sheet><Text selectable style={type.body}>{disputedParts(rendered.text, dispute ? letter.answers.shows : '').map((part, index) => part.highlighted ? <Hl key={index}>{part.text}</Hl> : <Text key={index}>{part.text}</Text>)}</Text></Sheet>
      <Button primary label={busy ? 'Opening PDF…' : Platform.OS === 'web' ? 'Save as PDF or print ›' : 'Save or share PDF ›'} disabled={busy} onPress={() => void output('save')} />
      {Platform.OS !== 'web' ? <Button label="Print ›" disabled={busy} onPress={() => void output('print')} /> : <Text style={type.sub}>Choose Save as PDF in your browser’s print window, then share the saved file.</Text>}
      {exportMessage ? <Text accessibilityRole="alert" style={type.sub}>{exportMessage}</Text> : null}
      {rendered.blanks.length ? <Text style={type.sub}>{`Fill in the brackets before mailing: ${rendered.blanks.join(', ')}.`}</Text> : null}
      {paid?.honestLine ? <Text style={type.sub}>{paid.honestLine}</Text> : null}
      {(paid?.notes ?? []).map(note => <Text key={note} style={type.sub}>{note}</Text>)}
      {dispute && !mailed ? <Sheet>
        <Text style={type.subhead}>Before you mail it</Text>
        {(BEFORE_YOU_MAIL as string[]).map(line => <Text key={line} style={type.body}>• {line}</Text>)}
        <Text style={type.body}>If you mail it today, the bureau’s answer is due around {showDate(answerDue())}.</Text>
        <Text style={type.sub}>A bureau has 30 days from the day it gets your dispute. This date is a guide based on today, not a confirmed deadline.</Text>
      </Sheet> : null}
      <Button label={mailed ? 'Change sent details ›' : 'Mark as sent ›'} onPress={() => router.push({ pathname: '/letters/sent', params: { id: letter.id } })} />
      {tracking || mailed ? null : <Text style={type.sub}>Recording the day you mailed it is free. The day count and the day-30 reminder come with a kit ({offerTitle(CREDIT_KIT.name, prices[CREDIT_KIT.productId])}).</Text>}
      {dispute ? <>
        <Text style={type.sub}>Is the same error on another bureau’s report? Each bureau needs its own letter.</Text>
        {(bureaus as { id: string; name: string }[]).filter(b => b.id !== letter.answers.bureau).map(b => <Button key={b.id} label={`Make this letter for ${b.name} too ›`} disabled={busy} onPress={() => void copy({ bureau: b.id })} />)}
      </> : null}
      <Text style={type.section} accessibilityRole="header">Your answers</Text>
      {mailed ? <>
        <Text style={type.sub}>This letter is marked as sent, so it stays as you mailed it. To change it, make a copy.</Text>
        <Button label="Make a copy to change ›" disabled={busy} onPress={() => void copy({})} />
      </> : <>
        <Text style={type.sub}>Tap one to change it.</Text>
        {answerRows(questions, letter.answers).map((row, step) => <Row key={row.title} title={row.title} sub={row.sub} onPress={() => router.push({ pathname: '/letters/[kind]', params: { kind: letter.kind, id: letter.id, step: String(step), edit: '1' } })} />)}
      </>}
    </> : <Text style={type.sub}>{message}</Text>}
  </Screen>;
}
