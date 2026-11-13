import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Text } from 'react-native';
import { Button, Hl, Screen, Sheet } from '../../../src/ui';
import { type } from '../../../src/theme';
import { HONEST_LIMIT, REQUEST_LINE } from '../../../src/copy';
import { isCreditLetter } from '../../../src/letters';
import { CREDIT_KIT, offerTitle } from '../../../src/offers';
import { usePrices } from '../../../src/purchases/prices';
import { answerDue, showDate } from '../../../src/myLetters';
import { renderDispute } from '../../../src/letterQuestions';
import { savedLetters } from '../../../src/savedLetters';
import type { SavedLetter } from '../../../src/letterStorage';
import { ALL_KIT_KINDS, hasTrackingKit, kitForKind, KIT_LOCKED_LINE, kitLetter, loadDeliveredKit, renderKitLetter, type KitKind, type KitLetter } from '../../../src/kitTemplates';
import { BEFORE_YOU_MAIL, disputedParts, letterHtml } from '../../../src/letterPdf';
import { saveOrPrintLetter } from '../../../src/letterExport';
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
  const rendered = !letter ? null : letter.kind === 'bureau-dispute' ? renderDispute(letter.answers) : paid && paid.kind === letter.kind ? renderKitLetter(paid, letter.answers) : null;
  const output = async (action: 'save' | 'print') => {
    if (!rendered || !letter || busy) return;
    setBusy(true); setExportMessage('');
    try { await saveOrPrintLetter(letterHtml(rendered.text, letter.kind === 'bureau-dispute'), action); }
    catch (error) { setExportMessage(error instanceof Error ? error.message : 'Your PDF could not be opened. Please try again.'); }
    finally { setBusy(false); }
  };
  // A letter already mailed is not a "first draft" any more.
  const mailed = !!letter && letter.status !== 'draft';
  const dispute = letter?.kind === 'bureau-dispute';
  return <Screen route="/letters/draft" label={mailed ? 'Your letter' : 'Your letter, first draft'} title={mailed ? 'The letter you mailed' : 'Read it before you mail it'}>
    <Text style={type.sub}>{!letter || isCreditLetter(letter.kind) ? HONEST_LIMIT : REQUEST_LINE}</Text>
    {rendered && letter ? <>
      <Sheet><Text selectable style={type.body}>{disputedParts(rendered.text, letter.kind === 'bureau-dispute' ? letter.answers.shows : '').map((part, index) => part.highlighted ? <Hl key={index}>{part.text}</Hl> : <Text key={index}>{part.text}</Text>)}</Text></Sheet>
      <Button primary label={busy ? 'Opening PDF…' : Platform.OS === 'web' ? 'Save as PDF or print ›' : 'Save or share PDF ›'} disabled={busy} onPress={() => void output('save')} />
      {Platform.OS !== 'web' ? <Button label="Print ›" disabled={busy} onPress={() => void output('print')} /> : <Text style={type.sub}>Choose Save as PDF in your browser’s print window, then share the saved file.</Text>}
      {exportMessage ? <Text accessibilityRole="alert" style={type.sub}>{exportMessage}</Text> : null}
      {rendered.blanks.length ? <Text style={type.sub}>{`Fill in the brackets before mailing: ${rendered.blanks.join(', ')}.`}</Text> : null}
      {paid?.honestLine ? <Text style={type.sub}>{paid.honestLine}</Text> : null}
      {(paid?.notes ?? []).map(note => <Text key={note} style={type.sub}>{note}</Text>)}
      {dispute && !mailed ? <Sheet>
        <Text style={type.subhead}>Before you mail it</Text>
        {(BEFORE_YOU_MAIL as string[]).map(line => <Text key={line} style={type.body}>○ {line}</Text>)}
        <Text style={type.body}>If you mail it today, the bureau’s answer is due around {showDate(answerDue())}.</Text>
        <Text style={type.sub}>A bureau has 30 days from the day it gets your dispute. This date is a guide based on today, not a confirmed deadline.</Text>
      </Sheet> : null}
      <Button label={mailed ? 'Change sent details ›' : 'Mark as sent ›'} onPress={() => router.push({ pathname: '/letters/sent', params: { id: letter.id } })} />
      {tracking || mailed ? null : <Text style={type.sub}>Marking as sent, the day count and the day-30 reminder come with a kit ({offerTitle(CREDIT_KIT.name, prices[CREDIT_KIT.productId])}). The letter and its PDF are free.</Text>}
      <Button label="Edit my answers ›" onPress={() => router.push({ pathname: '/letters/[kind]', params: { kind: letter.kind, id: letter.id } })} />
    </> : <Text style={type.sub}>{message}</Text>}
  </Screen>;
}
